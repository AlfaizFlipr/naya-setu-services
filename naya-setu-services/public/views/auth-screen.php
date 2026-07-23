<?php

if (!defined('ABSPATH')) {
	exit;
}

$error = isset($_GET['nss_error']) ? sanitize_key($_GET['nss_error']) : '';
$custom_msg = isset($_GET['nss_msg']) ? sanitize_text_field(rawurldecode(wp_unslash($_GET['nss_msg']))) : '';
$pending = isset($_GET['nss_pending']);
$errors = array(
	'invalid' => 'Please fill all required fields correctly (password must be at least 6 characters).',
	'exists' => 'An account with this email or mobile number already exists — please log in instead.',
	'failed' => 'Could not create your account. Please try again.',
	'login' => 'Incorrect email/mobile or password.',
	'nss_code_taken' => 'That Associate Code is already taken — please choose another.',
	'pending' => $custom_msg ?: 'Your account needs admin approval before you can log in.',
);
$referral_code = isset($_GET['ref']) ? sanitize_text_field(wp_unslash($_GET['ref'])) : '';

$reset_key = isset($_GET['key']) ? sanitize_text_field(wp_unslash($_GET['key'])) : '';
$reset_login = isset($_GET['login']) ? sanitize_text_field(wp_unslash($_GET['login'])) : '';
$is_reset_screen = 'resetpass' === ($_GET['nss_action'] ?? '') && $reset_key && $reset_login;
$reset_key_valid = $is_reset_screen && !is_wp_error(check_password_reset_key($reset_key, $reset_login));
?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<div class="nss-app">
	<div class="nss-auth-wrap">
		<div class="nss-auth-card">
			<div class="nss-auth-logo">
				<img class="nss-brand-logo"
					src="<?php echo esc_url(NSS_PLUGIN_URL . 'public/assets/img/naya-setu-logo.webp'); ?>"
					alt="Naya Setu" style="width:52px;height:52px;" />
				<div>
					<strong style="font-size:16px;">Naya Setu Services</strong>
					<div style="font-size:11.5px;color:#6b7280;">Every service. One dashboard.</div>
				</div>
			</div>

			<?php if ($is_reset_screen): ?>

				<!-- ============================= SET NEW PASSWORD ============================= -->
				<?php if (!$reset_key_valid): ?>
					<div class="nss-auth-notice nss-auth-notice-error">This reset link is invalid or has expired. Please request
						a new one from the Login tab.</div>
					<a class="nss-btn nss-btn-block" href="<?php echo esc_url(home_url('/')); ?>">Back to Login</a>
				<?php else: ?>
					<?php if ($error && ($custom_msg || isset($errors[$error]))): ?>
						<div class="nss-auth-notice nss-auth-notice-error"><?php echo esc_html($custom_msg ?: $errors[$error]); ?>
						</div>
					<?php endif; ?>
					<form method="post" class="nss-auth-form">
						<input type="hidden" name="nss_action" value="resetpass" />
						<input type="hidden" name="key" value="<?php echo esc_attr($reset_key); ?>" />
						<input type="hidden" name="login" value="<?php echo esc_attr($reset_login); ?>" />
						<?php wp_nonce_field('nss_resetpass', 'nss_resetpass_nonce'); ?>
						<div class="nss-field">
							<label>New Password <span class="req">*</span></label>
							<input class="nss-input" type="password" name="password" minlength="6" required />
						</div>
						<div class="nss-field">
							<label>Confirm New Password <span class="req">*</span></label>
							<input class="nss-input" type="password" name="password2" minlength="6" required />
						</div>
						<button type="submit" class="nss-btn nss-btn-go nss-btn-block">Set New Password</button>
					</form>
				<?php endif; ?>

			<?php else: ?>

				<?php if ($pending): ?>
					<div class="nss-auth-notice nss-auth-notice-info">
						<?php echo esc_html($custom_msg ?: 'Your Associate account has been submitted for admin approval. You will be able to log in once approved.'); ?>
					</div>
				<?php elseif (isset($_GET['nss_forgot_sent'])): ?>
					<div class="nss-auth-notice nss-auth-notice-info">If that email/mobile matches an account, a password reset
						link has been sent.</div>
				<?php elseif (isset($_GET['nss_reset_done'])): ?>
					<div class="nss-auth-notice nss-auth-notice-info">Your password has been reset — you can log in now.</div>
				<?php elseif ($error && ($custom_msg || isset($errors[$error]))): ?>
					<div class="nss-auth-notice nss-auth-notice-error"><?php echo esc_html($custom_msg ?: $errors[$error]); ?>
					</div>
				<?php endif; ?>

				<div class="nss-auth-tabs">
					<div class="nss-auth-tab active" data-tab="login" onclick="nssAuthTab('login')">Log In</div>
					<div class="nss-auth-tab" data-tab="register" onclick="nssAuthTab('register')">Sign Up</div>
				</div>

				<!-- ============================= LOG IN ============================= -->
				<form method="post" class="nss-auth-form" id="nss-login-form">
					<input type="hidden" name="nss_action" value="login" />
					<?php wp_nonce_field('nss_login', 'nss_login_nonce'); ?>

					<div class="nss-field">
						<label>User Type</label>
						<select class="nss-input" name="expected_role" id="nss-login-role">
							<option value="">Select Role</option>
							<option value="nsc_customer">User</option>
							<option value="nsc_associate">Associate</option>
							<option value="nsc_operator">Employee</option>
							<option value="administrator">Admin</option>
						</select>
					</div>

					<div class="nss-field">
						<label>Email / Mobile</label>
						<input class="nss-input" type="text" name="email" id="nss-login-identity"
							placeholder="Enter your email or mobile" required />
					</div>

					<div class="nss-auth-pill-toggle">
						<div class="nss-auth-pill active" data-method="password" onclick="nssLoginMethod('password')">
							Password</div>
						<div class="nss-auth-pill" data-method="otp" onclick="nssLoginMethod('otp')">OTP</div>
					</div>

					<div class="nss-field" id="nss-login-password-wrap">
						<label>Password</label>
						<input class="nss-input" type="password" name="password" id="nss-login-password"
							placeholder="Enter password" />
					</div>

					<div id="nss-login-otp-wrap" style="display:none;">
						<div id="nss-login-recaptcha"></div>
						<button type="button" class="nss-btn nss-btn-block" id="nss-login-send-otp"
							onclick="nssSendOtp('login')"><?php echo NSS_Icons::get('phone'); ?> Send OTP</button>
						<div class="nss-field" id="nss-login-otp-code-wrap" style="display:none;margin-top:12px;">
							<label>Enter OTP</label>
							<input class="nss-input" type="text" inputmode="numeric" maxlength="6" id="nss-login-otp-code"
								placeholder="6-digit code" />
							<div class="nss-field-hint" id="nss-login-otp-expiry"></div>
						</div>
					</div>

					<div class="nss-auth-msg" id="nss-login-msg"></div>

					<div style="text-align:right;margin:6px 0 14px;">
						<a href="#" class="nss-auth-link" onclick="nssToggleForgot(event)">Forgot Password?</a>
					</div>

					<button type="submit" class="nss-btn nss-btn-go nss-btn-block" id="nss-login-submit">Login</button>
				</form>

				<!-- ============================= FORGOT PASSWORD (inline) ============================= -->
				<form method="post" class="nss-auth-form" id="nss-forgot-form" style="display:none;">
					<input type="hidden" name="nss_action" value="forgot" />
					<?php wp_nonce_field('nss_forgot', 'nss_forgot_nonce'); ?>
					<div class="nss-field">
						<label>Enter your registered email or mobile</label>
						<input class="nss-input" type="text" name="identity" placeholder="Email or mobile" required />
					</div>
					<button type="submit" class="nss-btn nss-btn-go nss-btn-block">Send Reset Link</button>
					<button type="button" class="nss-btn-linklike" onclick="nssToggleForgot(event)">Back to Login</button>
				</form>

				<!-- ============================= SIGN UP ============================= -->
				<form method="post" class="nss-auth-form" id="nss-register-form" style="display:none;">
					<input type="hidden" name="nss_action" value="register" />
					<?php wp_nonce_field('nss_register', 'nss_register_nonce'); ?>

					<div class="nss-field">
						<label>User Type</label>
						<select class="nss-input" name="role" id="nss-reg-role" onchange="nssRegRoleChange()">
							<option value="customer">User</option>
							<option value="associate">Associate</option>
						</select>
					</div>

					<div class="nss-form-grid-2">
						<div class="nss-field">
							<label>Full Name <span class="req">*</span></label>
							<input class="nss-input" type="text" name="name" placeholder="Enter your name" required />
						</div>
						<div class="nss-field">
							<label>Mobile Number <span class="req">*</span></label>
							<input class="nss-input" type="tel" name="mobile" id="nss-reg-mobile" pattern="[6-9][0-9]{9}"
								placeholder="Enter mobile number" required />
						</div>
					</div>

					<div class="nss-form-grid-2">
						<div class="nss-field">
							<label>Email <span class="req">*</span></label>
							<input class="nss-input" type="email" name="email" placeholder="Enter your email" required />
						</div>
						<div class="nss-field">
							<label>Create Password <span class="req">*</span></label>
							<input class="nss-input" type="password" name="password" id="nss-reg-password" minlength="6"
								placeholder="Create password" required />
						</div>
					</div>

					<div class="nss-field">
						<label>Confirm Password <span class="req">*</span></label>
						<input class="nss-input" type="password" id="nss-reg-password-confirm" minlength="6"
							placeholder="Confirm password" required />
					</div>

					<div class="nss-field" id="nss-reg-associate-wrap" style="display:none;">
						<label>Associate Code <span class="req">*</span></label>
						<input class="nss-input" type="text" name="associate_code"
							placeholder="Choose a unique associate code" />
						<div class="nss-field-hint">This is the code you'll share with your referrals — e.g. ASSOC-RAHUL01.
						</div>
					</div>
					<div class="nss-field" id="nss-reg-referral-wrap">
						<label>Associate / Referral Code (Optional)</label>
						<input class="nss-input" type="text" name="referral_code"
							value="<?php echo esc_attr($referral_code); ?>" placeholder="Have a referral code?" />
					</div>

					<div id="nss-reg-recaptcha"></div>
					<button type="button" class="nss-btn nss-btn-otp nss-btn-block" id="nss-reg-send-otp"
						onclick="nssSendOtp('register')"><?php echo NSS_Icons::get('phone'); ?> Send OTP</button>
					<div class="nss-field" id="nss-reg-otp-code-wrap" style="display:none;margin-top:12px;">
						<label>Enter OTP</label>
						<input class="nss-input" type="text" inputmode="numeric" maxlength="6" id="nss-reg-otp-code"
							placeholder="6-digit code" />
						<div class="nss-field-hint" id="nss-reg-otp-expiry"></div>
						<button type="button" class="nss-btn nss-btn-sm" style="margin-top:8px;"
							onclick="nssVerifyOtp('register')">Verify Code</button>
					</div>

					<div class="nss-auth-msg" id="nss-register-msg"></div>

					<label class="nss-checkbox" style="margin:14px 0;">
						<input type="checkbox" id="nss-reg-terms" required /> I agree to the <a href="#"
							class="nss-auth-link">Terms &amp; Conditions</a>
					</label>

					<button type="submit" class="nss-btn nss-btn-go nss-btn-block" id="nss-register-submit">Sign Up</button>
					<button type="button" class="nss-btn-linklike" id="nss-reg-skip-otp" onclick="nssSkipOtp()">Skip phone
						verification, sign up with password only</button>
				</form>

			<?php endif; ?>
		</div>
	</div>
</div>
<script>
	function nssAuthTab(tab) {
		document.querySelectorAll('.nss-auth-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
		document.getElementById('nss-login-form').style.display = tab === 'login' && !nssForgotOpen ? 'block' : 'none';
		document.getElementById('nss-register-form').style.display = tab === 'register' ? 'block' : 'none';
		if ('register' === tab) { nssForgotOpen = false; document.getElementById('nss-forgot-form').style.display = 'none'; }
	}
	var nssForgotOpen = false;
	function nssToggleForgot(e) {
		if (e) e.preventDefault();
		nssForgotOpen = !nssForgotOpen;
		document.getElementById('nss-forgot-form').style.display = nssForgotOpen ? 'block' : 'none';
		document.getElementById('nss-login-form').style.display = nssForgotOpen ? 'none' : 'block';
	}
<?php if ($pending || 'pending' === $error): ?>nssAuthTab('login'); <?php endif; ?>
</script>