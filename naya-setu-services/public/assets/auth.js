/* Naya Setu Services — auth screen: Firebase phone-OTP + classic password fallback. */
(function () {
  var firebaseApp = null;
  var recaptchaVerifiers = {};
  var confirmationResults = {};
  var registerState = { idToken: null, verified: false, skip: false };

  function ensureFirebase() {
    if (firebaseApp) return firebaseApp;
    if (
      !window.firebase ||
      !NSS_AUTH ||
      !NSS_AUTH.firebase ||
      !NSS_AUTH.firebase.apiKey
    ) {
      throw new Error("Firebase is not configured.");
    }
    firebaseApp = firebase.initializeApp(NSS_AUTH.firebase);
    return firebaseApp;
  }

  function recaptcha(context) {
    ensureFirebase();
    if (recaptchaVerifiers[context]) return recaptchaVerifiers[context];
    var containerId =
      "login" === context ? "nss-login-recaptcha" : "nss-reg-recaptcha";
    recaptchaVerifiers[context] = new firebase.auth.RecaptchaVerifier(
      containerId,
      { size: "invisible" },
    );
    return recaptchaVerifiers[context];
  }

  function toE164(raw) {
    var digits = String(raw || "")
      .replace(/\D/g, "")
      .slice(-10);
    return digits.length === 10 ? "+91" + digits : "";
  }

  function setMsg(context, text, kind) {
    var el = document.getElementById("nss-" + context + "-msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "nss-auth-msg" + (kind ? " " + kind : "");
  }

  function setBtn(btn, busy, label) {
    if (!btn) return;
    btn.disabled = !!busy;
    if (label) btn.textContent = label;
  }

  var resendTimers = {};
  function startResendCountdown(context, btn, seconds) {
    if (!btn) return;
    if (resendTimers[context]) clearInterval(resendTimers[context]);
    var remaining = seconds;
    btn.disabled = true;
    btn.textContent = "Resend OTP in " + remaining + "s";
    resendTimers[context] = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(resendTimers[context]);
        delete resendTimers[context];
        btn.disabled = false;
        btn.textContent = "Resend OTP";
        return;
      }
      btn.textContent = "Resend OTP in " + remaining + "s";
    }, 1000);
  }

  var expiryTimers = {};
  function startOtpExpiryCountdown(context) {
    var el = document.getElementById("nss-" + context + "-otp-expiry");
    if (!el) return;
    if (expiryTimers[context]) clearInterval(expiryTimers[context]);
    var remaining = 300; // 5 minutes, matches the message shown when the OTP is sent
    function paint() {
      var m = Math.floor(remaining / 60);
      var s = String(remaining % 60).padStart(2, "0");
      el.textContent =
        remaining > 0
          ? "Code expires in " + m + ":" + s
          : "Code expired — tap Resend OTP to get a new one.";
      el.style.color = remaining > 0 ? "" : "#dc2626";
    }
    paint();
    expiryTimers[context] = setInterval(function () {
      remaining--;
      if (remaining <= 0) {
        clearInterval(expiryTimers[context]);
        delete expiryTimers[context];
        paint();
        return;
      }
      paint();
    }, 1000);
  }

  window.nssLoginMethod = function (method) {
    document
      .querySelectorAll("#nss-login-form .nss-auth-pill")
      .forEach(function (p) {
        p.classList.toggle("active", p.dataset.method === method);
      });
    document.getElementById("nss-login-password-wrap").style.display =
      "password" === method ? "block" : "none";
    document.getElementById("nss-login-otp-wrap").style.display =
      "otp" === method ? "block" : "none";
    document.getElementById("nss-login-password").required =
      "password" === method;
    var identity = document.getElementById("nss-login-identity");
    identity.placeholder =
      "otp" === method
        ? "Enter your 10-digit mobile number"
        : "Enter your email or mobile";
  };

  window.nssRegRoleChange = function () {
    var isAssociate =
      "associate" === document.getElementById("nss-reg-role").value;
    document.getElementById("nss-reg-associate-wrap").style.display =
      isAssociate ? "block" : "none";
    document.getElementById("nss-reg-referral-wrap").style.display = isAssociate
      ? "none"
      : "block";
    document.querySelector("#nss-reg-associate-wrap input").required =
      isAssociate;
  };

  window.nssSendOtp = function (context) {
    var btn = document.getElementById("nss-" + context + "-send-otp");
    try {
      var mobileEl =
        "login" === context
          ? document.getElementById("nss-login-identity")
          : document.getElementById("nss-reg-mobile");
      if (!mobileEl)
        throw new Error(
          "Could not find the mobile number field (nss-" +
            ("login" === context ? "login-identity" : "reg-mobile") +
            ").",
        );
      var phone = toE164(mobileEl.value);
      if (!phone) {
        setMsg(context, "Enter a valid 10-digit mobile number first.", "err");
        return;
      }

      setBtn(btn, true, "Sending…");
      setMsg(context, "");

      var appliedVerifier = recaptcha(context);
      firebase
        .auth()
        .signInWithPhoneNumber(phone, appliedVerifier)
        .then(function (result) {
          confirmationResults[context] = result;
          document.getElementById(
            "nss-" + context + "-otp-code-wrap",
          ).style.display = "block";
          setMsg(
            context,
            "We've sent a 6-digit code to your phone number " +
              phone +
              ". It expires in 5 minutes.",
            "ok",
          );
          startResendCountdown(context, btn, 30);
          startOtpExpiryCountdown(context);
          if ("login" === context) {
            document.getElementById("nss-login-otp-code").focus();
          } else {
            document.getElementById("nss-reg-otp-code").focus();
          }
        })
        .catch(function (err) {
          console.error("nssSendOtp: signInWithPhoneNumber failed", err);
          setBtn(btn, false, "Send OTP");
          setMsg(context, firebaseErrorMessage(err), "err");
          // A rejected/expired recaptcha can't be reused — drop it so the next click builds a fresh one.
          if (recaptchaVerifiers[context]) {
            try {
              recaptchaVerifiers[context].clear();
            } catch (e2) {
              /* noop */
            }
            delete recaptchaVerifiers[context];
          }
        });
    } catch (e) {
      console.error("nssSendOtp: setup failed", e);
      if (btn) setBtn(btn, false, "Send OTP");
      setMsg(
        context,
        e.message || "Could not start OTP verification. Please try again.",
        "err",
      );
    }
  };

  function firebaseErrorMessage(err) {
    var map = {
      "auth/operation-not-allowed":
        "Phone sign-in is not enabled for this Firebase project yet (Firebase Console → Authentication → Sign-in method → Phone → Enable).",
      "auth/configuration-not-found":
        "Phone sign-in isn't set up for this Firebase project yet. In Firebase Console → Authentication, click \"Get started\" if you haven't, then enable the Phone sign-in provider under Sign-in method.",
      "auth/invalid-phone-number":
        "That does not look like a valid 10-digit Indian mobile number.",
      "auth/too-many-requests":
        "Too many attempts — please wait a bit and try again.",
      "auth/unauthorized-domain":
        "This domain is not authorized in Firebase Console → Authentication → Settings → Authorized domains.",
      "auth/captcha-check-failed": "The reCAPTCHA check failed. Please retry.",
      "auth/internal-error-encountered":
        "Firebase had an internal error — please try again in a moment.",
    };
    return (
      (err && err.code && map[err.code]) ||
      (err && err.message) ||
      "Could not send OTP. Please try again."
    );
  }

  function confirmCode(context, code) {
    var result = confirmationResults[context];
    if (!result)
      return Promise.reject(new Error("Please request an OTP first."));
    return result.confirm(code).then(function (cred) {
      return cred.user.getIdToken();
    });
  }

  window.nssVerifyOtp = function (context) {
    var code = document
      .getElementById("nss-" + context + "-otp-code")
      .value.trim();
    if (6 !== code.length) {
      setMsg(context, "Enter the 6-digit code.", "err");
      return;
    }
    setMsg(context, "Verifying…");
    confirmCode(context, code)
      .then(function (idToken) {
        registerState.idToken = idToken;
        registerState.verified = true;
        setMsg(context, "Mobile number verified.", "ok");
      })
      .catch(function (err) {
        setMsg(
          context,
          err.message || "Invalid code. Please try again.",
          "err",
        );
      });
  };

  window.nssSkipOtp = function () {
    registerState.skip = true;
    setMsg(
      "register",
      "Skipping phone verification — signing up with password only.",
      "ok",
    );
    document.getElementById("nss-register-form").submit();
  };

  function api(path, body) {
    return fetch(NSS_AUTH.root + path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": NSS_AUTH.nonce,
      },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) throw new Error(json.message || "Something went wrong.");
        return json;
      });
    });
  }

  document
    .getElementById("nss-login-form")
    .addEventListener("submit", function (e) {
      var isOtp =
        document.getElementById("nss-login-otp-wrap").style.display !== "none";
      if (!isOtp) return; // classic password POST — let the server handle it.
      e.preventDefault();

      var code = document.getElementById("nss-login-otp-code").value.trim();
      if (6 !== code.length) {
        setMsg("login", "Enter the 6-digit code sent to your mobile.", "err");
        return;
      }

      var btn = document.getElementById("nss-login-submit");
      setBtn(btn, true, "Logging in…");
      confirmCode("login", code)
        .then(function (idToken) {
          return api("/auth/firebase-login", {
            id_token: idToken,
            expected_role: document.getElementById("nss-login-role").value,
          });
        })
        .then(function (res) {
          window.location.href = res.redirect || NSS_AUTH.home;
        })
        .catch(function (err) {
          setBtn(btn, false, "Login");
          setMsg("login", err.message || "Login failed.", "err");
        });
    });

  document
    .getElementById("nss-register-form")
    .addEventListener("submit", function (e) {
      var pw = document.getElementById("nss-reg-password").value;
      var pw2 = document.getElementById("nss-reg-password-confirm").value;
      if (pw !== pw2) {
        e.preventDefault();
        setMsg("register", "Passwords do not match.", "err");
        return;
      }
      if (!document.getElementById("nss-reg-terms").checked) {
        e.preventDefault();
        setMsg("register", "Please accept the Terms & Conditions.", "err");
        return;
      }
      if (registerState.skip) return; // classic password-only POST — let the server handle it.
      if (!registerState.verified || !registerState.idToken) {
        e.preventDefault();
        setMsg(
          "register",
          'Please verify your mobile number via OTP, or use "Skip phone verification" below.',
          "err",
        );
        return;
      }
      e.preventDefault();

      var form = document.getElementById("nss-register-form");
      var btn = document.getElementById("nss-register-submit");
      setBtn(btn, true, "Creating account…");
      api("/auth/firebase-register", {
        id_token: registerState.idToken,
        name: form.name.value,
        email: form.email.value,
        password: pw,
        role: form.role.value,
        associate_code: form.associate_code ? form.associate_code.value : "",
        referral_code: form.referral_code ? form.referral_code.value : "",
      })
        .then(function (res) {
          if (res.pending) {
            window.location.href = NSS_AUTH.home + "?nss_pending=1";
          } else {
            window.location.href = res.redirect || NSS_AUTH.home;
          }
        })
        .catch(function (err) {
          setBtn(btn, false, "Sign Up");
          setMsg("register", err.message || "Sign up failed.", "err");
        });
    });
})();
