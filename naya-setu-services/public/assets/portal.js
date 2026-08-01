/* Naya Setu Services — customer + in-dashboard admin portal SPA (vanilla JS, no build step). */

var content = document.getElementById("nss-content");
var titleEl = document.getElementById("nss-topbar-title");

// --------------------------------------------------------------- utils
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
function money(n) {
  n = parseFloat(n) || 0;
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function toast(msg, type) {
  var box = document.getElementById("nss-toast");
  if (!box) return;
  var t = document.createElement("div");
  t.className =
    "nss-toast " +
    (type === "err" ? "nss-toast-err" : type === "ok" ? "nss-toast-ok" : "");
  t.innerHTML =
    icon("err" === type ? "x-circle" : "check-circle") + "<span></span>";
  t.querySelector("span").textContent = msg;
  box.appendChild(t);
  setTimeout(function () {
    t.classList.add("nss-toast-out");
    setTimeout(function () {
      t.remove();
    }, 220);
  }, 3800);
}
window.addEventListener("unhandledrejection", function (e) {
  toast((e.reason && e.reason.message) || "Something went wrong.", "err");
});
window.addEventListener("error", function (e) {
  if (e.error) toast(e.message || "Something went wrong.", "err");
});
function api(path, method, body) {
  var opts = {
    method: method || "GET",
    headers: { "X-WP-Nonce": NSS.nonce },
    credentials: "same-origin",
  };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  return fetch(NSS.root + path, opts).then(function (res) {
    return res.text().then(function (text) {
      var json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        var match = text.match(/<b>([^<]+)<\/b>:\s*([^<]+)/);
        var hint = match
          ? match[1] + ": " + match[2].trim()
          : "Server returned an invalid response.";
        throw new Error("Server error — " + hint + " (check PHP error log)");
      }
      if (!json.ok) throw new Error(json.message || "Something went wrong.");
      return json;
    });
  });
}
function restFileUrl(path) {
  return (
    NSS.root +
    path +
    (path.indexOf("?") === -1 ? "?" : "&") +
    "_wpnonce=" +
    encodeURIComponent(NSS.nonce)
  );
}
function setTitle(t) {
  titleEl.textContent = t;
}
function setActiveNav(route) {
  document.querySelectorAll("#nss-nav a[data-route]").forEach(function (a) {
    a.classList.toggle("active", a.dataset.route === route);
  });
}
function showLoading() {
  content.innerHTML =
    '<div class="nss-loading"><div class="nss-spinner"></div>Loading…</div>';
}
function errorBox(e) {
  return (
    '<div class="nss-card nss-panel"><p class="nss-error-text">' +
    esc(e.message) +
    "</p></div>"
  );
}
function emptyState(iconName, title, sub) {
  return (
    '<div class="nss-empty-state">' +
    icon(iconName, "nss-icon-lg") +
    "<strong>" +
    esc(title) +
    "</strong>" +
    (sub ? "<div>" + esc(sub) + "</div>" : "") +
    "</div>"
  );
}
function formToObject(form) {
  var data = {};
  new FormData(form).forEach(function (v, k) {
    data[k] = v;
  });
  return data;
}
function fmtDate(s) {
  if (!s || "0000-00-00 00:00:00" === s) return "—";
  var d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(s) {
  if (!s || "0000-00-00 00:00:00" === s) return "—";
  var d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

var STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  in_progress: "In Progress",
  pending_user: "Pending From You",
  completed: "Completed",
  rejected: "Rejected",
};
function statusPill(status) {
  return (
    '<span class="nss-status-pill nss-status-' +
    esc(status) +
    '">' +
    esc(STATUS_LABELS[status] || status) +
    "</span>"
  );
}
var DOC_TYPE_LABELS = {
  photo: "Photo",
  signature: "Signature",
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  samagra: "Samagra ID Card",
  passport: "Passport",
  dl: "Driving Licence",
  gst: "GST Certificate",
  cheque: "Cancelled Cheque",
  other: "Other Document",
};

/** Thumbnail of an uploaded document — actual image preview for images, a PDF tile otherwise. */
function docPreviewHtml(d) {
  var url = restFileUrl("/documents/" + d.id + "/file");
  if ((d.mime || "").indexOf("image/") === 0) {
    return (
      '<img class="nss-doc-thumb" src="' +
      url +
      '" alt="' +
      esc(d.file_name || "") +
      '" loading="lazy"/>'
    );
  }
  return (
    '<div class="nss-doc-thumb nss-doc-thumb--pdf">' +
    icon("file-text", "nss-icon-lg") +
    "<span>PDF</span></div>"
  );
}

// --------------------------------------------------------------- icons
var ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  "id-card":
    '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="12" r="2"/><path d="M5 17c.5-1.7 1.8-2.5 3.5-2.5S11.5 15.3 12 17"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="13.5" x2="19" y2="13.5"/>',
  briefcase:
    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  bank: '<line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="10" y1="21" x2="10" y2="10"/><line x1="14" y1="21" x2="14" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 3 21 8 3 8"/>',
  car: '<path d="M5 17h14"/><path d="M3 17V11l2-5h14l2 5v6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  scale:
    '<line x1="12" y1="3" x2="12" y2="21"/><path d="M5 8l-3 6a3.5 3.5 0 0 0 6 0z"/><path d="M19 8l-3 6a3.5 3.5 0 0 0 6 0z"/><path d="M4 8h16"/><path d="M9 21h6"/>',
  package:
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  landmark:
    '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 21 8 3 8"/>',
  laptop:
    '<rect x="3" y="4" width="18" height="12" rx="1"/><line x1="2" y1="20" x2="22" y2="20"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><path d="M9 20v-6h6v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "file-text":
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  folder:
    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  "shield-check":
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  receipt:
    '<path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-3 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/>',
  wallet:
    '<path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/><circle cx="17" cy="14" r="1.4"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search:
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  "chevron-right": '<polyline points="9 18 15 12 9 6"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  "arrow-left":
    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  "check-circle":
    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  "x-circle":
    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  "credit-card":
    '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  chart:
    '<line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/>',
  fingerprint:
    '<path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4.5-1.5 6"/><path d="M15 14c0 3-.4 5.2-1 7"/><path d="M17.6 18.7c.3-1.5.4-3.1.4-4.7a6 6 0 0 0-9-5.2"/><path d="M5.4 12.6A6 6 0 0 0 6 14c0 1.5-.2 3-.6 4.3"/><path d="M3.3 8.6A9 9 0 0 1 21 12c0 1 0 2-.2 3"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  heart:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  rupee:
    '<path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 13l8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.7 0 6.7-10 0-10"/>',
  tag: '<path d="M20.59 13.41 11 3.83a2 2 0 0 0-1.42-.58H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .58 1.41l9.59 9.59a2 2 0 0 0 2.83 0l6.59-6.59a2 2 0 0 0 0-2.82z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  truck:
    '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  award:
    '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
  "check-square":
    '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  store:
    '<path d="M3 9l1-5h16l1 5"/><path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M9 21v-6h6v6"/>',
  percent:
    '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  "map-pin":
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  graduation:
    '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  trash:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  "trending-up":
    '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
};

/**
 * Per-service icon rules — first regex that matches a service_key wins, so
 * every sub-service gets its own meaningful icon (like Banking & Finance)
 * instead of repeating the category icon on every card.
 */
var SERVICE_ICON_RULES = [
  // Specific Aadhaar updates
  [/^aadhaar_mobile_update/, "phone"],
  [/^aadhaar_address_update/, "home"],
  [/^aadhaar_biometric_update/, "scan"],
  [/^aadhaar_pvc_card/, "credit-card"],
  [/^aadhaar_edownload/, "download"],
  [/^aadhaar_verification/, "shield-check"],
  [/^aadhaar_/, "fingerprint"],

  // Specific PAN updates
  [/^pan_correction/, "pen"],
  [/^pan_reprint/, "credit-card"],
  [/^pan_edownload/, "download"],
  [/^pan_verification/, "shield-check"],
  [/^pan_/, "credit-card"],

  // Specific Samagra updates
  [/^samagra_search/, "search"],
  [/^samagra_download_card/, "download"],
  [/^samagra_aadhaar_seeding/, "lock"],
  [/^samagra_mobile_update/, "phone"],
  [/^samagra_address_update/, "home"],
  [/^samagra_member_add/, "plus"],
  [/^samagra_member_delete/, "trash"],
  [/^samagra_name_correction/, "pen"],
  [/^samagra_dob_correction/, "clock"],
  [/^samagra_gender_correction/, "user"],
  [/^samagra_/, "users"],

  // Specific Voter updates
  [/^voter_correction/, "pen"],
  [/^voter_address_change/, "home"],
  [/^voter_duplicate_card/, "credit-card"],
  [/^voter_status_check/, "clock"],
  [/^voter_download_eepic/, "download"],
  [/^voter_/, "check-square"],

  // Specific Passport updates
  [/^passport_reissue/, "pen"],
  [/^passport_tatkal/, "clock"],
  [/^passport_pcc/, "shield-check"],
  [/^passport_appointment/, "clock"],
  [/^passport_status_tracking/, "clock"],
  [/^passport_/, "send"],

  // Specific DL updates
  [/^dl_learner/, "graduation"],
  [/^dl_duplicate/, "credit-card"],
  [/^dl_renewal/, "clock"],
  [/^dl_address_change/, "home"],
  [/^dl_status/, "clock"],
  [/^dl_/, "car"],

  [/^abha_/, "heart"],
  [/^gst_/, "percent"],
  [/^(msme|company|opc|llp|partnership)_/, "briefcase"],
  [/^fssai_/, "store"],
  [/^iec_/, "globe"],
  [/^trademark_/, "tag"],
  [/^shop_act/, "store"],
  [/^dsc$/, "pen"],
  [/^bank_account/, "bank"],
  [/^ckyc$/, "shield-check"],
  [/^(account_verification|penny_drop)/, "check-circle"],
  [/^loan_/, "rupee"],
  [/^insurance_/, "shield"],
  [/^credit_card$/, "credit-card"],
  [/^cibil/, "trending-up"],
  [/^(rc_|vehicle_|national_permit|state_permit|challan)/, "car"],
  [/^e_stamp/, "receipt"],
  [/^(affidavit|legal_notice|document_drafting)/, "pen"],
  [/^(rent_agreement|sale_agreement|gift_deed)/, "file-text"],
  [/^property_/, "home"],
  [/^encumbrance/, "file-text"],
  [/^notary/, "check-square"],
  [/^courier_(track|rate)/, "search"],
  [/^courier_(pickup_history|shipment_history)/, "clock"],
  [/^courier_saved_addresses/, "map-pin"],
  [/^courier_saved_receivers/, "users"],
  [/^courier_international/, "globe"],
  [/^courier_reverse/, "truck"],
  [/^courier_/, "package"],
  [/^ayushman/, "heart"],
  [/^pm_kisan/, "rupee"],
  [/^pmegp/, "briefcase"],
  [/^pm_vishwakarma/, "tool"],
  [/^(mukhyamantri|other_schemes)/, "landmark"],
  [/^scholarship/, "graduation"],
  [/^pension/, "user"],
  [/^(labour_card|eshram)/, "id-card"],
  [/^ration_card/, "home"],
  [/_certificate$/, "award"],
  [/^digilocker/, "lock"],
  [/^esign/, "pen"],
  [/^document_verification/, "shield-check"],
  [/^(document_scanner|ocr)/, "scan"],
  [/^digital_vault/, "lock"],
];
function serviceIcon(serviceKey, fallback) {
  for (var i = 0; i < SERVICE_ICON_RULES.length; i++) {
    if (SERVICE_ICON_RULES[i][0].test(serviceKey))
      return SERVICE_ICON_RULES[i][1];
  }
  return fallback || "briefcase";
}
function icon(name, cls) {
  if (!ICONS[name]) return "";
  return (
    '<svg class="nss-icon ' +
    (cls || "") +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    ICONS[name] +
    "</svg>"
  );
}

// --------------------------------------------------------------- state + data loaders
var STATE = { catalog: null, profile: null, documents: null };

function loadCatalog() {
  if (STATE.catalog) return Promise.resolve(STATE.catalog);
  return api("/catalog").then(function (res) {
    STATE.catalog = res;
    return res;
  });
}
function loadProfile(force) {
  if (STATE.profile && !force) return Promise.resolve(STATE.profile);
  return api("/profile").then(function (res) {
    STATE.profile = res.profile;
    return STATE.profile;
  });
}
function loadDocuments(force) {
  if (STATE.documents && !force) return Promise.resolve(STATE.documents);
  return api("/documents").then(function (res) {
    STATE.documents = res.items;
    return STATE.documents;
  });
}
function findService(serviceKey) {
  var cats = (STATE.catalog && STATE.catalog.categories) || [];
  for (var i = 0; i < cats.length; i++) {
    for (var j = 0; j < cats[i].services.length; j++) {
      if (cats[i].services[j].service_key === serviceKey)
        return { service: cats[i].services[j], category: cats[i] };
    }
  }
  return null;
}
function findCategory(key) {
  var cats = (STATE.catalog && STATE.catalog.categories) || [];
  for (var i = 0; i < cats.length; i++) if (cats[i].key === key) return cats[i];
  return null;
}

// --------------------------------------------------------------- router
function router() {
  var hash = (location.hash || "#dashboard").replace("#", "");
  var parts = hash.split("/");
  var route = parts[0];
  setActiveNav(route);
  showLoading();
  if ("dashboard" === route) renderDashboard();
  else if ("verification-hub" === route) renderVerificationHub();
  else if ("categories" === route) renderCategoriesPage();
  else if ("category" === route)
    renderCategory(decodeURIComponent(parts[1] || ""));
  else if ("service" === route)
    renderServiceStart(decodeURIComponent(parts[1] || ""));
  else if ("application" === route) renderApplicationDetail(parts[1]);
  else if ("applications" === route) renderApplicationsList();
  else if ("documents" === route) renderDocumentsPage();
  else if ("profile" === route) renderProfilePage();
  else if ("notifications" === route) renderNotifications();
  else if ("wallet" === route) renderWalletPage();
  else if ("payments" === route) renderPaymentHistory();
  else if ("admin-applications" === route) renderAdminApplications();
  else if ("admin-documents" === route) renderAdminDocuments();
  else if ("admin-service-config" === route) renderAdminServiceConfig();
  else if ("admin-payments" === route) renderAdminPayments();
  else if ("admin-reports" === route) renderAdminReports();
  else if ("admin-api-logs" === route) renderAdminApiLogs();
  else if ("admin-associates" === route) renderAdminAssociates();
  else if ("admin-settings" === route) renderAdminSettings();
  else renderDashboard();
}
window.addEventListener("hashchange", router);

function toggleSidebar(open) {
  var sidebar = document.getElementById("nss-sidebar");
  var overlay = document.getElementById("nss-sidebar-overlay");
  var next =
    "boolean" === typeof open ? open : !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", next);
  overlay.classList.toggle("open", next);
}
document
  .getElementById("nss-menu-toggle")
  .addEventListener("click", function () {
    toggleSidebar();
  });
document
  .getElementById("nss-sidebar-overlay")
  .addEventListener("click", function () {
    toggleSidebar(false);
  });
document.querySelectorAll("#nss-nav a[data-route]").forEach(function (a) {
  a.addEventListener("click", function () {
    toggleSidebar(false);
  });
});

// --------------------------------------------------------------- dashboard / catalog
function serviceCardHtml(svc, iconName) {
  var paid = Number(svc.payment_required) && parseFloat(svc.amount) > 0;
  var priceHtml = svc.redirect_url
    ? '<div class="nss-svc-price nss-svc-price--free">Courier Portal</div>'
    : paid
      ? '<div class="nss-svc-price">' +
        money(svc.amount).replace(".00", "") +
        "</div>"
      : '<div class="nss-svc-price nss-svc-price--free">Free</div>';
  return (
    '<div class="nss-svc-card" data-key="' +
    esc(svc.service_key) +
    '" data-redirect="' +
    esc(svc.redirect_url || "") +
    '">' +
    '<div class="nss-card-arrow">' +
    icon("chevron-right", "nss-icon-sm") +
    "</div>" +
    '<div class="nss-icon-badge">' +
    icon(serviceIcon(svc.service_key, iconName)) +
    "</div>" +
    '<div class="nss-svc-name">' +
    esc(svc.service_label) +
    "</div>" +
    priceHtml +
    "</div>"
  );
}
function bindServiceCardClicks(root) {
  root.querySelectorAll(".nss-svc-card").forEach(function (el) {
    el.addEventListener("click", function () {
      if (el.dataset.redirect) {
        var base = (STATE.catalog.courier_portal_url || "").replace(/\/$/, "");
        window.location.href = base + el.dataset.redirect;
      } else {
        location.hash = "service/" + encodeURIComponent(el.dataset.key);
      }
    });
  });
}

