<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * nss/v1 — every route the public dashboard (public/assets/portal.js) talks
 * to, including the in-dashboard admin/operator routes under /admin/* (no
 * wp-admin login required — gated purely by WP capability on the logged-in
 * user, same as naya-setu-courier's Reports/Associates/Settings routes being
 * plain sidebar links inside its own portal.js).
 */
class NSS_Rest
{
	const NS = 'nss/v1';

	public function register()
	{
		register_rest_route(self::NS, '/catalog', array(
			'methods' => 'GET',
			'callback' => array($this, 'catalog_tree'),
			'permission_callback' => '__return_true',
		));

		register_rest_route(self::NS, '/profile', array(
			array('methods' => 'GET', 'callback' => array($this, 'profile_get'), 'permission_callback' => array($this, 'require_login')),
			array('methods' => 'POST', 'callback' => array($this, 'profile_update'), 'permission_callback' => array($this, 'require_login')),
		));

		register_rest_route(self::NS, '/dashboard-stats', array(
			'methods' => 'GET',
			'callback' => array($this, 'dashboard_stats'),
			'permission_callback' => array($this, 'require_login'),
		));

		register_rest_route(self::NS, '/documents', array(
			array('methods' => 'GET', 'callback' => array($this, 'documents_list'), 'permission_callback' => array($this, 'require_login')),
			array('methods' => 'POST', 'callback' => array($this, 'documents_upload'), 'permission_callback' => array($this, 'require_login')),
		));
		register_rest_route(self::NS, '/documents/(?P<id>\d+)', array(
			'methods' => 'DELETE',
			'callback' => array($this, 'documents_delete'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/documents/(?P<id>\d+)/file', array(
			'methods' => 'GET',
			'callback' => array($this, 'documents_file'),
			'permission_callback' => array($this, 'require_login'),
		));

		register_rest_route(self::NS, '/applications', array(
			array('methods' => 'GET', 'callback' => array($this, 'applications_list'), 'permission_callback' => array($this, 'require_login')),
			array('methods' => 'POST', 'callback' => array($this, 'applications_create'), 'permission_callback' => array($this, 'require_login')),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)', array(
			array('methods' => 'GET', 'callback' => array($this, 'applications_get'), 'permission_callback' => array($this, 'require_login')),
			array('methods' => 'PATCH', 'callback' => array($this, 'applications_save_draft'), 'permission_callback' => array($this, 'require_login')),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)/submit', array(
			'methods' => 'POST',
			'callback' => array($this, 'applications_submit'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)/payment-order', array(
			'methods' => 'POST',
			'callback' => array($this, 'applications_payment_order'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)/payment-verify', array(
			'methods' => 'POST',
			'callback' => array($this, 'applications_payment_verify'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)/apply-coupon', array(
			'methods' => 'POST',
			'callback' => array($this, 'applications_apply_coupon'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)/remove-coupon', array(
			'methods' => 'POST',
			'callback' => array($this, 'applications_remove_coupon'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/applications/(?P<id>\d+)/pay-wallet', array(
			'methods' => 'POST',
			'callback' => array($this, 'applications_pay_wallet'),
			'permission_callback' => array($this, 'require_login'),
		));

		register_rest_route(self::NS, '/wallet', array(
			'methods' => 'GET',
			'callback' => array($this, 'wallet_get'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/wallet/transactions', array(
			'methods' => 'GET',
			'callback' => array($this, 'wallet_transactions'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/wallet/topup-order', array(
			'methods' => 'POST',
			'callback' => array($this, 'wallet_topup_order'),
			'permission_callback' => array($this, 'require_login'),
		));
		register_rest_route(self::NS, '/wallet/topup-verify', array(
			'methods' => 'POST',
			'callback' => array($this, 'wallet_topup_verify'),
			'permission_callback' => array($this, 'require_login'),
		));

		register_rest_route(self::NS, '/payments', array(
			'methods' => 'GET',
			'callback' => array($this, 'payments_list'),
			'permission_callback' => array($this, 'require_login'),
		));

		register_rest_route(self::NS, '/notifications', array(
			'methods' => 'GET',
			'callback' => array($this, 'notifications_list'),
			'permission_callback' => array($this, 'require_login'),
		));

		// ---- Firebase phone-OTP auth (pre-login) ----
		register_rest_route(self::NS, '/auth/firebase-login', array(
			'methods' => 'POST',
			'callback' => array($this, 'firebase_login'),
			'permission_callback' => '__return_true',
		));
		register_rest_route(self::NS, '/auth/firebase-register', array(
			'methods' => 'POST',
			'callback' => array($this, 'firebase_register'),
			'permission_callback' => '__return_true',
		));

		// ---- In-dashboard admin/operator routes (no wp-admin needed) ----
		register_rest_route(self::NS, '/admin/applications', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_applications_list'),
			'permission_callback' => array($this, 'require_manage_applications'),
		));
		register_rest_route(self::NS, '/admin/applications/(?P<id>\d+)/status', array(
			'methods' => 'POST',
			'callback' => array($this, 'admin_applications_status'),
			'permission_callback' => array($this, 'require_manage_applications'),
		));
		register_rest_route(self::NS, '/admin/documents', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_documents_list'),
			'permission_callback' => array($this, 'require_verify_documents'),
		));
		register_rest_route(self::NS, '/admin/documents/(?P<id>\d+)/verify', array(
			'methods' => 'POST',
			'callback' => array($this, 'admin_documents_verify'),
			'permission_callback' => array($this, 'require_verify_documents'),
		));
		register_rest_route(self::NS, '/admin/service-config', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_service_config_list'),
			'permission_callback' => array($this, 'require_manage_service_config'),
		));
		register_rest_route(self::NS, '/admin/service-config/(?P<service_key>[\w-]+)', array(
			'methods' => 'PATCH',
			'callback' => array($this, 'admin_service_config_update'),
			'permission_callback' => array($this, 'require_manage_service_config'),
		));
		register_rest_route(self::NS, '/admin/reports', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_reports'),
			'permission_callback' => array($this, 'require_view_reports'),
		));
		register_rest_route(self::NS, '/admin/api-logs', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_api_logs'),
			'permission_callback' => array($this, 'require_settings'),
		));
		register_rest_route(self::NS, '/admin/payments', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_payments'),
			'permission_callback' => array($this, 'require_view_reports'),
		));
		register_rest_route(self::NS, '/admin/associates', array(
			'methods' => 'GET',
			'callback' => array($this, 'admin_associates'),
			'permission_callback' => array($this, 'require_settings'),
		));
		register_rest_route(self::NS, '/admin/associates/(?P<id>\d+)/approve', array(
			'methods' => 'POST',
			'callback' => array($this, 'admin_associate_approve'),
			'permission_callback' => array($this, 'require_settings'),
		));
		register_rest_route(self::NS, '/admin/associates/(?P<id>\d+)/reject', array(
			'methods' => 'POST',
			'callback' => array($this, 'admin_associate_reject'),
			'permission_callback' => array($this, 'require_settings'),
		));
		register_rest_route(self::NS, '/admin/wallet/adjust', array(
			'methods' => 'POST',
			'callback' => array($this, 'admin_wallet_adjust'),
			'permission_callback' => array($this, 'require_settings'),
		));

		register_rest_route(self::NS, '/settings', array(
			array('methods' => 'GET', 'callback' => array($this, 'settings_get'), 'permission_callback' => array($this, 'require_settings')),
			array('methods' => 'POST', 'callback' => array($this, 'settings_update'), 'permission_callback' => array($this, 'require_settings')),
		));
	}

	// ---------------------------------------------------------- Permissions

	public function require_login()
	{
		return is_user_logged_in();
	}

	public function require_manage_applications()
	{
		return current_user_can('nss_manage_applications') || current_user_can('nss_view_all_applications');
	}

	public function require_verify_documents()
	{
		return current_user_can('nss_verify_documents');
	}

	public function require_manage_service_config()
	{
		return current_user_can('nss_manage_service_config');
	}

	public function require_view_reports()
	{
		return current_user_can('nss_view_reports');
	}

	public function require_settings()
	{
		return current_user_can('nss_manage_settings');
	}

	// ---------------------------------------------------------- Helpers

	protected function ok($data = array())
	{
		return new WP_REST_Response(array_merge(array('ok' => true), $data), 200);
	}

	protected function err(WP_Error $error)
	{
		return new WP_REST_Response(array('ok' => false, 'code' => $error->get_error_code(), 'message' => $error->get_error_message()), 400);
	}

	protected function own_application($id)
	{
		$app = NSS_Application::get((int) $id);
		if (!$app) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		$user_id = get_current_user_id();
		$can_manage_apps = user_can($user_id, 'nss_manage_applications') || user_can($user_id, 'nss_view_all_applications');
		if ((int) $app['user_id'] !== $user_id && !$can_manage_apps) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		return $app;
	}

	// ---------------------------------------------------------- Catalog

	public function catalog_tree()
	{
		return $this->ok(array('categories' => NSS_Service_Config::tree(), 'doc_types' => NSS_Service_Catalog::DOC_TYPES, 'courier_portal_url' => NSS_Settings::get('courier_portal_url', home_url('/courier/'))));
	}

	// ---------------------------------------------------------- Profile

	public function profile_get()
	{
		return $this->ok(array('profile' => NSS_Profile::for_user(get_current_user_id())));
	}

	public function profile_update(WP_REST_Request $req)
	{
		$body = $req->get_json_params();
		return $this->ok(array('profile' => NSS_Profile::update(get_current_user_id(), (array) $body)));
	}

	public function dashboard_stats()
	{
		global $wpdb;
		$user_id = get_current_user_id();
		$table_apps = $wpdb->prefix . 'nss_applications';
		
		$is_admin = user_can($user_id, 'nss_manage_applications') || user_can($user_id, 'nss_view_all_applications');
		
		$start_of_month = date('Y-m-01 00:00:00');
		$month_name = date('F');
		
		if ($is_admin) {
			$total_apps = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_apps} WHERE status != %s", 'draft'));
			$month_apps = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_apps} WHERE status != %s AND created_at >= %s", 'draft', $start_of_month));
		} else {
			$total_apps = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_apps} WHERE user_id = %d AND status != %s", $user_id, 'draft'));
			$month_apps = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_apps} WHERE user_id = %d AND status != %s AND created_at >= %s", $user_id, 'draft', $start_of_month));
		}
		
		$wallet_balance = NSS_Wallet::balance($user_id);
		
		return $this->ok(array(
			'total_applications' => $total_apps,
			'month_applications' => $month_apps,
			'month_label' => $month_name,
			'wallet_balance' => $wallet_balance,
		));
	}

	// ---------------------------------------------------------- Documents

	public function documents_list()
	{
		return $this->ok(array('items' => NSS_Documents::list_for_user(get_current_user_id())));
	}

	public function documents_upload(WP_REST_Request $req)
	{
		$doc_type = sanitize_key($req->get_param('doc_type'));
		$files = $req->get_file_params();
		if (empty($files['file'])) {
			return $this->err(new WP_Error('nss_no_file', 'No file uploaded.'));
		}
		$doc = NSS_Documents::upload(get_current_user_id(), $doc_type, $files['file']);
		if (is_wp_error($doc)) {
			return $this->err($doc);
		}
		return $this->ok(array('document' => $doc));
	}

	public function documents_delete(WP_REST_Request $req)
	{
		$result = NSS_Documents::delete((int) $req['id'], get_current_user_id());
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok();
	}

	/** Streams the file directly (not JSON) after checking ownership/capability — see NSS_Documents class doc comment. */
	public function documents_file(WP_REST_Request $req)
	{
		$doc = NSS_Documents::get((int) $req['id']);
		if (!$doc) {
			status_header(404);
			exit;
		}
		$can_view = (int) $doc['user_id'] === get_current_user_id() || current_user_can('nss_verify_documents');
		if (!$can_view || !file_exists($doc['file_path'])) {
			status_header(403);
			exit;
		}
		nocache_headers();
		header('Content-Type: ' . $doc['mime']);
		header('Content-Disposition: inline; filename="' . sanitize_file_name($doc['file_name']) . '"');
		header('Content-Length: ' . filesize($doc['file_path']));
		readfile($doc['file_path']);
		exit;
	}

	// ---------------------------------------------------------- Applications

	public function applications_list(WP_REST_Request $req)
	{
		$status = sanitize_key($req->get_param('status') ?: '');
		return $this->ok(array('items' => NSS_Application::list_for_user(get_current_user_id(), $status)));
	}

	public function applications_create(WP_REST_Request $req)
	{
		$service_key = sanitize_text_field($req->get_param('service_key'));
		$app = NSS_Application::create_draft(get_current_user_id(), $service_key);
		if (is_wp_error($app)) {
			return $this->err($app);
		}
		return $this->ok(array('application' => $app, 'config' => NSS_Service_Config::get($service_key)));
	}

	public function applications_get(WP_REST_Request $req)
	{
		$app = $this->own_application($req['id']);
		if (is_wp_error($app)) {
			return $this->err($app);
		}
		$documents = array();
		foreach ((array) ($app['document_ids'] ?? array()) as $doc_id) {
			$doc = NSS_Documents::get((int) $doc_id);
			if ($doc) {
				unset($doc['file_path']);
				$documents[] = $doc;
			}
		}
		return $this->ok(array(
			'application' => $app,
			'config' => NSS_Service_Config::get($app['service_key']),
			'status_log' => NSS_Status_Engine::log_for($app['id']),
			'documents' => $documents,
		));
	}

	public function applications_save_draft(WP_REST_Request $req)
	{
		$app = $this->own_application($req['id']);
		if (is_wp_error($app)) {
			return $this->err($app);
		}
		$body = (array) $req->get_json_params();
		$result = NSS_Application::save_draft((int) $req['id'], get_current_user_id(), (array) ($body['form_data'] ?? array()), (array) ($body['document_ids'] ?? array()));
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok(array('application' => $result));
	}

	public function applications_submit(WP_REST_Request $req)
	{
		$result = NSS_Application::submit((int) $req['id'], get_current_user_id());
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok(array('application' => $result));
	}

	public function applications_payment_order(WP_REST_Request $req)
	{
		$app = $this->own_application($req['id']);
		if (is_wp_error($app)) {
			return $this->err($app);
		}
		$config = NSS_Service_Config::get($app['service_key']);
		if (empty($config['payment_required'])) {
			return $this->err(new WP_Error('nss_no_payment_needed', 'This service does not require payment.'));
		}

		$total = max(0, (float) $config['amount'] - (float) $app['discount_amount']);
		$order = NSS_Razorpay::create_order($total, 'nss-app-' . $app['id']);
		if (is_wp_error($order)) {
			return $this->err($order);
		}

		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'nss_payments',
			array(
				'user_id' => get_current_user_id(),
				'application_id' => $app['id'],
				'provider' => 'razorpay',
				'order_id' => $order['id'],
				'amount' => $total,
				'currency' => $order['currency'],
				'status' => 'created',
				'created_at' => current_time('mysql'),
			)
		);

		$payments = NSS_Settings::get('payments', array());
		return $this->ok(array('order' => $order, 'key_id' => $payments['razorpay_key_id'] ?? ''));
	}

	public function applications_apply_coupon(WP_REST_Request $req)
	{
		$body = $req->get_json_params();
		$result = NSS_Application::apply_coupon((int) $req['id'], get_current_user_id(), sanitize_text_field($body['code'] ?? ''));
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok(array('application' => $result));
	}

	public function applications_remove_coupon(WP_REST_Request $req)
	{
		$result = NSS_Application::remove_coupon((int) $req['id'], get_current_user_id());
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok(array('application' => $result));
	}

	public function applications_pay_wallet(WP_REST_Request $req)
	{
		$app = $this->own_application($req['id']);
		if (is_wp_error($app)) {
			return $this->err($app);
		}
		$config = NSS_Service_Config::get($app['service_key']);
		if (empty($config['payment_required'])) {
			return $this->err(new WP_Error('nss_no_payment_needed', 'This service does not require payment.'));
		}
		$total = max(0, (float) $config['amount'] - (float) $app['discount_amount']);

		$result = NSS_Wallet::debit(get_current_user_id(), $total, 'nss_application', $app['id'], 'Payment for ' . $config['service_label']);
		if (is_wp_error($result)) {
			return $this->err($result);
		}

		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'nss_payments',
			array(
				'user_id' => get_current_user_id(),
				'application_id' => $app['id'],
				'provider' => 'wallet',
				'order_id' => 'wallet-' . $app['id'] . '-' . time(),
				'payment_id' => '',
				'amount' => $total,
				'currency' => 'INR',
				'status' => 'paid',
				'created_at' => current_time('mysql'),
			)
		);
		$payment_id = (int) $wpdb->insert_id;
		$wpdb->update($wpdb->prefix . 'nss_applications', array('payment_id' => $payment_id), array('id' => $app['id']));

		$updated = NSS_Application::advance_after_payment($app['id'], get_current_user_id());
		if (is_wp_error($updated)) {
			return $this->err($updated);
		}
		return $this->ok(array('application' => $updated, 'wallet_balance' => NSS_Wallet::balance(get_current_user_id())));
	}

	public function wallet_get()
	{
		return $this->ok(array('balance' => NSS_Wallet::balance(get_current_user_id()), 'available' => NSS_Wallet::is_available()));
	}

	public function wallet_transactions()
	{
		return $this->ok(array(
			'balance' => NSS_Wallet::balance(get_current_user_id()),
			'available' => NSS_Wallet::is_available(),
			'items' => NSS_Wallet::transactions(get_current_user_id(), 50),
		));
	}

	/** Creates a Razorpay order to add money to the shared wallet (no application involved). */
	public function wallet_topup_order(WP_REST_Request $req)
	{
		if (!NSS_Wallet::is_available()) {
			return $this->err(new WP_Error('nss_wallet_unavailable', 'Wallet is not available on this site yet.'));
		}
		$body = (array) $req->get_json_params();
		$amount = round((float) ($body['amount'] ?? 0), 2);
		if ($amount < 1) {
			return $this->err(new WP_Error('nss_bad_amount', 'Enter an amount of at least ₹1.'));
		}
		if ($amount > 100000) {
			return $this->err(new WP_Error('nss_bad_amount', 'Maximum ₹1,00,000 can be added at a time.'));
		}

		$user_id = get_current_user_id();
		$order = NSS_Razorpay::create_order($amount, 'nss-wallet-' . $user_id . '-' . time());
		if (is_wp_error($order)) {
			return $this->err($order);
		}

		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'nss_payments',
			array(
				'user_id' => $user_id,
				'application_id' => 0,
				'provider' => 'razorpay',
				'order_id' => $order['id'],
				'amount' => $amount,
				'currency' => $order['currency'],
				'status' => 'created',
				'created_at' => current_time('mysql'),
			)
		);

		$payments = NSS_Settings::get('payments', array());
		return $this->ok(array('order' => $order, 'key_id' => $payments['razorpay_key_id'] ?? ''));
	}

	/** Verifies the Razorpay top-up payment and credits the wallet. */
	public function wallet_topup_verify(WP_REST_Request $req)
	{
		$body = (array) $req->get_json_params();
		$order_id = sanitize_text_field($body['order_id'] ?? '');
		$verified = NSS_Razorpay::verify_signature($order_id, $body['payment_id'] ?? '', $body['signature'] ?? '');
		if (is_wp_error($verified)) {
			return $this->err($verified);
		}

		global $wpdb;
		$payments_table = $wpdb->prefix . 'nss_payments';
		$user_id = get_current_user_id();
		$payment = $wpdb->get_row(
			$wpdb->prepare("SELECT * FROM {$payments_table} WHERE order_id = %s AND user_id = %d", $order_id, $user_id),
			ARRAY_A
		);
		if (!$payment) {
			return $this->err(new WP_Error('nss_not_found', 'Top-up order not found.'));
		}
		if ('paid' === $payment['status']) {
			return $this->ok(array('balance' => NSS_Wallet::balance($user_id)));
		}

		$wpdb->update(
			$payments_table,
			array('payment_id' => sanitize_text_field($body['payment_id']), 'status' => 'paid'),
			array('id' => (int) $payment['id'])
		);

		$balance = NSS_Wallet::credit($user_id, (float) $payment['amount'], 'nss_topup', (int) $payment['id'], 'Wallet top-up via Razorpay');
		if (is_wp_error($balance)) {
			return $this->err($balance);
		}
		return $this->ok(array('balance' => $balance));
	}

	public function applications_payment_verify(WP_REST_Request $req)
	{
		$app = $this->own_application($req['id']);
		if (is_wp_error($app)) {
			return $this->err($app);
		}
		$body = $req->get_json_params();
		$verified = NSS_Razorpay::verify_signature($body['order_id'] ?? '', $body['payment_id'] ?? '', $body['signature'] ?? '');
		if (is_wp_error($verified)) {
			return $this->err($verified);
		}

		global $wpdb;
		$payments_table = $wpdb->prefix . 'nss_payments';
		$wpdb->update(
			$payments_table,
			array('payment_id' => sanitize_text_field($body['payment_id']), 'status' => 'paid'),
			array('order_id' => sanitize_text_field($body['order_id']))
		);
		$payment = $wpdb->get_row($wpdb->prepare("SELECT id FROM {$payments_table} WHERE order_id = %s", sanitize_text_field($body['order_id'])));
		if ($payment) {
			$wpdb->update($wpdb->prefix . 'nss_applications', array('payment_id' => (int) $payment->id), array('id' => $app['id']));
		}

		$result = NSS_Application::advance_after_payment($app['id'], get_current_user_id());
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok(array('application' => $result));
	}

	// ---------------------------------------------------------- Payments (own history)

	public function payments_list()
	{
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_payments WHERE user_id = %d ORDER BY id DESC', get_current_user_id()),
			ARRAY_A
		);
		return $this->ok(array('items' => $rows));
	}

	// ---------------------------------------------------------- Notifications

	public function notifications_list()
	{
		return $this->ok(array('items' => NSS_Notify::list_for_user(get_current_user_id())));
	}

	// ---------------------------------------------------------- Firebase phone-OTP auth

	public function firebase_login(WP_REST_Request $req)
	{
		$body = $req->get_json_params();
		$claims = NSS_Firebase_Auth::verify($body['id_token'] ?? '');
		if (is_wp_error($claims)) {
			return $this->err($claims);
		}

		$user = NSS_Auth::find_by_firebase_uid($claims['user_id']);
		if (!$user) {
			$user = NSS_Auth::find_by_mobile($claims['phone_number']);
			if ($user) {
				update_user_meta($user->ID, 'nsc_firebase_uid', $claims['user_id']);
			}
		}
		if (!$user) {
			return $this->err(new WP_Error('nss_no_account', 'No account found for this phone number. Please sign up first.'));
		}

		$expected_role = sanitize_key($body['expected_role'] ?? '');
		if ($expected_role && !in_array($expected_role, $user->roles, true)) {
			return $this->err(new WP_Error('nss_role_mismatch', 'This account is not registered as the selected role.'));
		}

		$session = NSS_Auth::start_session_or_error($user->ID);
		if (is_wp_error($session)) {
			return $this->err($session);
		}
		return $this->ok(array('redirect' => home_url('/')));
	}

	public function firebase_register(WP_REST_Request $req)
	{
		$body = $req->get_json_params();
		$claims = NSS_Firebase_Auth::verify($body['id_token'] ?? '');
		if (is_wp_error($claims)) {
			return $this->err($claims);
		}

		if (NSS_Auth::find_by_firebase_uid($claims['user_id']) || NSS_Auth::find_by_mobile($claims['phone_number'])) {
			return $this->err(new WP_Error('nss_exists', 'An account with this mobile number already exists — please log in instead.'));
		}

		$result = NSS_Auth::create_account(array(
			'name' => $body['name'] ?? '',
			'email' => $body['email'] ?? '',
			'mobile' => $claims['phone_number'],
			'password' => $body['password'] ?? '',
			'role' => $body['role'] ?? 'customer',
			'associate_code' => $body['associate_code'] ?? '',
			'referral_code' => $body['referral_code'] ?? '',
			'firebase_uid' => $claims['user_id'],
		));
		if (is_wp_error($result)) {
			return $this->err($result);
		}

		if ($result['pending']) {
			return $this->ok(array('pending' => true, 'message' => 'Your Associate account has been submitted for admin approval.'));
		}

		$session = NSS_Auth::start_session_or_error($result['user_id']);
		if (is_wp_error($session)) {
			return $this->err($session);
		}
		return $this->ok(array('redirect' => home_url('/')));
	}

	// ---------------------------------------------------------- Admin (in-dashboard)

	public function admin_applications_list(WP_REST_Request $req)
	{
		$args = array(
			'paged' => (int) ($req->get_param('paged') ?: 1),
			'status' => sanitize_key($req->get_param('status') ?: ''),
			'service_key' => sanitize_text_field($req->get_param('service_key') ?: ''),
			'search' => sanitize_text_field($req->get_param('search') ?: ''),
			'per_page' => 20,
		);
		return $this->ok(NSS_Application::list_all($args));
	}

	public function admin_applications_status(WP_REST_Request $req)
	{
		$body = $req->get_json_params();
		$result = NSS_Application::admin_update_status((int) $req['id'], sanitize_key($body['status'] ?? ''), sanitize_text_field($body['note'] ?? ''), get_current_user_id());
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok(array('application' => $result));
	}

	public function admin_documents_list(WP_REST_Request $req)
	{
		global $wpdb;
		$status = sanitize_key($req->get_param('status') ?: 'pending');
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT d.*, u.display_name, u.user_email FROM ' . $wpdb->prefix . 'nss_documents d LEFT JOIN ' . $wpdb->users . ' u ON u.ID = d.user_id WHERE d.status = %s ORDER BY d.id DESC LIMIT 100',
				$status
			),
			ARRAY_A
		);
		return $this->ok(array('items' => $rows));
	}

	public function admin_documents_verify(WP_REST_Request $req)
	{
		$body = $req->get_json_params();
		$status = ('rejected' === ($body['status'] ?? '')) ? 'rejected' : 'verified';
		$doc = NSS_Documents::verify((int) $req['id'], get_current_user_id(), $status);
		if (is_wp_error($doc)) {
			return $this->err($doc);
		}
		return $this->ok(array('document' => $doc));
	}

	public function admin_service_config_list(WP_REST_Request $req)
	{
		return $this->ok(array('items' => NSS_Service_Config::all(array('per_page' => 500))));
	}

	public function admin_service_config_update(WP_REST_Request $req)
	{
		$body = (array) $req->get_json_params();
		$config = NSS_Service_Config::update(sanitize_text_field($req['service_key']), $body);
		return $this->ok(array('config' => $config));
	}

	/** Drafts are unsubmitted work-in-progress — they are reported separately and never counted in totals. */
	public function admin_reports(WP_REST_Request $req)
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_applications';
		$payments_table = $wpdb->prefix . 'nss_payments';

		$by_status = $wpdb->get_results("SELECT status, COUNT(*) as cnt FROM {$table} WHERE status != 'draft' GROUP BY status", ARRAY_A);
		$by_service = $wpdb->get_results("SELECT service_key, COUNT(*) as cnt FROM {$table} WHERE status != 'draft' GROUP BY service_key ORDER BY cnt DESC LIMIT 20", ARRAY_A);
		$total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE status != 'draft'");
		$drafts = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE status = 'draft'");
		$month_total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE status != 'draft' AND created_at >= %s", date('Y-m-01 00:00:00')));
		$revenue = (float) $wpdb->get_var("SELECT COALESCE(SUM(amount),0) FROM {$payments_table} WHERE status = 'paid'");
		$month_revenue = (float) $wpdb->get_var($wpdb->prepare("SELECT COALESCE(SUM(amount),0) FROM {$payments_table} WHERE status = 'paid' AND created_at >= %s", date('Y-m-01 00:00:00')));

		return $this->ok(array(
			'by_status' => $by_status,
			'by_service' => $by_service,
			'total_applications' => $total,
			'month_applications' => $month_total,
			'month_label' => date('F'),
			'draft_count' => $drafts,
			'total_revenue' => $revenue,
			'month_revenue' => $month_revenue,
		));
	}

	public function admin_api_logs(WP_REST_Request $req)
	{
		global $wpdb;
		$rows = $wpdb->get_results('SELECT * FROM ' . $wpdb->prefix . 'nss_api_logs ORDER BY id DESC LIMIT 200', ARRAY_A);
		return $this->ok(array('items' => $rows));
	}

	public function admin_payments(WP_REST_Request $req)
	{
		global $wpdb;
		$rows = $wpdb->get_results(
			'SELECT p.*, u.display_name, u.user_email FROM ' . $wpdb->prefix . 'nss_payments p LEFT JOIN ' . $wpdb->users . ' u ON u.ID = p.user_id ORDER BY p.id DESC LIMIT 200',
			ARRAY_A
		);
		return $this->ok(array('items' => $rows));
	}

	public function admin_wallet_adjust(WP_REST_Request $req)
	{
		$body = (array) $req->get_json_params();
		$target_user_id = (int) ($body['user_id'] ?? 0);
		$type = sanitize_key($body['type'] ?? 'credit');
		$amount = round((float) ($body['amount'] ?? 0), 2);
		$note = sanitize_text_field($body['note'] ?? '');

		if ($target_user_id <= 0) {
			return $this->err(new WP_Error('nss_invalid_user', 'Invalid User ID.'));
		}

		$user = get_userdata($target_user_id);
		if (!$user) {
			return $this->err(new WP_Error('nss_user_not_found', 'User does not exist.'));
		}

		if ($amount <= 0) {
			return $this->err(new WP_Error('nss_bad_amount', 'Amount must be greater than zero.'));
		}

		if ('credit' === $type) {
			$result = NSS_Wallet::credit($target_user_id, $amount, 'nss_admin_adjust', get_current_user_id(), $note);
		} else if ('debit' === $type) {
			$result = NSS_Wallet::debit($target_user_id, $amount, 'nss_admin_adjust', get_current_user_id(), $note);
		} else {
			return $this->err(new WP_Error('nss_bad_type', 'Invalid adjustment type.'));
		}

		if (is_wp_error($result)) {
			return $this->err($result);
		}

		return $this->ok(array(
			'user_id' => $target_user_id,
			'new_balance' => $result,
			'message' => sprintf('Wallet of %s updated successfully.', $user->display_name)
		));
	}

	public function admin_associates()
	{
		return $this->ok(array('items' => NSS_Associate::list_pending()));
	}

	public function admin_associate_approve(WP_REST_Request $req)
	{
		$result = NSS_Associate::approve((int) $req['id']);
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok();
	}

	public function admin_associate_reject(WP_REST_Request $req)
	{
		$result = NSS_Associate::reject((int) $req['id']);
		if (is_wp_error($result)) {
			return $this->err($result);
		}
		return $this->ok();
	}

	// ---------------------------------------------------------- Settings

	public function settings_get()
	{
		$settings = NSS_Settings::all();
		unset($settings['payments']['razorpay_key_secret']);
		foreach ($settings['providers'] ?? array() as $key => $p) {
			unset($settings['providers'][$key]['api_secret']);
		}
		return $this->ok(array('settings' => $settings, 'providers_status' => NSS_Provider_Registry::all_configured()));
	}

	public function settings_update(WP_REST_Request $req)
	{
		$body = (array) $req->get_json_params();
		foreach (array('courier_portal_url', 'payments', 'notify', 'providers') as $key) {
			if (isset($body[$key])) {
				NSS_Settings::update($key, is_array($body[$key]) ? $body[$key] : sanitize_text_field($body[$key]));
			}
		}
		return $this->ok(array('settings' => NSS_Settings::all()));
	}
}
