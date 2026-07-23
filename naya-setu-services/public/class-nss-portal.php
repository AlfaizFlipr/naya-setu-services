<?php

if (!defined('ABSPATH')) {
	exit;
}

class NSS_Portal
{
	public function __construct()
	{
		add_action('wp_enqueue_scripts', array($this, 'maybe_enqueue'));
		add_action('init', array($this, 'handle_auth_actions'));
		add_filter('template_include', array($this, 'maybe_full_page_template'));
	}

	/** Same full-screen-app technique as naya-setu-courier's NSC_Portal — no theme header/footer. */
	public function maybe_full_page_template($template)
	{
		$post = get_post();
		if (!$post instanceof WP_Post) {
			return $template;
		}
		if (!has_shortcode($post->post_content, 'nayasetu_services')) {
			return $template;
		}
		add_filter('show_admin_bar', '__return_false');
		return NSS_PLUGIN_DIR . 'public/views/app-template.php';
	}

	public static function render($atts = array())
	{
		if (!is_user_logged_in()) {
			ob_start();
			include NSS_PLUGIN_DIR . 'public/views/auth-screen.php';
			return ob_get_clean();
		}

		ob_start();
		include NSS_PLUGIN_DIR . 'public/views/portal-shell.php';
		return ob_get_clean();
	}