var CATEGORY_DESCRIPTIONS = {
  identity: "Aadhaar, PAN, Passport, Voter ID, DL & ABHA",
  business: "GST, Company/MSME registration, FSSAI, Trademark",
  banking: "Loans, insurance, CKYC, account verification",
  transport: "RC transfer, permits, fitness, challan payment",
  legal: "Agreements, e-Stamp, property, notary",
  courier: "Domestic, international & bulk shipments",
  schemes: "Ayushman, PM Kisan, certificates, ration card",
  digital: "DigiLocker, eSign, OCR, document vault",
};
var POPULAR_SERVICE_KEYS = [
  "pan_new",
  "gst_registration",
  "passport_fresh",
  "aadhaar_update",
  "dl_renewal",
  "ration_card",
  "income_certificate",
  "courier_new_shipment",
];

function renderDashboard() {
  setTitle("Dashboard");
  var appsApi = NSS.user.canManageApplications
    ? "/admin/applications"
    : "/applications";
  Promise.all([loadCatalog(), api("/dashboard-stats"), api(appsApi)])
    .then(function (results) {
      var res = results[0];
      var stats = results[1];
      var apps = results[2].items;

      var statsHtml =
        '<div class="nss-stats-grid">' +
        '<div class="nss-stat-card">' +
        '<div class="nss-stat-icon">' +
        icon("file-text") +
        "</div>" +
        '<div class="nss-stat-info">' +
        '<div class="nss-stat-value">' +
        stats.total_applications +
        "</div>" +
        '<div class="nss-stat-label">Total Applications</div>' +
        "</div>" +
        "</div>" +
        '<div class="nss-stat-card">' +
        '<div class="nss-stat-icon">' +
        icon("clock") +
        "</div>" +
        '<div class="nss-stat-info">' +
        '<div class="nss-stat-value">' +
        stats.month_applications +
        "</div>" +
        '<div class="nss-stat-label">' +
        stats.month_label +
        " Month Applications</div>" +
        "</div>" +
        "</div>" +
        '<a class="nss-stat-card nss-stat-card--link" href="#wallet">' +
        '<div class="nss-stat-icon">' +
        icon("wallet") +
        "</div>" +
        '<div class="nss-stat-info">' +
        '<div class="nss-stat-value">' +
        money(stats.wallet_balance) +
        "</div>" +
        '<div class="nss-stat-label">Wallet Balance</div>' +
        "</div>" +
        '<span class="nss-stat-cta">' +
        icon("plus", "nss-icon-sm") +
        " Add Money</span>" +
        "</a>" +
        "</div>";

      var cards = res.categories
        .map(function (cat) {
          return (
            '<div class="nss-cat-card" data-key="' +
            esc(cat.key) +
            '">' +
            '<div class="nss-card-arrow">' +
            icon("chevron-right", "nss-icon-sm") +
            "</div>" +
            '<div class="nss-icon-badge">' +
            icon(cat.icon || "briefcase") +
            "</div>" +
            '<div class="nss-cat-name">' +
            esc(cat.label) +
            "</div>" +
            '<div class="nss-cat-desc">' +
            esc(CATEGORY_DESCRIPTIONS[cat.key] || "") +
            "</div>" +
            '<div class="nss-cat-count">' +
            cat.services.length +
            " services</div>" +
            "</div>"
          );
        })
        .join("");

      var popular = [];
      res.categories.forEach(function (cat) {
        cat.services.forEach(function (svc) {
          if (POPULAR_SERVICE_KEYS.indexOf(svc.service_key) !== -1) {
            popular.push({ svc: svc, cat: cat });
          }
        });
      });
      popular.sort(function (a, b) {
        return (
          POPULAR_SERVICE_KEYS.indexOf(a.svc.service_key) -
          POPULAR_SERVICE_KEYS.indexOf(b.svc.service_key)
        );
      });
      var popularHtml = popular.length
        ? '<div class="nss-section-heading">Popular Services</div>' +
          '<div class="nss-svc-grid">' +
          popular
            .map(function (m) {
              return serviceCardHtml(m.svc, m.cat.icon);
            })
            .join("") +
          "</div>"
        : "";

      var appsTitle = NSS.user.canManageApplications
        ? "Recent Applications"
        : "My Recent Applications";
      var appsLink = NSS.user.canManageApplications
        ? "#admin-applications"
        : "#applications";
      var recentHtml;
      if (!apps || !apps.length) {
        recentHtml =
          '<div class="nss-card">' +
          emptyState(
            "file-text",
            "No applications yet",
            "Pick a service above to get started.",
          ) +
          "</div>";
      } else {
        recentHtml =
          '<div class="nss-card nss-recent-list">' +
          apps
            .slice(0, 6)
            .map(function (a) {
              var found = findService(a.service_key);
              var label = found ? found.service.service_label : a.service_key;
              var iconName = serviceIcon(
                a.service_key,
                found ? found.category.icon : "briefcase",
              );
              var actionLabel = NSS.user.canManageApplications
                ? "Manage"
                : "draft" === a.status
                  ? "Continue"
                  : "Track";
              return (
                '<a class="nss-recent-row" href="#application/' +
                a.id +
                '">' +
                '<div class="nss-recent-icon">' +
                icon(iconName) +
                "</div>" +
                '<div class="nss-recent-main">' +
                '<div class="nss-recent-service">' +
                esc(label) +
                "</div>" +
                '<div class="nss-recent-no">' +
                esc(a.application_no || "Draft #" + a.id) +
                " &middot; " +
                fmtDate(a.created_at) +
                "</div>" +
                "</div>" +
                statusPill(a.status) +
                '<span class="nss-btn nss-btn-sm">' +
                actionLabel +
                "</span>" +
                "</a>"
              );
            })
            .join("") +
          "</div>";
      }

      var appsTableHtml =
        '<div class="nss-section-heading nss-section-heading--row" style="margin-top: 32px;">' +
        "<span>" +
        appsTitle +
        "</span>" +
        '<a class="nss-section-link" href="' +
        appsLink +
        '">View All ' +
        icon("chevron-right", "nss-icon-sm") +
        "</a>" +
        "</div>" +
        recentHtml;

      content.innerHTML =
        statsHtml +
        '<div class="nss-search-wrap">' +
        icon("search") +
        '<input type="text" class="nss-search-input" id="nss-service-search" placeholder="Search across all ' +
        res.categories.reduce(function (n, c) {
          return n + c.services.length;
        }, 0) +
        ' services — e.g. PAN, Passport, GST…" autocomplete="off"/>' +
        "</div>" +
        '<div id="nss-dashboard-body">' +
        popularHtml +
        '<div class="nss-section-heading nss-section-heading--row">' +
        "<span>Browse By Category</span>" +
        '<a class="nss-section-link" href="#categories">View All ' +
        icon("chevron-right", "nss-icon-sm") +
        "</a>" +
        "</div>" +
        '<div class="nss-cat-grid">' +
        cards +
        "</div>" +
        appsTableHtml +
        "</div>";

      content.querySelectorAll(".nss-cat-card").forEach(function (el) {
        el.addEventListener("click", function () {
          location.hash = "category/" + encodeURIComponent(el.dataset.key);
        });
      });
      bindServiceCardClicks(content);

      var searchInput = document.getElementById("nss-service-search");
      var bodyEl = document.getElementById("nss-dashboard-body");
      var defaultBody = bodyEl.innerHTML;
      searchInput.addEventListener("input", function () {
        var q = searchInput.value.trim().toLowerCase();
        if (!q) {
          bodyEl.innerHTML = defaultBody;
          content.querySelectorAll(".nss-cat-card").forEach(function (el) {
            el.addEventListener("click", function () {
              location.hash = "category/" + encodeURIComponent(el.dataset.key);
            });
          });
          bindServiceCardClicks(bodyEl);
          return;
        }
        var matches = [];
        res.categories.forEach(function (cat) {
          cat.services.forEach(function (svc) {
            if (svc.service_label.toLowerCase().indexOf(q) !== -1) {
              matches.push({ svc: svc, cat: cat });
            }
          });
        });
        bodyEl.innerHTML =
          '<div class="nss-search-results-label">' +
          matches.length +
          " service" +
          (1 === matches.length ? "" : "s") +
          ' match "' +
          esc(searchInput.value.trim()) +
          '"</div>' +
          '<div class="nss-svc-grid">' +
          matches
            .map(function (m) {
              return serviceCardHtml(m.svc, m.cat.icon);
            })
            .join("") +
          "</div>";
        if (!matches.length) {
          bodyEl.innerHTML = emptyState(
            "search",
            "No services match that search.",
            "Try a different keyword, or browse by category instead.",
          );
        }
        bindServiceCardClicks(bodyEl);
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// =====================================================================
// VERIFICATION HUB PAGE
// =====================================================================
var VH_SERVICES = [
  {
    key: "aadhaar_check",
    label: "Aadhaar Check",
    icon: "🆔",
    color: "#6366f1",
    desc: "Verify Aadhaar number and demographic details securely.",
    tag: "Identity",
    fields: [{ name: "aadhaar_number", label: "12-digit Aadhaar Number", type: "text", placeholder: "Enter Aadhaar number" }]
  },
  {
    key: "pan_check",
    label: "PAN Check",
    icon: "🪪",
    color: "#0ea5e9",
    desc: "Verify PAN number, category, and name match instantly.",
    tag: "Tax",
    fields: [
      { name: "pan_number", label: "PAN Number", type: "text", placeholder: "e.g. ABCDE1234F" },
      { name: "full_name", label: "Full Name as per PAN", type: "text", placeholder: "Enter full name" },
      { name: "date_of_birth", label: "Date of Birth", type: "date", placeholder: "" }
    ]
  },
  {
    key: "gst_check",
    label: "GST Check",
    icon: "🧾",
    color: "#10b981",
    desc: "Validate GSTIN and fetch complete GST registration details.",
    tag: "Business",
    fields: [{ name: "gstin", label: "GSTIN", type: "text", placeholder: "e.g. 23AABCU9603R1ZP" }]
  },
  {
    key: "company_check",
    label: "Company Check",
    icon: "🏢",
    color: "#f59e0b",
    desc: "Look up MCA company details by CIN or LLPIN number.",
    tag: "Corporate",
    fields: [{ name: "cin", label: "Company CIN / LLPIN", type: "text", placeholder: "e.g. U72900MP2021OPC062412" }]
  },
  {
    key: "bank_check",
    label: "Bank Verification",
    icon: "🏦",
    color: "#8b5cf6",
    desc: "Penny-less bank account name and IFSC verification.",
    tag: "Banking",
    fields: [
      { name: "account_number", label: "Account Number", type: "text", placeholder: "Enter account number" },
      { name: "ifsc_code", label: "IFSC Code", type: "text", placeholder: "e.g. SBIN0001234" }
    ]
  },
  {
    key: "vehicle_check",
    label: "Vehicle Check",
    icon: "🚗",
    color: "#ec4899",
    desc: "Verify RC details, owner name, and insurance validity.",
    tag: "Transport",
    fields: [{ name: "registration_number", label: "Registration Number", type: "text", placeholder: "e.g. MP04AB1234" }]
  }
];

function renderVerificationHub() {
  setTitle("Verification Hub");
  var content = document.getElementById("nss-content");

  // Fetch recent verification hub submissions
  Promise.all([
    api("/applications?category=verification_hub&per_page=20").catch(function() { return { applications: [] }; })
  ]).then(function(results) {
    var recent = (results[0].applications || []);

    var cards = VH_SERVICES.map(function(svc) {
      return (
        '<div class="nss-vh-card" data-svc="' + svc.key + '" style="--vh-color:' + svc.color + '">' +
          '<div class="nss-vh-card-top">' +
            '<div class="nss-vh-icon">' + svc.icon + '</div>' +
            '<div class="nss-vh-tag">' + svc.tag + '</div>' +
          '</div>' +
          '<div class="nss-vh-card-body">' +
            '<div class="nss-vh-label">' + svc.label + '</div>' +
            '<div class="nss-vh-desc">' + svc.desc + '</div>' +
          '</div>' +
          '<button class="nss-vh-cta" data-svc="' + svc.key + '">Verify Now <span>→</span></button>' +
        '</div>'
      );
    }).join('');

    var historyRows = recent.length ? recent.map(function(app) {
      var fd = app.form_data || {};
      var verified = fd._verified_name || '—';
      var ref = fd._provider_reference || '—';
      var statusClass = app.status === 'completed' ? 'nss-vh-status-ok' : 'nss-vh-status-pend';
      var statusLabel = app.status === 'completed' ? '✓ Verified' : (app.status || 'Pending');
      return '<tr>' +
        '<td>' + esc(app.application_no || '#'+app.id) + '</td>' +
        '<td>' + esc(app.service_label || app.service_key) + '</td>' +
        '<td>' + esc(verified) + '</td>' +
        '<td><code class="nss-vh-refcode">' + esc(ref) + '</code></td>' +
        '<td><span class="' + statusClass + '">' + statusLabel + '</span></td>' +
        '<td><a href="#application/' + app.id + '" class="nss-vh-view">View →</a></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" class="nss-vh-empty">No verification checks yet. Use the cards above to start!</td></tr>';

    content.innerHTML =
      '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><span class="current">Verification Hub</span></div>' +
      '<div class="nss-vh-hero">' +
        '<div class="nss-vh-hero-text">' +
          '<h1 class="nss-vh-hero-title">Instant Verification Hub</h1>' +
          '<p class="nss-vh-hero-sub">One-click KYC, banking, and corporate identity checks powered by Sandbox.co.in</p>' +
        '</div>' +
        '<div class="nss-vh-hero-badge"><span>🔒 Powered by Sandbox API</span></div>' +
      '</div>' +
      '<div class="nss-vh-grid">' + cards + '</div>' +

      // Verification form (initially hidden)
      '<div class="nss-vh-form-wrap" id="nss-vh-form-wrap" style="display:none;">' +
        '<div class="nss-card nss-panel nss-vh-form-card">' +
          '<div class="nss-vh-form-header">' +
            '<button class="nss-vh-back-btn" id="nss-vh-back">← Back</button>' +
            '<h2 id="nss-vh-form-title">Verify</h2>' +
          '</div>' +
          '<div id="nss-vh-form-fields"></div>' +
          '<div class="nss-vh-form-actions">' +
            '<button class="nss-btn nss-btn-primary" id="nss-vh-submit" style="width:100%;">Run Verification</button>' +
          '</div>' +
          '<div id="nss-vh-result" style="margin-top:20px;"></div>' +
        '</div>' +
      '</div>' +

      // History table
      '<div class="nss-card nss-panel nss-vh-history">' +
        '<div class="nss-vh-history-header">' +
          '<h2>Verification History</h2>' +
          '<span class="nss-vh-count">' + recent.length + ' checks</span>' +
        '</div>' +
        '<div class="nss-table-wrap"><table class="nss-vh-table">' +
          '<thead><tr>' +
            '<th>Ref No</th><th>Check Type</th><th>Verified Name</th><th>Transaction ID</th><th>Status</th><th>Action</th>' +
          '</tr></thead>' +
          '<tbody>' + historyRows + '</tbody>' +
        '</table></div>' +
      '</div>';

    // Attach card click listeners
    document.querySelectorAll('.nss-vh-cta[data-svc]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var svcKey = btn.getAttribute('data-svc');
        var svc = VH_SERVICES.find(function(s) { return s.key === svcKey; });
        if (!svc) return;

        document.getElementById('nss-vh-form-wrap').style.display = 'block';
        document.getElementById('nss-vh-form-title').textContent = svc.label + ' Verification';
        document.getElementById('nss-vh-result').innerHTML = '';

        var fieldsHtml = svc.fields.map(function(f) {
          return '<div class="nss-field">' +
            '<label>' + f.label + '</label>' +
            '<input class="nss-input" id="nss-vh-field-' + f.name + '" type="' + f.type + '" placeholder="' + (f.placeholder || '') + '" />' +
          '</div>';
        }).join('');
        document.getElementById('nss-vh-form-fields').innerHTML = fieldsHtml;

        // Store active svc
        document.getElementById('nss-vh-submit').setAttribute('data-svc', svcKey);

        // Scroll to form
        document.getElementById('nss-vh-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Back button
    document.getElementById('nss-vh-back').addEventListener('click', function() {
      document.getElementById('nss-vh-form-wrap').style.display = 'none';
    });

    // Submit handler
    document.getElementById('nss-vh-submit').addEventListener('click', function() {
      var btn = this;
      var svcKey = btn.getAttribute('data-svc');
      var svc = VH_SERVICES.find(function(s) { return s.key === svcKey; });
      if (!svc) return;

      var formData = {};
      svc.fields.forEach(function(f) {
        var el = document.getElementById('nss-vh-field-' + f.name);
        if (el) formData[f.name] = el.value.trim();
      });

      var resultEl = document.getElementById('nss-vh-result');
      resultEl.innerHTML = '<div class="nss-vh-loading"><div class="nss-spinner-sm"></div> Running verification via Sandbox API…</div>';
      btn.disabled = true;

      // We need to create an application under verification_hub category then immediately submit it
      api('/applications', 'POST', { service_key: svcKey, form_data: formData })
        .then(function(appRes) {
          var appId = appRes.id || (appRes.application && appRes.application.id);
          if (!appId) throw new Error('Application creation failed.');
          return api('/applications/' + appId + '/submit', 'POST');
        })
        .then(function(res) {
          var app2 = res.application || res;
          var fd = app2.form_data || {};
          if (fd._verification_status === 'success') {
            var detRows = Object.keys(fd._verified_details || {}).map(function(k) {
              return '<div class="nss-vr-row"><span class="nss-vr-label">' + esc(k) + '</span><span class="nss-vr-val">' + esc(fd._verified_details[k]) + '</span></div>';
            }).join('');
            resultEl.innerHTML =
              '<div class="nss-vh-inline-result">' +
                '<div class="nss-vr-header">' +
                  '<div class="nss-vr-icon">✓</div>' +
                  '<div>' +
                    '<div class="nss-vr-title">Verification Successful</div>' +
                    '<div class="nss-vr-sub">via ' + esc(fd._provider_name || 'Sandbox API') + '</div>' +
                  '</div>' +
                  (fd._verified_name ? '<div class="nss-vr-name">' + esc(fd._verified_name) + '</div>' : '') +
                '</div>' +
                (fd._provider_reference ? '<div class="nss-vr-ref">Ref: <strong>' + esc(fd._provider_reference) + '</strong></div>' : '') +
                '<div class="nss-vr-details">' + detRows + '</div>' +
                '<a href="#application/' + app2.id + '" class="nss-btn nss-btn-secondary" style="margin-top:16px;display:inline-block;">View Full Details →</a>' +
              '</div>';
            toast('✓ Verification completed!', 'ok');
            // Reload history
            setTimeout(function() { renderVerificationHub(); }, 3000);
          } else {
            throw new Error('Verification response was unexpected.');
          }
        })
        .catch(function(e) {
          resultEl.innerHTML = '<div class="nss-error-box">' + esc(e.message) + '</div>';
          toast(e.message, 'err');
        })
        .finally(function() { btn.disabled = false; });
    });

  }).catch(function(e) {
    content.innerHTML = errorBox(e);
  });
}

function renderCategoriesPage() {
  setTitle("Browse Categories");
  loadCatalog()
    .then(function (res) {
      var cards = res.categories
        .map(function (cat) {
          return (
            '<div class="nss-cat-card nss-cat-card--large nss-cat-card--' +
            esc(cat.key) +
            '" data-key="' +
            esc(cat.key) +
            '">' +
            '<div class="nss-card-arrow">' +
            icon("chevron-right", "nss-icon-sm") +
            "</div>" +
            '<div class="nss-icon-badge">' +
            icon(cat.icon || "briefcase") +
            "</div>" +
            '<div class="nss-cat-name">' +
            esc(cat.label) +
            "</div>" +
            '<div class="nss-cat-desc">' +
            esc(CATEGORY_DESCRIPTIONS[cat.key] || "") +
            "</div>" +
            '<div class="nss-cat-count">' +
            cat.services.length +
            " services available</div>" +
            "</div>"
          );
        })
        .join("");

      content.innerHTML =
        '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><span class="current">Categories</span></div>' +
        '<div class="nss-cat-grid nss-cat-grid--large">' +
        cards +
        "</div>";

      content.querySelectorAll(".nss-cat-card").forEach(function (el) {
        el.addEventListener("click", function () {
          location.hash = "category/" + encodeURIComponent(el.dataset.key);
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderCategory(key) {
  loadCatalog()
    .then(function () {
      var cat = findCategory(key);
      if (!cat) {
        content.innerHTML = errorBox(new Error("Category not found."));
        return;
      }
      setTitle(cat.label);
      var cards = cat.services
        .map(function (svc) {
          return serviceCardHtml(svc, cat.icon);
        })
        .join("");
      content.innerHTML =
        '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><span class="current">' +
        esc(cat.label) +
        "</span></div>" +
        '<div class="nss-svc-grid">' +
        cards +
        "</div>";
      bindServiceCardClicks(content);
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

/** Clicking a service creates a fresh draft application, then hands off to the shared form editor. */
function renderServiceStart(serviceKey) {
  api("/applications", "POST", { service_key: serviceKey })
    .then(function (res) {
      location.hash = "application/" + res.application.id;
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderApplicationDetail(id) {
  Promise.all([api("/applications/" + id), loadCatalog()])
    .then(function (results) {
      var res = results[0];
      var app = res.application,
        config = res.config;
      setTitle(config.service_label);
      if ("draft" === app.status) {
        renderFormEditor(app, config, res.status_log, res.documents || []);
      } else {
        renderApplicationReadonly(
          app,
          config,
          res.status_log,
          res.documents || [],
        );
      }
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function fieldInputHtml(field, value) {
  value = value == null ? "" : value;
  var req = field.required ? " required" : "";
  var reqStar = field.required ? ' <span class="req">*</span>' : "";
  var html =
    '<div class="nss-field"><label>' + esc(field.label) + reqStar + "</label>";
  if ("select" === field.type) {
    html +=
      '<select class="nss-select" name="' +
      esc(field.name) +
      '"' +
      req +
      '><option value="">Select…</option>';
    Object.keys(field.options || {}).forEach(function (val) {
      html +=
        '<option value="' +
        esc(val) +
        '"' +
        (val === value ? " selected" : "") +
        ">" +
        esc(field.options[val]) +
        "</option>";
    });
    html += "</select>";
  } else if ("textarea" === field.type) {
    html +=
      '<textarea class="nss-input" rows="3" name="' +
      esc(field.name) +
      '"' +
      req +
      ">" +
      esc(value) +
      "</textarea>";
  } else if ("checkbox" === field.type) {
    html =
      '<div class="nss-field"><label class="nss-checkbox"><input type="checkbox" name="' +
      esc(field.name) +
      '" value="1"' +
      (value ? " checked" : "") +
      "/> " +
      esc(field.label) +
      reqStar +
      "</label>";
  } else {
    var type =
      { number: "number", date: "date", tel: "tel", email: "email" }[
        field.type
      ] || "text";
    html +=
      '<input class="nss-input" type="' +
      type +
      '" name="' +
      esc(field.name) +
      '" value="' +
      esc(value) +
      '"' +
      req +
      "/>";
  }
  html += "</div>";
  return html;
}

function profileFieldRow(label, name, value, type, required) {
  var reqStar = required ? ' <span class="req">*</span>' : "";
  var reqAttr = required ? " required" : "";
  return (
    '<div class="nss-field"><label>' +
    label +
    reqStar +
    '</label><input class="nss-input" type="' +
    (type || "text") +
    '" name="' +
    name +
    '" value="' +
    esc(value || "") +
    '"' +
    reqAttr +
    "/></div>"
  );
}

function groupedProfileFieldsHtml(p) {
  return (
    '<div class="nss-form-section-header">Personal Information</div>' +
    '<div class="nss-form-grid">' +
    profileFieldRow("Applicant Full Name", "name", p.name, "text", true) +
    profileFieldRow(
      "Father\'s Name",
      "father_name",
      p.father_name,
      "text",
      true,
    ) +
    profileFieldRow(
      "Mother\'s Name",
      "mother_name",
      p.mother_name,
      "text",
      false,
    ) +
    profileFieldRow("Date Of Birth", "dob", p.dob, "date", true) +
    profileFieldRow("Gender", "gender", p.gender, "text", true) +
    "</div>" +
    '<div class="nss-form-section-header">Contact Details</div>' +
    '<div class="nss-form-grid">' +
    profileFieldRow("Mobile Number", "mobile", p.mobile, "tel", true) +
    profileFieldRow("Email Address", "email", p.email, "email", true) +
    "</div>" +
    '<div class="nss-form-section-header">Address Details</div>' +
    '<div class="nss-form-grid">' +
    profileFieldRow("Address Line 1", "address1", p.address1, "text", true) +
    profileFieldRow("Address Line 2", "address2", p.address2, "text", false) +
    profileFieldRow("District", "district", p.district, "text", true) +
    profileFieldRow("State", "state", p.state, "text", true) +
    profileFieldRow("Pincode", "pincode", p.pincode, "text", true) +
    "</div>" +
    '<div class="nss-form-section-header">Government Identifiers</div>' +
    '<div class="nss-form-grid">' +
    profileFieldRow(
      "Aadhaar Number",
      "aadhaar_no",
      p.aadhaar_no,
      "text",
      true,
    ) +
    profileFieldRow("Samagra ID", "samagra_id", p.samagra_id, "text", false) +
    profileFieldRow("PAN Number", "pan_no", p.pan_no, "text", true) +
    "</div>"
  );
}

function applicationStepperHtml(status) {
  var step1Class = "nss-step";
  var step2Class = "nss-step";
  var step3Class = "nss-step";
  var progressWidth = "0%";

  if (status === "draft" || status === "submitted") {
    step1Class += " active";
    progressWidth = "0%";
  } else if (status === "in_progress" || status === "pending_user") {
    step1Class += " completed";
    step2Class += " active";
    progressWidth = "50%";
  } else if (status === "completed") {
    step1Class += " completed";
    step2Class += " completed";
    step3Class += " completed";
    progressWidth = "100%";
  } else if (status === "rejected") {
    step1Class += " completed";
    step2Class += " completed";
    step3Class += " rejected";
    progressWidth = "100%";
  }

  var finalStepLabel = status === "rejected" ? "Rejected" : "Completed";
  var finalStepIcon = status === "rejected" ? "x-circle" : "check-circle";

  return (
    '<div class="nss-stepper">' +
    '<div class="nss-stepper-progress" style="width: ' +
    progressWidth +
    ';"></div>' +
    '<div class="' +
    step1Class +
    '">' +
    '<div class="nss-step-dot">' +
    icon("plus", "nss-icon-sm") +
    "</div>" +
    '<div class="nss-step-label">Submitted</div>' +
    "</div>" +
    '<div class="' +
    step2Class +
    '">' +
    '<div class="nss-step-dot">' +
    icon("clock", "nss-icon-sm") +
    "</div>" +
    '<div class="nss-step-label">Processing</div>' +
    "</div>" +
    '<div class="' +
    step3Class +
    '">' +
    '<div class="nss-step-dot">' +
    icon(finalStepIcon, "nss-icon-sm") +
    "</div>" +
    '<div class="nss-step-label">' +
    finalStepLabel +
    "</div>" +
    "</div>" +
    "</div>"
  );
}
function profileFieldsHtml(p) {
  return (
    profileFieldRow("Name", "name", p.name) +
    profileFieldRow("Mobile", "mobile", p.mobile) +
    profileFieldRow("Email", "email", p.email, "email") +
    profileFieldRow("Father's Name", "father_name", p.father_name) +
    profileFieldRow("Mother's Name", "mother_name", p.mother_name) +
    profileFieldRow("Date Of Birth", "dob", p.dob, "date") +
    profileFieldRow("Gender", "gender", p.gender) +
    profileFieldRow("Address Line 1", "address1", p.address1) +
    profileFieldRow("Address Line 2", "address2", p.address2) +
    profileFieldRow("District", "district", p.district) +
    profileFieldRow("State", "state", p.state) +
    profileFieldRow("Pincode", "pincode", p.pincode) +
    profileFieldRow("Aadhaar Number", "aadhaar_no", p.aadhaar_no) +
    profileFieldRow("Samagra ID", "samagra_id", p.samagra_id) +
    profileFieldRow("PAN Number", "pan_no", p.pan_no)
  );
}
function wireProfileForm(formEl, onSaved) {
  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = formEl.querySelector('button[type="submit"]');
    btn.disabled = true;
    api("/profile", "POST", formToObject(formEl))
      .then(function (res) {
        toast("Profile saved.", "ok");
        STATE.profile = res.profile;
        onSaved(res.profile);
      })
      .catch(function (e2) {
        toast(e2.message, "err");
        btn.disabled = false;
      });
  });
}

function renderProfileGate(app, profile) {
  content.innerHTML =
    '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><span class="current">Complete Your Profile</span></div>' +
    '<form id="nss-profile-gate-form" class="nss-card nss-panel">' +
    "<h2>Complete Your Profile First</h2>" +
    '<p class="nss-panel-sub">Name, mobile, address and pincode are required — fill them in once here and every service form auto-fills from this instead of asking again.</p>' +
    '<div class="nss-form-grid">' +
    profileFieldsHtml(profile) +
    "</div>" +
    '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:20px;">Save &amp; Continue</button>' +
    "</form>";

  wireProfileForm(
    document.getElementById("nss-profile-gate-form"),
    function () {
      renderApplicationDetail(app.id);
    },
  );
}

function renderFormEditor(app, config, statusLog, appDocs) {
  // appDocs = documents already linked to this specific application (from API)
  appDocs = appDocs || [];
  Promise.all([loadProfile(), loadDocuments()])
    .then(function (results) {
      var profile = results[0];
      var docsByType = {};

      // 1. First seed from the global vault (low priority)
      results[1].forEach(function (d) {
        if ("rejected" !== d.status && !docsByType[d.doc_type])
          docsByType[d.doc_type] = d;
      });

      // 2. Override with application-specific saved documents (high priority)
      // These are the documents the user explicitly attached to this draft,
      // so they always take precedence over any vault doc of the same type.
      appDocs.forEach(function (d) {
        if ("rejected" !== d.status) docsByType[d.doc_type] = d;
      });

      var fieldsHtml = (config.fields || [])
        .map(function (f) {
          return fieldInputHtml(f, app.form_data[f.name]);
        })
        .join("");

      var docsHtml = (config.required_documents || [])
        .map(function (docType) {
          var have = docsByType[docType];
          if (have) {
            return (
              '<div class="nss-doc-card have" data-doctype="' +
              esc(docType) +
              '">' +
              '<a class="nss-doc-preview" href="' +
              restFileUrl("/documents/" + have.id + "/file") +
              '" target="_blank" rel="noopener" title="Open full size">' +
              docPreviewHtml(have) +
              "</a>" +
              '<div class="nss-doc-type">' +
              esc(DOC_TYPE_LABELS[docType] || docType) +
              "</div>" +
              '<div class="nss-doc-filename">' +
              esc(have.file_name || "") +
              "</div>" +
              '<div class="nss-doc-actions" style="margin-top:6px;">' +
              '<span class="nss-badge nss-badge-on" style="margin:0;">' +
              icon("check", "nss-icon-sm") +
              " On file</span>" +
              '<button type="button" class="nss-doc-clear-saved nss-btn nss-btn-sm" title="Remove saved file">' +
              icon("x", "nss-icon-sm") +
              " Remove" +
              "</button>" +
              "</div>" +
              '<input type="hidden" class="nss-doc-existing-id" value="' +
              have.id +
              '"/>' +
              "</div>"
            );
          }
          return (
            '<div class="nss-doc-card" data-doctype="' +
            esc(docType) +
            '">' +
            '<div class="nss-doc-icon">' +
            icon("upload", "nss-icon-lg") +
            "</div>" +
            '<div class="nss-doc-type">' +
            esc(DOC_TYPE_LABELS[docType] || docType) +
            "</div>" +
            '<div class="nss-doc-localpreview"></div>' +
            '<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"/>' +
            "</div>"
          );
        })
        .join("");

      var formContentHtml =
        '<div class="nss-form-section-header">Service Title</div>' +
        '<div style="margin-bottom: 20px;"><span class="nss-btn nss-btn-primary" style="pointer-events: none; border-radius: 8px;">' +
        esc(config.service_label) +
        "</span></div>" +
        groupedProfileFieldsHtml(profile) +
        (fieldsHtml
          ? '<div class="nss-form-section-header">Service Details</div><div class="nss-form-grid">' +
            fieldsHtml +
            "</div>"
          : "") +
        (docsHtml
          ? '<div class="nss-form-section-header">Required Documents</div><div class="nss-doc-grid">' +
            docsHtml +
            "</div>"
          : "") +
        '<div class="nss-form-section-header">Comment</div>' +
        '<textarea class="nss-input" name="comment" rows="3" placeholder="Enter comment (optional)">' +
        esc(app.form_data.comment || "") +
        "</textarea>" +
        '<div style="display:flex;gap:10px;margin-top:24px;">' +
        '<button type="button" class="nss-btn" id="nss-save-draft">Save Draft</button>' +
        (config.payment_required
          ? ""
          : '<button type="submit" class="nss-btn nss-btn-primary" id="nss-submit-app">Submit Application</button>') +
        "</div>";

      var breadcrumbHtml =
        '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><a href="#category/' +
        esc(config.category_key) +
        '">' +
        esc(config.category_label) +
        '</a><span class="sep">/</span><span class="current">' +
        esc(config.service_label) +
        "</span></div>";

      if (config.payment_required) {
        content.innerHTML =
          breadcrumbHtml +
          '<div class="nss-form-layout-cols">' +
          '<div class="nss-form-main-col">' +
          '<form id="nss-service-form" class="nss-card nss-panel" style="margin-top:0;">' +
          formContentHtml +
          "</form>" +
          "</div>" +
          '<div class="nss-form-side-col">' +
          '<div id="nss-payment-summary"></div>' +
          "</div>" +
          "</div>";
      } else {
        content.innerHTML =
          breadcrumbHtml +
          '<form id="nss-service-form" class="nss-card nss-panel" style="margin-top:14px;">' +
          formContentHtml +
          "</form>";
      }

      // Show a live preview and immediately upload/persist the file to the backend
      content
        .querySelectorAll(".nss-doc-card input[type=file]")
        .forEach(function (input) {
          input.addEventListener("change", function () {
            var card = input.closest(".nss-doc-card");
            var box = card.querySelector(".nss-doc-localpreview");
            if (!box) return;
            var f = input.files[0];
            if (!f) {
              box.innerHTML = "";
              card.classList.remove("picked");
              return;
            }

            card.classList.add("picked");
            var inner =
              '<div class="nss-doc-preview">' +
              (f.type.indexOf("image/") === 0
                ? '<img class="nss-doc-thumb" src="' +
                  URL.createObjectURL(f) +
                  '" alt=""/>'
                : '<div class="nss-doc-thumb nss-doc-thumb--pdf">' +
                  icon("file-text", "nss-icon-lg") +
                  "<span>PDF</span></div>") +
              "</div>" +
              '<div class="nss-doc-filename">Uploading...</div>' +
              '<div class="nss-doc-actions">' +
              '<span class="nss-badge" style="background:#fef3c7;color:#d97706;border:1px solid #fde68a;">Selected</span>' +
              '<button type="button" class="nss-doc-clear nss-btn nss-btn-sm" title="Remove selected file">' +
              icon("x", "nss-icon-sm") +
              " Remove" +
              "</button>" +
              "</div>";
            box.innerHTML = inner;

            // Immediate Upload to Backend
            var fd = new FormData();
            fd.append("doc_type", card.dataset.doctype);
            fd.append("file", f);

            api("/documents", "POST", fd)
              .then(function (res) {
                STATE.documents = null; // Clear cached vault documents

                // Add a hidden input to mark this card as having an uploaded doc
                var existingIdInput = card.querySelector(
                  ".nss-doc-existing-id",
                );
                if (!existingIdInput) {
                  existingIdInput = document.createElement("input");
                  existingIdInput.type = "hidden";
                  existingIdInput.className = "nss-doc-existing-id";
                  card.appendChild(existingIdInput);
                }
                existingIdInput.value = res.document.id;

                // Update text filename to actual name
                var filenameEl = box.querySelector(".nss-doc-filename");
                if (filenameEl) {
                  filenameEl.textContent = f.name;
                }

                // Automatically save draft to associate this new document ID with the application draft
                return saveDraft();
              })
              .then(function () {
                toast("Document uploaded and saved to draft.", "ok");
              })
              .catch(function (err) {
                toast("Failed to upload: " + err.message, "err");
                box.innerHTML = "";
                card.classList.remove("picked");
                input.value = "";
              });
          });
        });

      // Delegated handler: clicking the "Remove" button on a picked card
      // resets the file input so the user can choose again.
      content.addEventListener("click", function (e) {
        var btn = e.target.closest(".nss-doc-clear");
        if (!btn) return;
        var card = btn.closest(".nss-doc-card");
        if (!card) return;
        var fileInput = card.querySelector("input[type=file]");
        var box = card.querySelector(".nss-doc-localpreview");
        if (fileInput) {
          // Reset the native file input
          fileInput.value = "";
          // Trigger a synthetic change event so the listener above clears the preview
          fileInput.dispatchEvent(new Event("change"));
        }
        if (box) {
          box.innerHTML = "";
        }
        card.classList.remove("picked");
      });

      // Delegated handler: clicking the "Remove" button on an already saved/on-file card
      content.addEventListener("click", function (e) {
        var btn = e.target.closest(".nss-doc-clear-saved");
        if (!btn) return;
        var card = btn.closest(".nss-doc-card");
        if (!card) return;

        var docType = card.dataset.doctype;

        var existingIdInput = card.querySelector(".nss-doc-existing-id");
        var docId = existingIdInput
          ? parseInt(existingIdInput.value, 10)
          : null;

        btn.disabled = true;
        btn.textContent = "Removing…";

        function resetCard() {
          card.className = "nss-doc-card";
          card.innerHTML =
            '<div class="nss-doc-icon">' +
            icon("upload", "nss-icon-lg") +
            "</div>" +
            '<div class="nss-doc-type">' +
            esc(DOC_TYPE_LABELS[docType] || docType) +
            "</div>" +
            '<div class="nss-doc-localpreview"></div>' +
            '<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"/>';

          // Bind the file-input event listener to the newly generated file input element
          var input = card.querySelector("input[type=file]");
          input.addEventListener("change", function () {
            var box = card.querySelector(".nss-doc-localpreview");
            if (!box) return;
            var f = input.files[0];
            if (!f) {
              box.innerHTML = "";
              card.classList.remove("picked");
              return;
            }

            card.classList.add("picked");
            var inner =
              '<div class="nss-doc-preview">' +
              (f.type.indexOf("image/") === 0
                ? '<img class="nss-doc-thumb" src="' +
                  URL.createObjectURL(f) +
                  '" alt=""/>'
                : '<div class="nss-doc-thumb nss-doc-thumb--pdf">' +
                  icon("file-text", "nss-icon-lg") +
                  "<span>PDF</span></div>") +
              "</div>" +
              '<div class="nss-doc-filename">Uploading...</div>' +
              '<div class="nss-doc-actions">' +
              '<span class="nss-badge" style="background:#fef3c7;color:#d97706;border:1px solid #fde68a;">Selected</span>' +
              '<button type="button" class="nss-doc-clear nss-btn nss-btn-sm" title="Remove selected file">' +
              icon("x", "nss-icon-sm") +
              " Remove" +
              "</button>" +
              "</div>";
            box.innerHTML = inner;

            var fd = new FormData();
            fd.append("doc_type", card.dataset.doctype);
            fd.append("file", f);

            api("/documents", "POST", fd)
              .then(function (res) {
                STATE.documents = null;
                var newIdInput = card.querySelector(".nss-doc-existing-id");
                if (!newIdInput) {
                  newIdInput = document.createElement("input");
                  newIdInput.type = "hidden";
                  newIdInput.className = "nss-doc-existing-id";
                  card.appendChild(newIdInput);
                }
                newIdInput.value = res.document.id;
                var filenameEl = box.querySelector(".nss-doc-filename");
                if (filenameEl) filenameEl.textContent = f.name;
                return saveDraft();
              })
              .then(function () {
                toast("Document uploaded and saved to draft.", "ok");
              })
              .catch(function (err) {
                toast("Failed to upload: " + err.message, "err");
                box.innerHTML = "";
                card.classList.remove("picked");
                input.value = "";
              });
          });
        }

        // If there's a real document ID, delete it from the server first
        var deletePromise = docId
          ? api("/documents/" + docId, "DELETE")
          : Promise.resolve();

        deletePromise
          .then(function () {
            STATE.documents = null; // invalidate vault cache
            resetCard();
            return saveDraft();
          })
          .then(function () {
            toast("Document removed.", "ok");
          })
          .catch(function (err) {
            toast("Failed to remove document: " + err.message, "err");
            // Re-enable the button so user can try again
            if (btn && btn.parentNode) {
              btn.disabled = false;
              btn.textContent = "Remove";
            }
          });
      });

      function collectDocumentIds() {
        var ids = [];
        var pending = [];
        content.querySelectorAll(".nss-doc-card").forEach(function (card) {
          var existing = card.querySelector(".nss-doc-existing-id");
          if (existing) {
            ids.push(parseInt(existing.value, 10));
            return;
          }
          var fileInput = card.querySelector("input[type=file]");
          if (fileInput && fileInput.files[0])
            pending.push({
              doctype: card.dataset.doctype,
              file: fileInput.files[0],
            });
        });
        if (!pending.length) return Promise.resolve(ids);
        return Promise.all(
          pending.map(function (p) {
            var fd = new FormData();
            fd.append("doc_type", p.doctype);
            fd.append("file", p.file);
            return api("/documents", "POST", fd).then(function (res) {
              ids.push(res.document.id);
              STATE.documents = null;
            });
          }),
        ).then(function () {
          return ids;
        });
      }

      function saveProfileFields() {
        var form = document.getElementById("nss-service-form");
        var pData = {
          name: form.elements["name"] ? form.elements["name"].value : "",
          mobile: form.elements["mobile"] ? form.elements["mobile"].value : "",
          email: form.elements["email"] ? form.elements["email"].value : "",
          father_name: form.elements["father_name"]
            ? form.elements["father_name"].value
            : "",
          mother_name: form.elements["mother_name"]
            ? form.elements["mother_name"].value
            : "",
          dob: form.elements["dob"] ? form.elements["dob"].value : "",
          gender: form.elements["gender"] ? form.elements["gender"].value : "",
          address1: form.elements["address1"]
            ? form.elements["address1"].value
            : "",
          address2: form.elements["address2"]
            ? form.elements["address2"].value
            : "",
          district: form.elements["district"]
            ? form.elements["district"].value
            : "",
          state: form.elements["state"] ? form.elements["state"].value : "",
          pincode: form.elements["pincode"]
            ? form.elements["pincode"].value
            : "",
          aadhaar_no: form.elements["aadhaar_no"]
            ? form.elements["aadhaar_no"].value
            : "",
          samagra_id: form.elements["samagra_id"]
            ? form.elements["samagra_id"].value
            : "",
          pan_no: form.elements["pan_no"] ? form.elements["pan_no"].value : "",
        };
        return api("/profile", "POST", pData).then(function (res) {
          STATE.profile = res.profile;
        });
      }

      function saveDraft() {
        var formData = formToObject(
          document.getElementById("nss-service-form"),
        );
        return saveProfileFields()
          .then(function () {
            return collectDocumentIds();
          })
          .then(function (docIds) {
            return api("/applications/" + app.id, "PATCH", {
              form_data: formData,
              document_ids: docIds,
            });
          })
          .then(function () {
            // Force a fresh document load on next render so newly uploaded
            // docs appear as "have" when the page is reloaded.
            STATE.documents = null;
          });
      }

      document
        .getElementById("nss-save-draft")
        .addEventListener("click", function (e) {
          e.preventDefault();
          var btn = e.target;
          btn.disabled = true;
          saveDraft()
            .then(function () {
              toast("Draft saved.", "ok");
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            })
            .finally(function () {
              btn.disabled = false;
            });
        });

      if (config.payment_required) {
        renderPaymentSummary(app, config, {
          beforePay: function () {
            return saveDraft()
              .then(function () {
                return api("/applications/" + app.id + "/submit", "POST");
              })
              .then(function (res) {
                return res.application;
              });
          },
        });
      } else {
        document
          .getElementById("nss-service-form")
          .addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = document.getElementById("nss-submit-app");
            btn.disabled = true;
            saveDraft()
              .then(function () {
                return api("/applications/" + app.id + "/submit", "POST");
              })
              .then(function (res) {
                toast(
                  res.application.application_no
                    ? "Submitted — " + res.application.application_no
                    : "Submitted.",
                  "ok",
                );
                location.hash = "application/" + app.id;
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              })
              .finally(function () {
                btn.disabled = false;
              });
          });
      }
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderApplicationReadonly(app, config, statusLog, documents) {
  documents = documents || [];
  loadProfile().then(function (profile) {
    var fieldRows = (config.fields || [])
      .map(function (f) {
        return (
          "<div><span>" +
          esc(f.label) +
          "</span>" +
          (esc(app.form_data[f.name]) || "—") +
          "</div>"
        );
      })
      .join("");

    var profileRows = [
      ["Applicant Full Name", profile.name],
      ["Father's Name", profile.father_name],
      ["Mother's Name", profile.mother_name],
      ["Date Of Birth", profile.dob],
      ["Gender", profile.gender],
      ["Mobile Number", profile.mobile],
      ["Email Address", profile.email],
      [
        "Address",
        [
          profile.address1,
          profile.address2,
          profile.district,
          profile.state,
          profile.pincode,
        ]
          .filter(Boolean)
          .join(", "),
      ],
      ["Aadhaar Number", profile.aadhaar_no],
      ["Samagra ID", profile.samagra_id],
      ["PAN Number", profile.pan_no],
    ]
      .map(function (r) {
        return (
          "<div><span>" + esc(r[0]) + "</span>" + (esc(r[1]) || "—") + "</div>"
        );
      })
      .join("");

    var timeline =
      (statusLog || [])
        .map(function (row) {
          return (
            '<li><div><div class="t-status">' +
            esc(STATUS_LABELS[row.to_status] || row.to_status) +
            "</div>" +
            '<div class="t-meta">' +
            fmtDate(row.created_at) +
            (row.note ? " — " + esc(row.note) : "") +
            "</div></div></li>"
          );
        })
        .join("") ||
      '<li><div class="t-meta">No status history yet.</div></li>';

    var awaitingPayment = "submitted" === app.status;
    var stepperHtml = applicationStepperHtml(app.status);

    var adminStatusHtml = "";
    var isAdmin = NSS.user.isAdmin || NSS.user.canManageApplications;
    if (isAdmin) {
      var statusOptions = Object.keys(STATUS_LABELS)
        .map(function (k) {
          return (
            '<option value="' +
            k +
            '"' +
            (k === app.status ? " selected" : "") +
            ">" +
            STATUS_LABELS[k] +
            "</option>"
          );
        })
        .join("");
      adminStatusHtml =
        '<div class="nss-card nss-panel" style="margin-top:20px;">' +
        "<h2>Admin: Update Status</h2>" +
        '<div class="nss-field" style="margin-top:12px;">' +
        "<label>Application Status</label>" +
        '<div style="display:flex;gap:10px;align-items:center;margin-top:6px;">' +
        '<select class="nss-select" id="nss-detail-status" style="width:auto;">' +
        statusOptions +
        "</select>" +
        '<button class="nss-btn nss-btn-primary" id="nss-detail-save-status">Update Status</button>' +
        "</div>" +
        "</div>" +
        "</div>";
    }

    content.innerHTML =
      '<div class="nss-breadcrumb"><a href="#dashboard">Dashboard</a><span class="sep">/</span><a href="#applications">My Applications</a><span class="sep">/</span><span class="current">' +
      esc(app.application_no || "#" + app.id) +
      "</span></div>" +
      stepperHtml +
      '<div class="nss-two-col">' +
      "<div>" +
      '<div class="nss-card nss-panel">' +
      "<h2>Applicant Details</h2>" +
      '<div class="nss-autofill-grid">' +
      profileRows +
      "</div>" +
      "</div>" +
      (fieldRows
        ? '<div class="nss-card nss-panel" style="margin-top:20px;">' +
          "<h2>Service Details</h2>" +
          '<div class="nss-autofill-grid">' +
          fieldRows +
          "</div>" +
          "</div>"
        : "") +
      (documents.length
        ? '<div class="nss-card nss-panel" style="margin-top:20px;">' +
          "<h2>Uploaded Documents</h2>" +
          '<div class="nss-doc-grid" style="margin-top:14px;">' +
          documents
            .map(function (d) {
              return (
                '<div class="nss-doc-card have">' +
                '<a class="nss-doc-preview" href="' +
                restFileUrl("/documents/" + d.id + "/file") +
                '" target="_blank" rel="noopener" title="Open full size">' +
                docPreviewHtml(d) +
                "</a>" +
                '<div class="nss-doc-type">' +
                esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type) +
                "</div>" +
                '<div class="nss-doc-filename">' +
                esc(d.file_name || "") +
                "</div>" +
                '<span class="nss-badge' +
                ("verified" === d.status ? " nss-badge-on" : "") +
                '">' +
                esc(d.status) +
                "</span>" +
                "</div>"
              );
            })
            .join("") +
          "</div>" +
          "</div>"
        : "") +
      (function() {
        var fd = app.form_data || {};
        if (fd._verification_status === "success") {
          var verifiedDetails = fd._verified_details || {};
          var detailRows = Object.keys(verifiedDetails).map(function(k) {
            return '<div class="nss-vr-row"><span class="nss-vr-label">' + esc(k) + '</span><span class="nss-vr-val">' + esc(verifiedDetails[k]) + '</span></div>';
          }).join("");
          return '<div class="nss-verification-result-card">' +
            '<div class="nss-vr-header">' +
              '<div class="nss-vr-icon">✓</div>' +
              '<div><div class="nss-vr-title">Verification Successful</div>' +
              '<div class="nss-vr-sub">Verified by ' + esc(fd._provider_name || "API Provider") + '</div></div>' +
              (fd._verified_name ? '<div class="nss-vr-name">' + esc(fd._verified_name) + '</div>' : '') +
            '</div>' +
            (fd._provider_reference ? '<div class="nss-vr-ref">Transaction Ref: <strong>' + esc(fd._provider_reference) + '</strong></div>' : '') +
            (detailRows ? '<div class="nss-vr-details">' + detailRows + '</div>' : '') +
          '</div>';
        }
        return '';
      })() +
      (awaitingPayment
        ? '<div id="nss-payment-summary" style="margin-top:20px;"></div>'
        : "") +
      adminStatusHtml +
      "</div>" +
      '<div class="nss-card nss-panel"><h2>Status Timeline</h2><ul class="nss-timeline">' +
      timeline +
      "</ul></div>" +
      "</div>";

    if (awaitingPayment) {
      renderPaymentSummary(app, config);
    }

    if (isAdmin) {
      document
        .getElementById("nss-detail-save-status")
        .addEventListener("click", function () {
          var select = document.getElementById("nss-detail-status");
          var note = prompt("Optional note for this status change:", "") || "";
          api("/admin/applications/" + app.id + "/status", "POST", {
            status: select.value,
            note: note,
          })
            .then(function () {
              toast("Status updated.", "ok");
              renderApplicationDetail(app.id);
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
    }
  });
}

/**
 * options.beforePay, if given, runs first (e.g. save the draft's field/document
 * changes and submit it, which validates required fields/documents) — used
 * when this summary is embedded directly in the still-draft form editor.
 * Resolves to the up-to-date application row to pay against.
 */
function renderPaymentSummary(app, config, options) {
  options = options || {};
  var box = document.getElementById("nss-payment-summary");
  api("/wallet")
    .catch(function () {
      return { balance: 0, available: false };
    })
    .then(function (wallet) {
      var fee = parseFloat(config.amount) || 0;
      var discount = parseFloat(app.discount_amount) || 0;
      var total = Math.max(0, fee - discount);
      var canPayWallet = wallet.available && wallet.balance >= total;

      box.innerHTML =
        '<div class="nss-card nss-panel">' +
        "<h2>Payment Summary</h2>" +
        '<div class="nss-field" style="margin-bottom:16px;">' +
        "<label>Coupon Code</label>" +
        '<div style="display:flex;gap:8px;">' +
        '<input class="nss-input" type="text" id="nss-coupon-code" placeholder="Enter coupon code" value="' +
        esc(app.coupon_code || "") +
        '"' +
        (app.coupon_code ? " disabled" : "") +
        "/>" +
        (app.coupon_code
          ? '<button type="button" class="nss-btn nss-btn-sm nss-btn-danger" id="nss-coupon-remove">Remove</button>'
          : '<button type="button" class="nss-btn nss-btn-sm" id="nss-coupon-apply">Apply</button>') +
        "</div></div>" +
        '<div class="nss-payment-row"><span>Service Fee</span><strong>' +
        money(fee) +
        "</strong></div>" +
        '<div class="nss-payment-row"><span>Offer Discount</span><strong' +
        (discount > 0 ? ' class="nss-discount"' : "") +
        ">−" +
        money(discount) +
        "</strong></div>" +
        '<div class="nss-payment-row nss-payment-total"><span>Total Amount Pay</span><strong>' +
        money(total) +
        "</strong></div>" +
        (wallet.available
          ? '<div class="nss-wallet-box"><span>Wallet Amount</span><strong>' +
            money(wallet.balance || 0) +
            "</strong></div>"
          : "") +
        '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">' +
        '<button type="button" class="nss-btn nss-btn-primary" id="nss-pay-razorpay">' +
        icon("credit-card", "nss-icon-sm") +
        " Pay " +
        money(total) +
        "</button>" +
        (wallet.available
          ? '<button type="button" class="nss-btn' +
            (canPayWallet ? "" : " nss-btn-danger") +
            '" id="nss-pay-wallet"' +
            (canPayWallet ? "" : " disabled") +
            ">" +
            icon("wallet", "nss-icon-sm") +
            " Pay From Wallet</button>"
          : "") +
        "</div>" +
        (wallet.available && !canPayWallet
          ? '<div class="nss-field-hint" style="margin-top:8px;">Wallet balance is not enough to cover this total. <a href="#wallet">Add money to wallet</a></div>'
          : "") +
        "</div>";

      var couponInput = document.getElementById("nss-coupon-code");
      var applyBtn = document.getElementById("nss-coupon-apply");
      if (applyBtn) {
        applyBtn.addEventListener("click", function () {
          var code = couponInput.value.trim();
          if (!code) {
            toast("Enter a coupon code first.", "err");
            return;
          }
          applyBtn.disabled = true;
          api("/applications/" + app.id + "/apply-coupon", "POST", {
            code: code,
          })
            .then(function (res) {
              toast("Coupon applied.", "ok");
              renderPaymentSummary(res.application, config, options);
            })
            .catch(function (e) {
              toast(e.message, "err");
              applyBtn.disabled = false;
            });
        });
      }
      var removeBtn = document.getElementById("nss-coupon-remove");
      if (removeBtn) {
        removeBtn.addEventListener("click", function () {
          api("/applications/" + app.id + "/remove-coupon", "POST")
            .then(function (res) {
              toast("Coupon removed.", "ok");
              renderPaymentSummary(res.application, config, options);
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      }

      function ensureReadyThenPay(payFn) {
        if (options.beforePay) {
          return options.beforePay().then(function (freshApp) {
            return payFn(freshApp || app);
          });
        }
        return payFn(app);
      }

      document
        .getElementById("nss-pay-razorpay")
        .addEventListener("click", function (e) {
          var btn = e.currentTarget;
          btn.disabled = true;
          ensureReadyThenPay(function (freshApp) {
            return payNow(freshApp.id);
          }).catch(function (err) {
            toast(err.message, "err");
            btn.disabled = false;
          });
        });
      var walletBtn = document.getElementById("nss-pay-wallet");
      if (walletBtn && canPayWallet) {
        walletBtn.addEventListener("click", function () {
          walletBtn.disabled = true;
          ensureReadyThenPay(function (freshApp) {
            return api(
              "/applications/" + freshApp.id + "/pay-wallet",
              "POST",
            ).then(function () {
              toast("Paid from wallet.", "ok");
              location.hash = "application/" + freshApp.id;
              router();
            });
          }).catch(function (e) {
            toast(e.message, "err");
            walletBtn.disabled = false;
          });
        });
      }
    });
}

function payNow(applicationId) {
  return api("/applications/" + applicationId + "/payment-order", "POST")
    .then(function (res) {
      if (!window.Razorpay) {
        toast("Payment gateway script did not load. Please retry.", "err");
        return;
      }
      var profile = STATE.profile || {};
      var rzp = new Razorpay({
        key: res.key_id || "",
        amount: res.order.amount,
        currency: res.order.currency,
        order_id: res.order.id,
        name: "Naya Setu Services",
        description: "Service application payment",
        prefill: {
          name: profile.name || "",
          email: profile.email || "",
          contact: profile.mobile || "",
        },
        theme: { color: "#bb0b0b" },
        handler: function (response) {
          api("/applications/" + applicationId + "/payment-verify", "POST", {
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
            .then(function () {
              toast("Payment successful.", "ok");
              location.hash = "application/" + applicationId;
              router();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        },
      });
      rzp.open();
    })
    .catch(function (e) {
      toast(e.message, "err");
    });
}

// --------------------------------------------------------------- My Applications
function renderApplicationsList() {
  setTitle("My Applications");
  Promise.all([api("/applications"), loadCatalog()])
    .then(function (results) {
      var items = results[0].items;
      if (!items.length) {
        content.innerHTML =
          '<div class="nss-card">' +
          emptyState(
            "file-text",
            "No applications yet",
            "Pick a service from the Dashboard to begin.",
          ) +
          "</div>";
        return;
      }

      var STATUS_ICONS = {
        draft: "clock",
        submitted: "file-text",
        in_progress: "clock",
        pending_user: "bell",
        completed: "check-circle",
        rejected: "x-circle",
      };

      var cards = items
        .map(function (a) {
          var found = findService(a.service_key);
          var label = found ? found.service.service_label : a.service_key;
          var catIcon = found
            ? found.category.icon || "briefcase"
            : "briefcase";
          var isDraft = "draft" === a.status;
          var isCompleted = "completed" === a.status;
          var isRejected = "rejected" === a.status;
          var statusIcon = STATUS_ICONS[a.status] || "clock";

          return (
            '<div class="nss-app-card' +
            (isDraft ? " nss-app-card--draft" : "") +
            (isCompleted ? " nss-app-card--completed" : "") +
            (isRejected ? " nss-app-card--rejected" : "") +
            '">' +
            '<div class="nss-app-card__header">' +
            '<div class="nss-app-card__icon">' +
            icon(catIcon) +
            "</div>" +
            '<div class="nss-app-card__title-wrap">' +
            '<div class="nss-app-card__service">' +
            esc(label) +
            "</div>" +
            '<div class="nss-app-card__no">' +
            esc(
              a.application_no ||
                (isDraft ? "Draft — Not submitted" : "App #" + a.id),
            ) +
            "</div>" +
            "</div>" +
            statusPill(a.status) +
            "</div>" +
            '<div class="nss-app-card__meta">' +
            '<div class="nss-app-card__meta-item">' +
            icon("clock", "nss-icon-sm") +
            " <span>Applied: " +
            fmtDate(a.created_at) +
            "</span>" +
            "</div>" +
            '<div class="nss-app-card__meta-item">' +
            icon("clock", "nss-icon-sm") +
            " <span>Updated: " +
            fmtDate(a.updated_at || a.created_at) +
            "</span>" +
            "</div>" +
            "</div>" +
            '<div class="nss-app-card__footer">' +
            (isDraft
              ? '<a class="nss-btn nss-btn-primary" href="#application/' +
                a.id +
                '">' +
                icon("file-text", "nss-icon-sm") +
                " Continue Application</a>"
              : '<a class="nss-btn nss-btn-sm" href="#application/' +
                a.id +
                '">' +
                icon("chevron-right", "nss-icon-sm") +
                " Track Application</a>") +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      content.innerHTML =
        '<div class="nss-apps-page-header">' +
        "<h2>My Applications</h2>" +
        '<span class="nss-apps-count">' +
        items.length +
        " application" +
        (items.length !== 1 ? "s" : "") +
        "</span>" +
        "</div>" +
        '<div class="nss-app-cards-grid">' +
        cards +
        "</div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- My Documents
function renderDocumentsPage() {
  setTitle("My Documents");
  loadDocuments(true)
    .then(function (items) {
      var options = Object.keys(DOC_TYPE_LABELS)
        .map(function (k) {
          return (
            '<option value="' + k + '">' + DOC_TYPE_LABELS[k] + "</option>"
          );
        })
        .join("");
      var cardsHtml = items.length
        ? '<div class="nss-vault-grid">' +
          items
            .map(function (d) {
              return (
                '<div class="nss-vault-card">' +
                '<a class="nss-vault-preview" href="' +
                restFileUrl("/documents/" + d.id + "/file") +
                '" target="_blank" rel="noopener" title="Open full size">' +
                docPreviewHtml(d) +
                '<span class="nss-vault-view">' +
                icon("eye", "nss-icon-sm") +
                " View</span>" +
                "</a>" +
                '<div class="nss-vault-body">' +
                '<div class="nss-vault-type">' +
                esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type) +
                "</div>" +
                '<div class="nss-vault-filename">' +
                esc(d.file_name) +
                "</div>" +
                '<div class="nss-vault-meta">' +
                '<span class="nss-badge' +
                ("verified" === d.status ? " nss-badge-on" : "") +
                '">' +
                esc(d.status) +
                "</span>" +
                "<span>" +
                fmtDate(d.created_at) +
                "</span>" +
                "</div>" +
                '<button class="nss-btn nss-btn-sm nss-btn-danger" data-id="' +
                d.id +
                '">' +
                icon("trash", "nss-icon-sm") +
                " Delete</button>" +
                "</div>" +
                "</div>"
              );
            })
            .join("") +
          "</div>"
        : '<div class="nss-card" style="margin-top:20px;">' +
          emptyState(
            "folder",
            "No documents uploaded yet",
            "Upload once — every service reuses whatever is already here.",
          ) +
          "</div>";

      content.innerHTML =
        '<div class="nss-card nss-panel">' +
        "<h2>Upload A Document</h2>" +
        '<p class="nss-panel-sub">Upload once — every service reuses whatever is already here.</p>' +
        '<form id="nss-doc-upload" class="nss-form-grid">' +
        '<div class="nss-field"><label>Document Type</label><select class="nss-select" name="doc_type" required>' +
        options +
        "</select></div>" +
        '<div class="nss-field"><label>File (JPG/PNG/WEBP/PDF, max 5MB)</label><input class="nss-input" type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required/></div>' +
        '<div class="nss-field" style="align-self:end;"><button class="nss-btn nss-btn-primary" type="submit">' +
        icon("upload", "nss-icon-sm") +
        " Upload</button></div>" +
        "</form>" +
        "</div>" +
        '<div class="nss-section-heading" style="margin-top:26px;">My Document Vault (' +
        items.length +
        ")</div>" +
        cardsHtml;

      document
        .getElementById("nss-doc-upload")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          var form = e.target;
          var fd = new FormData(form);
          api("/documents", "POST", fd)
            .then(function () {
              toast("Document uploaded.", "ok");
              renderDocumentsPage();
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            });
        });
      content.querySelectorAll("[data-id]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm(NSS.i18n.confirmDelete)) return;
          api("/documents/" + btn.dataset.id, "DELETE")
            .then(function () {
              renderDocumentsPage();
            })
            .catch(function (e2) {
              toast(e2.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- My Profile
function renderProfilePage() {
  setTitle("My Profile");
  loadProfile(true)
    .then(function (p) {
      content.innerHTML =
        '<form id="nss-profile-form" class="nss-card nss-panel">' +
        '<h2>My Profile</h2><p class="nss-panel-sub">This is your Master Profile — every service auto-fills from here.</p>' +
        '<div class="nss-form-grid">' +
        profileFieldsHtml(p) +
        "</div>" +
        '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:20px;">Save Profile</button>' +
        "</form>";
      wireProfileForm(
        document.getElementById("nss-profile-form"),
        function () {},
      );
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Notifications / Payment History
function renderNotifications() {
  setTitle("Notifications");
  api("/notifications")
    .then(function (res) {
      var rows =
        res.items
          .map(function (n) {
            return (
              "<tr><td>" +
              esc(n.message) +
              "</td><td>" +
              fmtDate(n.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="2" class="nss-empty">No notifications yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Message</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- My Wallet
function renderWalletPage() {
  setTitle("My Wallet");
  api("/wallet/transactions")
    .then(function (res) {
      if (!res.available) {
        content.innerHTML =
          '<div class="nss-card">' +
          emptyState(
            "wallet",
            "Wallet not available yet",
            "The wallet becomes active once the courier wallet system is set up on this site.",
          ) +
          "</div>";
        return;
      }

      var txRows = (res.items || [])
        .map(function (t) {
          var isCredit = "credit" === t.type;
          return (
            '<div class="nss-tx-row">' +
            '<div class="nss-tx-icon ' +
            (isCredit ? "nss-tx-icon--credit" : "nss-tx-icon--debit") +
            '">' +
            icon(isCredit ? "plus" : "arrow-left") +
            "</div>" +
            '<div class="nss-tx-main">' +
            '<div class="nss-tx-note">' +
            esc(t.note || (isCredit ? "Money added" : "Payment")) +
            "</div>" +
            '<div class="nss-tx-date">' +
            fmtDate(t.created_at) +
            "</div>" +
            "</div>" +
            '<div class="nss-tx-amounts">' +
            '<div class="nss-tx-amount ' +
            (isCredit ? "nss-tx-amount--credit" : "nss-tx-amount--debit") +
            '">' +
            (isCredit ? "+" : "−") +
            money(t.amount) +
            "</div>" +
            '<div class="nss-tx-balance">Bal: ' +
            money(t.balance_after) +
            "</div>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      content.innerHTML =
        '<div class="nss-wallet-layout">' +
        '<div class="nss-wallet-main">' +
        '<div class="nss-wallet-hero">' +
        '<div class="nss-wallet-hero-icon">' +
        icon("wallet") +
        "</div>" +
        '<div class="nss-wallet-hero-label">Available Balance</div>' +
        '<div class="nss-wallet-hero-amount">' +
        money(res.balance) +
        "</div>" +
        '<div class="nss-wallet-hero-sub">One wallet across Services &amp; Courier — pay for any application instantly.</div>' +
        "</div>" +
        '<div class="nss-card nss-panel" style="margin-top:20px;">' +
        "<h2>Transaction History</h2>" +
        '<p class="nss-panel-sub">Latest 50 wallet entries.</p>' +
        (txRows ||
          emptyState(
            "receipt",
            "No transactions yet",
            "Add money or pay for a service to see entries here.",
          )) +
        "</div>" +
        "</div>" +
        '<div class="nss-wallet-side">' +
        '<div class="nss-card nss-panel">' +
        "<h2>Add Money</h2>" +
        '<p class="nss-panel-sub">Top up securely via Razorpay (UPI, card, netbanking).</p>' +
        '<div class="nss-topup-chips">' +
        [200, 500, 1000, 2000]
          .map(function (v) {
            return (
              '<button type="button" class="nss-topup-chip" data-amount="' +
              v +
              '">₹' +
              v +
              "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="nss-field" style="margin-top:14px;"><label>Amount (₹)</label>' +
        '<input class="nss-input" type="number" id="nss-topup-amount" min="1" max="100000" step="1" placeholder="Enter amount"/></div>' +
        '<button class="nss-btn nss-btn-primary nss-btn-block" id="nss-topup-btn" style="margin-top:14px;">' +
        icon("plus", "nss-icon-sm") +
        " Add Money</button>" +
        '<div class="nss-help" style="margin-top:10px;">Minimum ₹1 — maximum ₹1,00,000 per top-up.</div>' +
        "</div>" +
        "</div>" +
        "</div>";

      var amountInput = document.getElementById("nss-topup-amount");
      content.querySelectorAll(".nss-topup-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          amountInput.value = chip.dataset.amount;
          content.querySelectorAll(".nss-topup-chip").forEach(function (c) {
            c.classList.toggle("active", c === chip);
          });
        });
      });

      document
        .getElementById("nss-topup-btn")
        .addEventListener("click", function (e) {
          var btn = e.currentTarget;
          var amount = parseFloat(amountInput.value);
          if (!amount || amount < 1) {
            toast("Enter an amount of at least ₹1.", "err");
            return;
          }
          btn.disabled = true;
          walletTopup(amount).finally(function () {
            btn.disabled = false;
          });
        });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

/** Razorpay checkout for a wallet top-up; on success credits the wallet and refreshes the page. */
function walletTopup(amount) {
  return api("/wallet/topup-order", "POST", { amount: amount })
    .then(function (res) {
      if (!window.Razorpay) {
        toast("Payment gateway script did not load. Please retry.", "err");
        return;
      }
      var profile = STATE.profile || {};
      var rzp = new Razorpay({
        key: res.key_id || "",
        amount: res.order.amount,
        currency: res.order.currency,
        order_id: res.order.id,
        name: "Naya Setu Services",
        description: "Wallet top-up",
        prefill: {
          name: profile.name || "",
          email: profile.email || "",
          contact: profile.mobile || "",
        },
        theme: { color: "#bb0b0b" },
        handler: function (response) {
          api("/wallet/topup-verify", "POST", {
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
            .then(function (verifyRes) {
              toast("₹" + amount + " added to your wallet.", "ok");
              if ("wallet" === location.hash.replace("#", "")) {
                renderWalletPage();
              }
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        },
      });
      rzp.open();
    })
    .catch(function (e) {
      toast(e.message, "err");
    });
}

function renderPaymentHistory() {
  setTitle("Payment History");
  api("/payments")
    .then(function (res) {
      var rows =
        res.items
          .map(function (p) {
            return (
              "<tr><td>" +
              esc(p.order_id) +
              "</td><td>" +
              money(p.amount) +
              '</td><td><span class="nss-badge' +
              ("paid" === p.status ? " nss-badge-on" : "") +
              '">' +
              esc(p.status) +
              "</span></td><td>" +
              fmtDate(p.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="4" class="nss-empty">No payments yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Applications
function renderAdminApplications() {
  setTitle("All Applications");
  Promise.all([api("/admin/applications"), loadCatalog()])
    .then(function (results) {
      var items = results[0].items;
      if (!items.length) {
        content.innerHTML =
          '<div class="nss-card">' +
          emptyState(
            "briefcase",
            "No applications yet",
            "No submissions received from users yet.",
          ) +
          "</div>";
        return;
      }

      var statusOptions = Object.keys(STATUS_LABELS)
        .map(function (k) {
          return '<option value="' + k + '">' + STATUS_LABELS[k] + "</option>";
        })
        .join("");

      var cards = items
        .map(function (a) {
          var found = findService(a.service_key);
          var label = found ? found.service.service_label : a.service_key;
          var catIcon = found
            ? found.category.icon || "briefcase"
            : "briefcase";
          var isCompleted = "completed" === a.status;
          var isRejected = "rejected" === a.status;

          var selectHtml =
            '<select class="nss-select nss-status-select" data-id="' +
            a.id +
            '">' +
            statusOptions.replace(
              'value="' + a.status + '"',
              'value="' + a.status + '" selected',
            ) +
            "</select>";

          return (
            '<div class="nss-app-card nss-app-card--admin' +
            (isCompleted ? " nss-app-card--completed" : "") +
            (isRejected ? " nss-app-card--rejected" : "") +
            '">' +
            '<div class="nss-app-card__header">' +
            '<div class="nss-app-card__icon">' +
            icon(catIcon) +
            "</div>" +
            '<div class="nss-app-card__title-wrap">' +
            '<div class="nss-app-card__service">' +
            esc(label) +
            "</div>" +
            '<div class="nss-app-card__no">' +
            esc(a.application_no || "App #" + a.id) +
            "</div>" +
            "</div>" +
            statusPill(a.status) +
            "</div>" +
            '<div class="nss-app-card__meta">' +
            '<div class="nss-app-card__meta-item">' +
            icon("user", "nss-icon-sm") +
            " <span>User #" +
            esc(String(a.user_id)) +
            "</span>" +
            "</div>" +
            '<div class="nss-app-card__meta-item">' +
            icon("clock", "nss-icon-sm") +
            " <span>" +
            fmtDate(a.created_at) +
            "</span>" +
            "</div>" +
            "</div>" +
            '<div class="nss-app-card__admin-controls">' +
            '<div class="nss-app-card__status-wrap">' +
            selectHtml +
            '<button class="nss-btn nss-btn-primary nss-btn-sm nss-save-status" data-id="' +
            a.id +
            '">' +
            icon("check", "nss-icon-sm") +
            " Update</button>" +
            "</div>" +
            '<a class="nss-btn nss-btn-sm nss-app-card__view-link" href="#application/' +
            a.id +
            '">' +
            icon("chevron-right", "nss-icon-sm") +
            " View Detail</a>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      content.innerHTML =
        '<div class="nss-apps-page-header">' +
        "<h2>All Applications</h2>" +
        '<span class="nss-apps-count">' +
        items.length +
        " submission" +
        (items.length !== 1 ? "s" : "") +
        "</span>" +
        "</div>" +
        '<div class="nss-app-cards-grid">' +
        cards +
        "</div>";

      content.querySelectorAll(".nss-save-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var select = content.querySelector(
            '.nss-status-select[data-id="' + btn.dataset.id + '"]',
          );
          var note = prompt("Optional note for this status change:", "") || "";
          btn.disabled = true;
          api("/admin/applications/" + btn.dataset.id + "/status", "POST", {
            status: select.value,
            note: note,
          })
            .then(function () {
              toast("Status updated.", "ok");
              renderAdminApplications();
            })
            .catch(function (e) {
              toast(e.message, "err");
              btn.disabled = false;
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Document Verification
function renderAdminDocuments() {
  setTitle("Document Verification");
  api("/admin/documents")
    .then(function (res) {
      var cards = res.items
        .map(function (d) {
          return (
            '<div class="nss-vault-card">' +
            '<a class="nss-vault-preview" href="' +
            restFileUrl("/documents/" + d.id + "/file") +
            '" target="_blank" rel="noopener" title="Open full size">' +
            docPreviewHtml(d) +
            '<span class="nss-vault-view">' +
            icon("eye", "nss-icon-sm") +
            " View</span>" +
            "</a>" +
            '<div class="nss-vault-body">' +
            '<div class="nss-vault-type">' +
            esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type) +
            "</div>" +
            '<div class="nss-vault-filename">' +
            esc(d.display_name || "User #" + d.user_id) +
            "</div>" +
            '<div class="nss-vault-meta"><span>' +
            fmtDate(d.created_at) +
            "</span></div>" +
            '<div class="nss-vault-actions">' +
            '<button class="nss-btn nss-btn-sm" data-id="' +
            d.id +
            '" data-action="verified">' +
            icon("check", "nss-icon-sm") +
            " Verify</button>" +
            '<button class="nss-btn nss-btn-sm nss-btn-danger" data-id="' +
            d.id +
            '" data-action="rejected">' +
            icon("x-circle", "nss-icon-sm") +
            " Reject</button>" +
            "</div>" +
            "</div>" +
            "</div>"
          );
        })
        .join("");

      content.innerHTML = cards
        ? '<div class="nss-apps-page-header">' +
          "<h2>Pending Verification</h2>" +
          '<span class="nss-apps-count">' +
          res.items.length +
          " document" +
          (res.items.length !== 1 ? "s" : "") +
          "</span>" +
          "</div>" +
          '<div class="nss-vault-grid">' +
          cards +
          "</div>"
        : '<div class="nss-card">' +
          emptyState(
            "shield-check",
            "All caught up",
            "No documents pending verification.",
          ) +
          "</div>";

      content.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          api("/admin/documents/" + btn.dataset.id + "/verify", "POST", {
            status: btn.dataset.action,
          })
            .then(function () {
              toast("Document " + btn.dataset.action + ".", "ok");
              renderAdminDocuments();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Service Config
function renderAdminServiceConfig() {
  setTitle("Service Config");
  api("/admin/service-config")
    .then(function (res) {
      var groups = [];
      var byKey = {};
      res.items.forEach(function (s) {
        if (!byKey[s.category_key]) {
          byKey[s.category_key] = {
            key: s.category_key,
            label: s.category_label,
            icon: s.category_icon || "briefcase",
            items: [],
          };
          groups.push(byKey[s.category_key]);
        }
        byKey[s.category_key].items.push(s);
      });

      var CATEGORY_ICONS = [
        "briefcase",
        "id-card",
        "bank",
        "car",
        "scale",
        "package",
        "landmark",
        "laptop",
        "home",
        "shield-check",
        "file-text",
        "folder",
        "globe",
        "heart",
        "receipt",
        "wallet",
        "users",
        "settings",
      ];

      function iconOptionsHtml(selected) {
        return CATEGORY_ICONS.map(function (i) {
          return (
            '<option value="' +
            i +
            '"' +
            (i === selected ? " selected" : "") +
            ">" +
            i +
            "</option>"
          );
        }).join("");
      }

      function slugify(s) {
        return String(s || "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      }

      function fieldRowHtml(f) {
        return (
          '<div class="nss-fb-row">' +
          '<div class="nss-fb-cell">' +
          '<input class="nss-input nss-fb-name" placeholder="Key e.g. loan_amount" value="' +
          esc(f.name || "") +
          '"/>' +
          "</div>" +
          '<div class="nss-fb-cell">' +
          '<input class="nss-input nss-fb-label" placeholder="Label for user" value="' +
          esc(f.label || "") +
          '"/>' +
          "</div>" +
          '<div class="nss-fb-cell nss-fb-cell--type">' +
          '<select class="nss-select nss-fb-type">' +
          ["text", "number", "email", "tel", "date", "select", "textarea"]
            .map(function (t) {
              return (
                '<option value="' +
                t +
                '"' +
                (f.type === t ? " selected" : "") +
                ">" +
                t +
                "</option>"
              );
            })
            .join("") +
          "</select>" +
          "</div>" +
          '<div class="nss-fb-cell nss-fb-cell--req">' +
          '<label class="nss-switch nss-switch--sm" title="Required">' +
          '<input type="checkbox" class="nss-fb-required"' +
          (f.required ? " checked" : "") +
          "/><span></span>" +
          "</label>" +
          "</div>" +
          '<button type="button" class="nss-fb-remove" title="Remove field">' +
          icon("x", "nss-icon-sm") +
          "</button>" +
          "</div>"
        );
      }

      function cfgCardHtml(s) {
        var docChecks = Object.keys(DOC_TYPE_LABELS)
          .map(function (k) {
            var on = (s.required_documents || []).indexOf(k) !== -1;
            return (
              '<label class="nss-cfg-doc-chip' +
              (on ? " on" : "") +
              '">' +
              '<input type="checkbox" class="f-doc" value="' +
              k +
              '"' +
              (on ? " checked" : "") +
              "/>" +
              DOC_TYPE_LABELS[k] +
              "</label>"
            );
          })
          .join("");

        var existingFields = s.fields || [];
        return (
          '<div class="nss-cfg-card" data-key="' +
          esc(s.service_key) +
          '" data-label="' +
          esc(String(s.service_label).toLowerCase()) +
          '">' +
          '<div class="nss-cfg-card-head">' +
          '<button type="button" class="nss-cfg-card-toggle">' +
          '<span class="nss-cfg-card-icon">' +
          icon(serviceIcon(s.service_key, "briefcase")) +
          "</span>" +
          '<span class="nss-cfg-card-title"><strong>' +
          esc(s.service_label) +
          "</strong><code>" +
          esc(s.service_key) +
          "</code></span>" +
          '<span class="nss-cfg-card-caret">' +
          icon("chevron-right", "nss-icon-sm") +
          "</span>" +
          "</button>" +
          '<label class="nss-switch" title="Active \u2014 shown to customers">' +
          '<input type="checkbox" class="f-active"' +
          (Number(s.active) ? " checked" : "") +
          "/><span></span></label>" +
          "</div>" +
          '<div class="nss-cfg-card-body">' +
          '<div class="nss-cfg-grid">' +
          '<div class="nss-field"><label>Paid Service</label>' +
          '<label class="nss-switch"><input type="checkbox" class="f-payment"' +
          (Number(s.payment_required) ? " checked" : "") +
          "/><span></span></label></div>" +
          '<div class="nss-field"><label>Amount (\u20b9)</label>' +
          '<input class="nss-input f-amount" type="number" step="0.01" min="0" value="' +
          esc(s.amount) +
          '"/></div>' +
          '<div class="nss-field"><label>Workflow</label>' +
          '<select class="nss-select f-workflow">' +
          '<option value="manual"' +
          ("manual" === s.workflow_mode ? " selected" : "") +
          ">Manual</option>" +
          '<option value="api"' +
          ("api" === s.workflow_mode ? " selected" : "") +
          ">API</option>" +
          "</select></div>" +
          '<div class="nss-field"><label>API Provider Key</label>' +
          '<input class="nss-input f-provider" value="' +
          esc(s.api_provider_key) +
          '" placeholder="e.g. pan_protean"/></div>' +
          "</div>" +
          '<div class="nss-field" style="margin-top:12px;"><label>Required Documents</label>' +
          '<div class="nss-cfg-docs">' +
          docChecks +
          "</div></div>" +
          '<div class="nss-field" style="margin-top:16px;">' +
          '<div class="nss-fb-header">' +
          "<label>Form Fields</label>" +
          '<button type="button" class="nss-fb-add nss-btn nss-btn-sm">' +
          icon("plus", "nss-icon-sm") +
          " Add Field</button>" +
          "</div>" +
          '<div class="nss-fb-table">' +
          '<div class="nss-fb-thead"><span>Key (name)</span><span>Label</span><span>Type</span><span>Req?</span><span></span></div>' +
          '<div class="nss-fb-body">' +
          (existingFields.length
            ? existingFields.map(fieldRowHtml).join("")
            : '<div class="nss-fb-empty">No fields yet \u2014 click <strong>+ Add Field</strong> to start.</div>') +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div class="nss-cfg-actions">' +
          '<button class="nss-btn nss-btn-sm nss-btn-danger nss-del-config" data-key="' +
          esc(s.service_key) +
          '" data-label="' +
          esc(s.service_label) +
          '">' +
          icon("x-circle", "nss-icon-sm") +
          " Delete</button>" +
          '<button class="nss-btn nss-btn-primary nss-btn-sm nss-save-config">' +
          icon("check", "nss-icon-sm") +
          " Save Changes</button>" +
          "</div>" +
          "</div>" +
          "</div>"
        );
      }

      function addSubFormHtml(g) {
        return (
          '<div class="nss-cfg-inline-form nss-cfg-add-sub-form" data-category="' +
          esc(g.key) +
          '" style="display:none;">' +
          '<div class="nss-field"><label>New subcategory name (under ' +
          esc(g.label) +
          ")</label>" +
          '<input class="nss-input nc-sub-label" type="text" placeholder="e.g. Two Wheeler License"/></div>' +
          '<div class="nss-cfg-inline-form-actions">' +
          '<button type="button" class="nss-btn nss-btn-sm nss-cfg-cancel-sub">Cancel</button>' +
          '<button type="button" class="nss-btn nss-btn-primary nss-btn-sm nss-cfg-create-sub" data-category="' +
          esc(g.key) +
          '" data-label="' +
          esc(g.label) +
          '" data-icon="' +
          esc(g.icon) +
          '">' +
          icon("plus", "nss-icon-sm") +
          " Add Subcategory</button>" +
          "</div>" +
          "</div>"
        );
      }

      var sectionsHtml = groups
        .map(function (g, i) {
          return (
            '<div class="nss-cfg-section' +
            (0 === i ? " open" : "") +
            '" data-category="' +
            esc(g.key) +
            '">' +
            '<div class="nss-cfg-section-head">' +
            '<button type="button" class="nss-cfg-section-toggle">' +
            '<span class="nss-cfg-section-icon">' +
            icon(g.icon) +
            "</span>" +
            "<strong>" +
            esc(g.label) +
            "</strong>" +
            '<span class="nss-apps-count">' +
            g.items.length +
            " services</span>" +
            '<span class="nss-cfg-caret">' +
            icon("chevron-right", "nss-icon-sm") +
            "</span>" +
            "</button>" +
            '<div class="nss-cfg-section-tools">' +
            '<button type="button" class="nss-btn nss-btn-sm nss-cfg-toggle-add-sub" data-category="' +
            esc(g.key) +
            '" title="Add subcategory">' +
            icon("plus", "nss-icon-sm") +
            " Add</button>" +
            '<button type="button" class="nss-btn nss-btn-sm nss-btn-danger nss-cfg-del-category" data-category="' +
            esc(g.key) +
            '" data-label="' +
            esc(g.label) +
            '" title="Delete category">' +
            icon("x-circle", "nss-icon-sm") +
            "</button>" +
            "</div>" +
            "</div>" +
            '<div class="nss-cfg-section-body"><div class="nss-cfg-cards">' +
            addSubFormHtml(g) +
            g.items.map(cfgCardHtml).join("") +
            "</div></div>" +
            "</div>"
          );
        })
        .join("");

      var addCategoryFormHtml =
        '<div class="nss-cfg-inline-form" id="nss-cfg-add-category-form" style="display:none;">' +
        '<div class="nss-cfg-grid">' +
        '<div class="nss-field"><label>Category name</label>' +
        '<input class="nss-input" id="nc-cat-label" type="text" placeholder="e.g. Insurance"/></div>' +
        '<div class="nss-field"><label>Icon</label>' +
        '<select class="nss-select" id="nc-cat-icon">' +
        iconOptionsHtml("briefcase") +
        "</select></div>" +
        '<div class="nss-field"><label>First subcategory name</label>' +
        '<input class="nss-input" id="nc-cat-sub-label" type="text" placeholder="e.g. Vehicle Insurance"/></div>' +
        "</div>" +
        '<div class="nss-cfg-inline-form-actions">' +
        '<button type="button" class="nss-btn nss-btn-sm" id="nss-cfg-cancel-category">Cancel</button>' +
        '<button type="button" class="nss-btn nss-btn-primary nss-btn-sm" id="nss-cfg-create-category">' +
        icon("plus", "nss-icon-sm") +
        " Create Category</button>" +
        "</div>" +
        "</div>";

      content.innerHTML =
        '<div class="nss-cfg-toolbar">' +
        '<p class="nss-panel-sub" style="margin:0;">Every field here is stored in the database — adding or changing a service never requires a code change.</p>' +
        '<div class="nss-search-wrap" style="margin:0;max-width:320px;">' +
        icon("search") +
        '<input type="text" class="nss-search-input" id="nss-cfg-search" placeholder="Find a service…" autocomplete="off"/>' +
        "</div>" +
        '<button type="button" class="nss-btn nss-btn-primary nss-btn-sm" id="nss-cfg-toggle-add-category">' +
        icon("plus", "nss-icon-sm") +
        " Add Category</button>" +
        "</div>" +
        addCategoryFormHtml +
        sectionsHtml;

      content
        .querySelectorAll(".nss-cfg-section-toggle")
        .forEach(function (toggle) {
          toggle.addEventListener("click", function () {
            var section = toggle.closest(".nss-cfg-section");
            var willOpen = !section.classList.contains("open");
            content
              .querySelectorAll(".nss-cfg-section.open")
              .forEach(function (s) {
                s.classList.remove("open");
              });
            if (willOpen) section.classList.add("open");
          });
        });

      // Subcategory cards: collapsed by default, one open at a time per category.
      content
        .querySelectorAll(".nss-cfg-card-toggle")
        .forEach(function (toggle) {
          toggle.addEventListener("click", function () {
            var card = toggle.closest(".nss-cfg-card");
            var cardsWrap = card.closest(".nss-cfg-cards");
            var willOpen = !card.classList.contains("open");
            cardsWrap
              .querySelectorAll(".nss-cfg-card.open")
              .forEach(function (c) {
                c.classList.remove("open");
              });
            if (willOpen) card.classList.add("open");
          });
        });

      // ---- Add Category ----
      var addCatForm = document.getElementById("nss-cfg-add-category-form");
      document
        .getElementById("nss-cfg-toggle-add-category")
        .addEventListener("click", function () {
          addCatForm.style.display =
            "none" === addCatForm.style.display ? "flex" : "none";
        });
      document
        .getElementById("nss-cfg-cancel-category")
        .addEventListener("click", function () {
          addCatForm.style.display = "none";
        });
      document
        .getElementById("nss-cfg-create-category")
        .addEventListener("click", function (e) {
          var catLabel = document.getElementById("nc-cat-label").value.trim();
          var subLabel = document
            .getElementById("nc-cat-sub-label")
            .value.trim();
          var catIcon = document.getElementById("nc-cat-icon").value;
          if (!catLabel || !subLabel) {
            toast(
              "Category name and first subcategory name are both required.",
              "err",
            );
            return;
          }
          var catKey = slugify(catLabel);
          var subKey = catKey + "_" + slugify(subLabel);
          e.target.disabled = true;
          api("/admin/service-config", "POST", {
            category_key: catKey,
            category_label: catLabel,
            category_icon: catIcon,
            service_key: subKey,
            service_label: subLabel,
          })
            .then(function () {
              toast("Category created.", "ok");
              STATE.catalog = null;
              renderAdminServiceConfig();
            })
            .catch(function (err) {
              toast(err.message, "err");
              e.target.disabled = false;
            });
        });

      // ---- Add Subcategory (per section) ----
      content
        .querySelectorAll(".nss-cfg-toggle-add-sub")
        .forEach(function (btn) {
          btn.addEventListener("click", function () {
            var form = content.querySelector(
              '.nss-cfg-add-sub-form[data-category="' +
                btn.dataset.category +
                '"]',
            );
            form.style.display =
              "none" === form.style.display ? "flex" : "none";
          });
        });
      content.querySelectorAll(".nss-cfg-cancel-sub").forEach(function (btn) {
        btn.addEventListener("click", function () {
          btn.closest(".nss-cfg-add-sub-form").style.display = "none";
        });
      });
      content.querySelectorAll(".nss-cfg-create-sub").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var form = btn.closest(".nss-cfg-add-sub-form");
          var subLabel = form.querySelector(".nc-sub-label").value.trim();
          if (!subLabel) {
            toast("Subcategory name is required.", "err");
            return;
          }
          var subKey = btn.dataset.category + "_" + slugify(subLabel);
          btn.disabled = true;
          api("/admin/service-config", "POST", {
            category_key: btn.dataset.category,
            category_label: btn.dataset.label,
            category_icon: btn.dataset.icon,
            service_key: subKey,
            service_label: subLabel,
          })
            .then(function () {
              toast("Subcategory added.", "ok");
              STATE.catalog = null;
              renderAdminServiceConfig();
            })
            .catch(function (err) {
              toast(err.message, "err");
              btn.disabled = false;
            });
        });
      });

      // ---- Delete category ----
      content.querySelectorAll(".nss-cfg-del-category").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (
            !confirm(
              'Delete category "' +
                btn.dataset.label +
                '" and all its subcategories? This cannot be undone.',
            )
          ) {
            return;
          }
          btn.disabled = true;
          api(
            "/admin/service-config/category/" + btn.dataset.category,
            "DELETE",
          )
            .then(function () {
              toast("Category deleted.", "ok");
              STATE.catalog = null;
              renderAdminServiceConfig();
            })
            .catch(function (err) {
              toast(err.message, "err");
              btn.disabled = false;
            });
        });
      });

      // ---- Delete subcategory (service) ----
      content.querySelectorAll(".nss-del-config").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (
            !confirm(
              'Delete subcategory "' +
                btn.dataset.label +
                '"? This cannot be undone.',
            )
          ) {
            return;
          }
          btn.disabled = true;
          api("/admin/service-config/" + btn.dataset.key, "DELETE")
            .then(function () {
              toast("Subcategory deleted.", "ok");
              STATE.catalog = null;
              renderAdminServiceConfig();
            })
            .catch(function (err) {
              toast(err.message, "err");
              btn.disabled = false;
            });
        });
      });

      document
        .getElementById("nss-cfg-search")
        .addEventListener("input", function (e) {
          var q = e.target.value.trim().toLowerCase();
          content
            .querySelectorAll(".nss-cfg-section")
            .forEach(function (section) {
              var any = false;
              section
                .querySelectorAll(".nss-cfg-card")
                .forEach(function (card) {
                  var match =
                    !q ||
                    card.dataset.label.indexOf(q) !== -1 ||
                    card.dataset.key.indexOf(q) !== -1;
                  card.style.display = match ? "" : "none";
                  if (match) any = true;
                });
              section.style.display = any ? "" : "none";
              if (q && any) section.classList.add("open");
            });
        });

      // Toggle the visual state of the doc chips as they're checked.
      content
        .querySelectorAll(".nss-cfg-doc-chip input")
        .forEach(function (cb) {
          cb.addEventListener("change", function () {
            cb.closest(".nss-cfg-doc-chip").classList.toggle("on", cb.checked);
          });
        });

      // Field builder: Add Field button (delegated)
      content.addEventListener("click", function (e) {
        var addBtn = e.target.closest(".nss-fb-add");
        if (addBtn) {
          var body = addBtn.closest(".nss-field").querySelector(".nss-fb-body");
          var empty = body.querySelector(".nss-fb-empty");
          if (empty) empty.remove();
          var tmp = document.createElement("div");
          tmp.innerHTML = fieldRowHtml({
            name: "",
            label: "",
            type: "text",
            required: false,
          });
          body.appendChild(tmp.firstChild);
          return;
        }
        var removeBtn = e.target.closest(".nss-fb-remove");
        if (removeBtn) {
          var row = removeBtn.closest(".nss-fb-row");
          var body2 = row.closest(".nss-fb-body");
          row.remove();
          if (!body2.querySelector(".nss-fb-row")) {
            body2.innerHTML =
              '<div class="nss-fb-empty">No fields yet — click <strong>+ Add Field</strong> to start.</div>';
          }
          return;
        }
      });

      content.querySelectorAll(".nss-save-config").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var card = btn.closest(".nss-cfg-card");

          // Collect fields from the visual field builder rows
          var fields = [];
          card.querySelectorAll(".nss-fb-row").forEach(function (row) {
            var name = row.querySelector(".nss-fb-name").value.trim();
            var label = row.querySelector(".nss-fb-label").value.trim();
            var type = row.querySelector(".nss-fb-type").value;
            var required = row.querySelector(".nss-fb-required").checked;
            if (name) {
              fields.push({
                name: name,
                label: label || name,
                type: type,
                required: required,
              });
            }
          });

          var docs = [];
          card.querySelectorAll(".f-doc:checked").forEach(function (cb) {
            docs.push(cb.value);
          });
          var payload = {
            active: card.querySelector(".f-active").checked ? 1 : 0,
            payment_required: card.querySelector(".f-payment").checked ? 1 : 0,
            amount: parseFloat(card.querySelector(".f-amount").value) || 0,
            workflow_mode: card.querySelector(".f-workflow").value,
            api_provider_key: card.querySelector(".f-provider").value.trim(),
            required_documents: docs,
            fields: fields,
          };
          btn.disabled = true;
          api("/admin/service-config/" + card.dataset.key, "PATCH", payload)
            .then(function () {
              toast(
                card.querySelector(".nss-cfg-card-title strong").textContent +
                  " saved.",
                "ok",
              );
              STATE.catalog = null;
            })
            .catch(function (e) {
              toast(e.message, "err");
            })
            .finally(function () {
              btn.disabled = false;
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Payments / Reports / API Logs / Associates
function renderAdminPayments() {
  setTitle("Payments");
  api("/admin/payments")
    .then(function (res) {
      var rows =
        res.items
          .map(function (p) {
            return (
              "<tr><td>" +
              esc(p.display_name || "User #" + p.user_id) +
              "</td><td>" +
              esc(p.order_id) +
              "</td><td>" +
              money(p.amount) +
              '</td><td><span class="nss-badge' +
              ("paid" === p.status ? " nss-badge-on" : "") +
              '">' +
              esc(p.status) +
              "</span></td><td>" +
              fmtDate(p.created_at) +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No payments yet.</td></tr>';

      content.innerHTML =
        '<div class="nss-two-col">' +
        "<div>" +
        '<div class="nss-card nss-panel" style="margin-top:0;">' +
        "<h2>Payment History</h2>" +
        '<p class="nss-panel-sub">Recent transaction and application fee history.</p>' +
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>User</th><th>Order</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>" +
        "</div>" +
        "</div>" +
        "<div>" +
        '<div class="nss-card nss-panel" style="margin-top:0;">' +
        "<h2>Wallet Top-up &amp; Adjust</h2>" +
        '<p class="nss-panel-sub">Manually credit or debit a user\'s wallet ledger.</p>' +
        '<form id="nss-admin-wallet-form" class="nss-form-grid" style="display:flex;flex-direction:column;gap:14px;">' +
        '<div class="nss-field"><label>User ID</label><input class="nss-input" type="number" name="user_id" required placeholder="e.g. 42"/></div>' +
        '<div class="nss-field"><label>Adjustment Type</label><select class="nss-select" name="type" required><option value="credit">Credit (+) Add Money</option><option value="debit">Debit (-) Deduct Money</option></select></div>' +
        '<div class="nss-field"><label>Amount (₹)</label><input class="nss-input" type="number" min="0.01" step="0.01" name="amount" required placeholder="e.g. 500"/></div>' +
        '<div class="nss-field"><label>Note / Reason</label><input class="nss-input" type="text" name="note" required placeholder="e.g. Cash deposit received"/></div>' +
        '<button class="nss-btn nss-btn-primary nss-btn-block" type="submit" style="margin-top:6px;">' +
        icon("wallet", "nss-icon-sm") +
        " Update Balance</button>" +
        "</form>" +
        "</div>" +
        "</div>" +
        "</div>";

      var form = document.getElementById("nss-admin-wallet-form");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        var payload = {
          user_id: parseInt(form.elements["user_id"].value, 10),
          type: form.elements["type"].value,
          amount: parseFloat(form.elements["amount"].value),
          note: form.elements["note"].value,
        };

        api("/admin/wallet/adjust", "POST", payload)
          .then(function (res2) {
            toast(res2.message || "Wallet updated successfully.", "ok");
            form.reset();
            renderAdminPayments(); // Refresh list to see the update
          })
          .catch(function (err) {
            toast(err.message, "err");
            btn.disabled = false;
          });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderAdminReports() {
  setTitle("Reports");
  api("/admin/reports")
    .then(function (res) {
      var summaryHtml =
        '<div class="nss-stats">' +
        '<div class="nss-stat">' +
        '<div class="nss-stat-label">Total Submissions</div>' +
        '<div class="nss-stat-value">' +
        res.total_applications +
        "</div>" +
        '<div class="nss-stat-hint">Excludes drafts</div>' +
        "</div>" +
        '<div class="nss-stat">' +
        '<div class="nss-stat-label">Submissions (' +
        esc(res.month_label) +
        ")</div>" +
        '<div class="nss-stat-value">' +
        res.month_applications +
        "</div>" +
        "</div>" +
        '<div class="nss-stat nss-stat--drafts">' +
        '<div class="nss-stat-label">WIP Drafts</div>' +
        '<div class="nss-stat-value">' +
        res.draft_count +
        "</div>" +
        '<div class="nss-stat-hint">Not counted in totals</div>' +
        "</div>" +
        '<div class="nss-stat nss-stat--revenue">' +
        '<div class="nss-stat-label">Total Revenue</div>' +
        '<div class="nss-stat-value">' +
        money(res.total_revenue).replace(".00", "") +
        "</div>" +
        "</div>" +
        '<div class="nss-stat nss-stat--revenue">' +
        '<div class="nss-stat-label">Revenue (' +
        esc(res.month_label) +
        ")</div>" +
        '<div class="nss-stat-value">' +
        money(res.month_revenue).replace(".00", "") +
        "</div>" +
        "</div>" +
        "</div>";

      var statusCards =
        res.by_status
          .map(function (r) {
            return (
              '<div class="nss-stat">' +
              '<div class="nss-stat-label">' +
              esc(STATUS_LABELS[r.status] || r.status) +
              "</div>" +
              '<div class="nss-stat-value">' +
              r.cnt +
              "</div>" +
              "</div>"
            );
          })
          .join("") || '<div class="nss-empty">No status details yet.</div>';

      var statusBreakdownHtml =
        '<div class="nss-card nss-panel" style="margin-top:20px;">' +
        "<h2>Submissions by Status</h2>" +
        '<p class="nss-panel-sub">Volume breakdown of submitted applications.</p>' +
        '<div class="nss-stats" style="margin-top:14px;grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">' +
        statusCards +
        "</div>" +
        "</div>";

      var svcRows =
        res.by_service
          .map(function (r) {
            var found = findService(r.service_key);
            return (
              "<tr><td>" +
              esc(found ? found.service.service_label : r.service_key) +
              "</td><td><strong>" +
              r.cnt +
              "</strong></td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="2" class="nss-empty">No applications yet.</td></tr>';

      var serviceBreakdownHtml =
        '<div class="nss-card nss-panel" style="margin-top:20px;">' +
        "<h2>Submissions by Service Type</h2>" +
        '<p class="nss-panel-sub">Top 20 services sorted by application volume.</p>' +
        '<div class="nss-tablewrap" style="margin-top:12px;">' +
        '<table class="nss-table"><thead><tr><th>Service</th><th>Applications</th></tr></thead><tbody>' +
        svcRows +
        "</tbody></table>" +
        "</div>" +
        "</div>";

      content.innerHTML =
        summaryHtml + statusBreakdownHtml + serviceBreakdownHtml;
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderAdminApiLogs() {
  setTitle("API Logs");
  api("/admin/api-logs")
    .then(function (res) {
      var rows =
        res.items
          .map(function (l) {
            var details = "";
            if (l.response_json) {
              try {
                details = JSON.stringify(JSON.parse(l.response_json), null, 2);
              } catch (e) {
                details = l.response_json;
              }
            }
            return (
              "<tr><td>#" +
              esc(l.id) +
              "</td><td>" +
              esc(l.context) +
              '</td><td><span class="nss-badge' +
              ("error" === l.level ? "" : " nss-badge-on") +
              '">' +
              esc(l.level) +
              "</span></td><td>" +
              esc(l.message) +
              "</td><td>" +
              fmtDateTime(l.created_at) +
              "</td><td>" +
              (details
                ? '<details class="nss-log-details"><summary>View details</summary><pre>' +
                  esc(details) +
                  "</pre></details>"
                : "—") +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="6" class="nss-empty">No log entries yet.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Log ID</th><th>Context</th><th>Level</th><th>Message</th><th>Date / Time</th><th>Details</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

function renderAdminAssociates() {
  setTitle("Associates");
  api("/admin/associates")
    .then(function (res) {
      var rows =
        res.items
          .map(function (a) {
            return (
              "<tr><td>" +
              esc(a.name) +
              "</td><td>" +
              esc(a.email) +
              "</td><td>" +
              esc(a.mobile) +
              "</td><td>" +
              esc(a.associate_code) +
              "</td>" +
              '<td><button class="nss-btn nss-btn-sm" data-id="' +
              a.id +
              '" data-action="approve">Approve</button> ' +
              '<button class="nss-btn nss-btn-sm nss-btn-danger" data-id="' +
              a.id +
              '" data-action="reject">Reject</button></td></tr>'
            );
          })
          .join("") ||
        '<tr><td colspan="5" class="nss-empty">No pending Associate applications.</td></tr>';
      content.innerHTML =
        '<div class="nss-tablewrap"><table class="nss-table"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Code</th><th>Action</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";

      content.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          api(
            "/admin/associates/" + btn.dataset.id + "/" + btn.dataset.action,
            "POST",
          )
            .then(function () {
              toast("Done.", "ok");
              renderAdminAssociates();
            })
            .catch(function (e) {
              toast(e.message, "err");
            });
        });
      });
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

// --------------------------------------------------------------- Admin: Settings
function renderAdminSettings() {
  setTitle("Settings");
  api("/settings")
    .then(function (res) {
      var s = res.settings;
      content.innerHTML =
        '<div class="nss-settings-tabs">' +
        '<button class="nss-tab-btn active" data-tab="general">General</button>' +
        '<button class="nss-tab-btn" data-tab="payments">Payments</button>' +
        '<button class="nss-tab-btn" data-tab="notify">Notify</button>' +
        '<button class="nss-tab-btn" data-tab="providers">API Providers</button>' +
        "</div>" +
        '<div id="nss-settings-panel"></div>';

      function paint(tab) {
        var panel = document.getElementById("nss-settings-panel");
        if ("general" === tab) {
          panel.innerHTML =
            '<form id="nss-settings-form" class="nss-card nss-panel"><h2>General</h2>' +
            '<div class="nss-form-grid"><div class="nss-field"><label>Courier Portal URL</label><input class="nss-input" name="courier_portal_url" value="' +
            esc(s.courier_portal_url) +
            '"/><div class="nss-field-hint">Where Courier services in this dashboard redirect to.</div></div></div>' +
            '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:16px;">Save</button></form>';
          panel.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            api("/settings", "POST", {
              courier_portal_url: e.target.courier_portal_url.value,
            })
              .then(function () {
                toast("Saved.", "ok");
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              });
          });
        } else if ("payments" === tab) {
          panel.innerHTML =
            '<form id="nss-settings-form" class="nss-card nss-panel"><h2>Payments (Razorpay)</h2>' +
            '<div class="nss-form-grid">' +
            '<div class="nss-field"><label class="nss-checkbox"><input type="checkbox" name="razorpay_enabled" ' +
            (Number(s.payments.razorpay_enabled) ? "checked" : "") +
            "/> Enabled</label></div>" +
            '<div class="nss-field"><label>Key ID</label><input class="nss-input" name="razorpay_key_id" value="' +
            esc(s.payments.razorpay_key_id) +
            '"/></div>' +
            '<div class="nss-field"><label>Key Secret</label><input class="nss-input" type="password" name="razorpay_key_secret" placeholder="Leave blank to keep existing"/></div>' +
            '</div><button class="nss-btn nss-btn-primary" type="submit" style="margin-top:16px;">Save</button></form>';
          panel.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            var f = e.target;
            var payload = {
              payments: {
                razorpay_enabled: f.razorpay_enabled.checked ? 1 : 0,
                razorpay_key_id: f.razorpay_key_id.value,
              },
            };
            if (f.razorpay_key_secret.value)
              payload.payments.razorpay_key_secret =
                f.razorpay_key_secret.value;
            api("/settings", "POST", payload)
              .then(function () {
                toast("Saved.", "ok");
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              });
          });
        } else if ("notify" === tab) {
          panel.innerHTML =
            '<form id="nss-settings-form" class="nss-card nss-panel"><h2>SMS / WhatsApp</h2>' +
            '<div class="nss-form-grid">' +
            '<div class="nss-field"><label>SMS Provider</label><input class="nss-input" name="sms_provider" value="' +
            esc(s.notify.sms_provider) +
            '"/></div>' +
            '<div class="nss-field"><label>SMS API Key</label><input class="nss-input" name="sms_api_key" value="' +
            esc(s.notify.sms_api_key) +
            '"/></div>' +
            '<div class="nss-field"><label>WhatsApp Provider</label><input class="nss-input" name="whatsapp_provider" value="' +
            esc(s.notify.whatsapp_provider) +
            '"/></div>' +
            '<div class="nss-field"><label>WhatsApp API Key</label><input class="nss-input" name="whatsapp_api_key" value="' +
            esc(s.notify.whatsapp_api_key) +
            '"/></div>' +
            '</div><p class="nss-help">Without a provider configured, status-change notifications are logged only (no fake send).</p>' +
            '<button class="nss-btn nss-btn-primary" type="submit" style="margin-top:16px;">Save</button></form>';
          panel.querySelector("form").addEventListener("submit", function (e) {
            e.preventDefault();
            api("/settings", "POST", { notify: formToObject(e.target) })
              .then(function () {
                toast("Saved.", "ok");
              })
              .catch(function (e2) {
                toast(e2.message, "err");
              });
          });
        } else if ("providers" === tab) {
          var cards = Object.keys(s.providers || {})
            .map(function (key) {
              var p = s.providers[key];
              var configured =
                res.providers_status &&
                res.providers_status[key] &&
                res.providers_status[key].configured;
              var extra = "";
              if (key === "decentro_banking") {
                extra =
                  '<div class="nss-field nss-provider-wide"><label>Base URL</label><input class="nss-input p-base-url" value="' +
                  esc(p.base_url || "https://in.staging.decentro.tech") +
                  '"/></div>' +
                  '<div class="nss-field"><label>Banking Module Secret</label><input class="nss-input p-module-secret" type="password" placeholder="Leave blank to keep existing"/></div>' +
                  '<div class="nss-field"><label>Provider Secret</label><input class="nss-input p-provider-secret" type="password" placeholder="Required by Decentro — leave blank only to keep the saved value"/></div>';
              } else if (key === "sandbox") {
                extra =
                  '<div class="nss-field nss-provider-wide"><label>Base URL</label><input class="nss-input p-base-url" value="' +
                  esc(p.base_url || "https://api.sandbox.co.in") +
                  '"/></div>';
              } else if (key === "turtlefin_insurance") {
                extra =
                  '<div class="nss-field nss-provider-wide"><label>Sandbox Base URL</label><input class="nss-input p-base-url" value="' +
                  esc(p.base_url || "") +
                  '" placeholder="Copy from Turtlefin Developer Portal"/></div>' +
                  '<div class="nss-field"><label>Token Path</label><input class="nss-input p-token-path" value="' +
                  esc(p.token_path || "/v1/token/issue") +
                  '"/></div>' +
                  '<div class="nss-field nss-provider-wide"><label>Quote Payload Templates (JSON)</label><textarea class="nss-input p-quote-templates" rows="8" spellcheck="false" placeholder="Add only product payloads copied from Turtlefin sandbox docs">' +
                  esc(p.quote_payload_templates || "") +
                  '</textarea><span class="nss-provider-codehint">Use one JSON object with product keys such as bike and private-car.</span></div>';
              }
              return (
                '<section class="nss-provider-card" data-key="' +
                key +
                '"><div class="nss-provider-head"><div><h3>' +
                esc(p.label) +
                '</h3><p class="nss-field-hint">Credentials are stored securely. Saved secrets are never displayed again.</p></div><span class="nss-badge' +
                (configured ? " nss-badge-on" : "") +
                '">' +
                (configured ? "Configured" : "Manual Workflow") +
                '</span></div><div class="nss-provider-fields">' +
                '<div class="nss-field"><label>Enabled</label><label class="nss-provider-toggle"><input type="checkbox" class="p-enabled" ' +
                (Number(p.enabled) ? "checked" : "") +
                "/> Use this provider</label></div>" +
                '<div class="nss-field"><label>API Key / Client ID</label><input class="nss-input p-key" value="' +
                esc(p.api_key) +
                '" autocomplete="off"/></div>' +
                '<div class="nss-field"><label>API Secret</label><input class="nss-input p-secret" type="password" placeholder="Saved securely — enter only to replace" autocomplete="new-password"/></div>' +
                extra +
                '</div><button class="nss-btn nss-save-provider">Save ' +
                esc(p.label) +
                "</button></section>"
              );
            })
            .join("");
          panel.innerHTML =
            '<div class="nss-card nss-panel"><h2>API Providers</h2><p class="nss-panel-sub">Until a provider is configured here, every service using it runs in Manual Workflow mode — an operator processes it by hand.</p>' +
            '<div class="nss-provider-grid">' +
            cards +
            "</div></div>";
          panel.querySelectorAll(".nss-save-provider").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var card = btn.closest(".nss-provider-card");
              var key = card.dataset.key;
              var payload = { providers: {} };
              payload.providers[key] = {
                enabled: card.querySelector(".p-enabled").checked ? 1 : 0,
                api_key: card.querySelector(".p-key").value,
              };
              var secret = card.querySelector(".p-secret").value;
              if (secret) payload.providers[key].api_secret = secret;
              var baseUrl = card.querySelector(".p-base-url");
              var moduleSecret = card.querySelector(".p-module-secret");
              var providerSecret = card.querySelector(".p-provider-secret");
              var tokenPath = card.querySelector(".p-token-path");
              var quoteTemplates = card.querySelector(".p-quote-templates");
              if (baseUrl)
                payload.providers[key].base_url = baseUrl.value.trim();
              if (moduleSecret && moduleSecret.value)
                payload.providers[key].module_secret = moduleSecret.value;
              if (providerSecret && providerSecret.value)
                payload.providers[key].provider_secret = providerSecret.value;
              if (tokenPath)
                payload.providers[key].token_path = tokenPath.value.trim();
              if (quoteTemplates) {
                try {
                  JSON.parse(quoteTemplates.value || "{}");
                } catch (e3) {
                  toast("Quote payload templates must be valid JSON.", "err");
                  return;
                }
                payload.providers[key].quote_payload_templates =
                  quoteTemplates.value.trim();
              }
              api("/settings", "POST", payload)
                .then(function () {
                  toast("Saved.", "ok");
                })
                .catch(function (e2) {
                  toast(e2.message, "err");
                });
            });
          });
        }
      }
      content.querySelectorAll(".nss-tab-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          content.querySelectorAll(".nss-tab-btn").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
          paint(btn.dataset.tab);
        });
      });
      paint("general");
    })
    .catch(function (e) {
      content.innerHTML = errorBox(e);
    });
}

router();