	public function maybe_enqueue()
	{
		if (!is_a(get_post(), 'WP_Post')) {
			return;
		}
		global $post;
		if (!$post || !has_shortcode($post->post_content, 'nayasetu_services')) {
			return;
		}

		wp_enqueue_style('nss-google-font', 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap', array(), null);
		wp_enqueue_style('nss-portal', NSS_PLUGIN_URL . 'public/assets/portal.css', array(), NSS_VERSION);

		if (is_user_logged_in()) {
			wp_enqueue_script('nss-portal', NSS_PLUGIN_URL . 'public/assets/portal.js', array(), NSS_VERSION, true);
			$this->localize();
			wp_enqueue_script('nss-razorpay-checkout', 'https://checkout.razorpay.com/v1/checkout.js', array(), null, true);
		} else {
			wp_enqueue_style('nss-auth', NSS_PLUGIN_URL . 'public/assets/auth.css', array('nss-portal'), NSS_VERSION);
			wp_enqueue_script('nss-firebase-app', 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js', array(), null, true);
			wp_enqueue_script('nss-firebase-auth', 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js', array('nss-firebase-app'), null, true);
			wp_enqueue_script('nss-auth', NSS_PLUGIN_URL . 'public/assets/auth.js', array('nss-firebase-auth'), NSS_VERSION, true);
			wp_localize_script('nss-auth', 'NSS_AUTH', array(
				'root' => esc_url_raw(rest_url(NSS_Rest::NS)),
				'nonce' => wp_create_nonce('wp_rest'),
				'home' => home_url('/'),
				'firebase' => NSS_Settings::get('firebase', array()),
			));
		}
	}

	protected function localize()
	{
		$user = wp_get_current_user();
		wp_localize_script('nss-portal', 'NSS', array(
			'root' => esc_url_raw(rest_url(NSS_Rest::NS)),
			'nonce' => wp_create_nonce('wp_rest'),
			'home' => home_url('/'),
			'courierPortalUrl' => NSS_Settings::get('courier_portal_url', home_url('/courier/')),
			'razorpayEnabled' => NSS_Razorpay::is_configured(),
			'user' => array(
				'id' => $user->ID,
				'name' => $user->display_name,
				'initial' => strtoupper(substr($user->display_name, 0, 1)),
				'canManageApplications' => user_can($user, 'nss_manage_applications') || user_can($user, 'nss_view_all_applications'),
				'canVerifyDocuments' => user_can($user, 'nss_verify_documents'),
				'canManageServiceConfig' => user_can($user, 'nss_manage_service_config'),
				'canViewReports' => user_can($user, 'nss_view_reports'),
				'isAdmin' => user_can($user, 'nss_manage_settings'),
			),
			'i18n' => array(
				'confirmDelete' => __('Remove this document?', 'naya-setu-services'),
			),
		));
	}

	public function handle_auth_actions()
	{
		if (isset($_POST['nss_action']) && 'register' === $_POST['nss_action'] && isset($_POST['nss_register_nonce'])) {
			$this->handle_register();
		}
		if (isset($_POST['nss_action']) && 'login' === $_POST['nss_action'] && isset($_POST['nss_login_nonce'])) {
			$this->handle_login();
		}
		if (isset($_POST['nss_action']) && 'forgot' === $_POST['nss_action'] && isset($_POST['nss_forgot_nonce'])) {
			$this->handle_forgot_password();
		}
		if (isset($_POST['nss_action']) && 'resetpass' === $_POST['nss_action'] && isset($_POST['nss_resetpass_nonce'])) {
			$this->handle_reset_password();
		}
	}

	protected function handle_forgot_password()
	{
		if (!wp_verify_nonce($_POST['nss_forgot_nonce'], 'nss_forgot')) {
			return;
		}
		$identity = sanitize_text_field($_POST['identity'] ?? '');
		$user = is_email($identity) ? get_user_by('email', $identity) : null;
		if (!$user) {
			$user = NSS_Auth::find_by_mobile($identity);
		}

		if ($user) {
			add_filter('retrieve_password_message', array($this, 'filter_reset_message'), 10, 4);
			retrieve_password($user->user_login);
			remove_filter('retrieve_password_message', array($this, 'filter_reset_message'), 10);
		}

		$this->redirect_back(array('nss_forgot_sent' => '1'));
	}

	public function filter_reset_message($message, $key, $user_login, $user_data)
	{
		$url = add_query_arg(array('nss_action' => 'resetpass', 'key' => $key, 'login' => rawurlencode($user_login)), home_url('/'));
		return sprintf(
			/* translators: %1$s site name, %2$s reset link */
			__("Someone requested a password reset for your %1\$s account.\n\nIf this was you, set a new password here:\n%2\$s\n\nIf you didn't request this, you can ignore this email.", 'naya-setu-services'),
			get_bloginfo('name'),
			$url
		);
	}

	protected function handle_reset_password()
	{
		if (!wp_verify_nonce($_POST['nss_resetpass_nonce'], 'nss_resetpass')) {
			return;
		}
		$key = sanitize_text_field($_POST['key'] ?? '');
		$login = sanitize_text_field($_POST['login'] ?? '');
		$password = (string) ($_POST['password'] ?? '');
		$password2 = (string) ($_POST['password2'] ?? '');

		$user = check_password_reset_key($key, $login);
		if (is_wp_error($user)) {
			$this->redirect_back(array('nss_error' => 'login', 'nss_msg' => rawurlencode('This reset link is invalid or has expired. Please request a new one.')));
		}
		if (strlen($password) < 6 || $password !== $password2) {
			$this->redirect_back(array(
				'nss_action' => 'resetpass',
				'key' => $key,
				'login' => rawurlencode($login),
				'nss_error' => 'invalid',
				'nss_msg' => rawurlencode('Passwords must match and be at least 6 characters.'),
			));
		}

		reset_password($user, $password);
		$this->redirect_back(array('nss_reset_done' => '1'));
	}

	protected function redirect_back($args = array())
	{
		$url = add_query_arg($args, wp_get_referer() ?: home_url('/'));
		wp_safe_redirect($url);
		exit;
	}

	protected function handle_register()
	{
		if (!wp_verify_nonce($_POST['nss_register_nonce'], 'nss_register')) {
			return;
		}

		$result = NSS_Auth::create_account(array(
			'name' => $_POST['name'] ?? '',
			'email' => $_POST['email'] ?? '',
			'mobile' => $_POST['mobile'] ?? '',
			'password' => $_POST['password'] ?? '',
			'role' => $_POST['role'] ?? 'customer',
			'associate_code' => $_POST['associate_code'] ?? '',
			'referral_code' => $_POST['referral_code'] ?? '',
		));
		if (is_wp_error($result)) {
			$this->redirect_back(array('nss_error' => $result->get_error_code(), 'nss_msg' => rawurlencode($result->get_error_message())));
		}

		if ($result['pending']) {
			$this->redirect_back(array('nss_pending' => '1'));
		}

		$session = NSS_Auth::start_session_or_error($result['user_id']);
		if (is_wp_error($session)) {
			$this->redirect_back(array('nss_pending' => '1'));
		}
		$this->redirect_back();
	}

	protected function handle_login()
	{
		if (!wp_verify_nonce($_POST['nss_login_nonce'], 'nss_login')) {
			return;
		}

		$identity = sanitize_text_field($_POST['email'] ?? '');
		$login = $identity;
		if ($identity && !is_email($identity)) {
			$by_mobile = NSS_Auth::find_by_mobile($identity);
			if ($by_mobile) {
				$login = $by_mobile->user_login;
			}
		}

		$creds = array(
			'user_login' => $login,
			'user_password' => (string) ($_POST['password'] ?? ''),
			'remember' => true,
		);
		$user = wp_signon($creds, false);
		if (is_wp_error($user)) {
			$this->redirect_back(array('nss_error' => 'login'));
		}

		if (in_array('nsc_associate', $user->roles, true) && !NSS_Associate::is_approved($user->ID)) {
			wp_logout();
			$status = NSS_Associate::status($user->ID);
			$this->redirect_back(array(
				'nss_error' => 'pending',
				'nss_msg' => rawurlencode(
					'rejected' === $status
					? 'Your Associate application was not approved. Contact support for details.'
					: 'Your Associate account is awaiting admin approval.'
				)
			));
		}

		$expected_role = sanitize_key($_POST['expected_role'] ?? '');
		if ($expected_role && !in_array($expected_role, $user->roles, true)) {
			wp_logout();
			$this->redirect_back(array('nss_error' => 'login', 'nss_msg' => rawurlencode('This account is not registered as the selected role.')));
		}

		$this->redirect_back();
	}
}
