<?php

if (!defined('ABSPATH')) {
	exit;
}

class NSS_Install
{
	public static function run()
	{
		self::create_tables();
		self::register_roles();
		self::seed_settings();
		self::seed_service_catalog();
		self::migrate_provider_bindings();
		update_option('nss_db_version', NSS_DB_VERSION);
	}

	/**
	 * Additive only — never remove_role()/remove_cap() on the nsc_* slugs.
	 * This plugin shares accounts/roles/session with naya-setu-courier (same
	 * WordPress site, same wp_users table); whichever plugin activates first
	 * defines the roles, the other only tops up capabilities it needs. If
	 * neither courier plugin is present, add_role() here still creates them
	 * fresh so this plugin works standalone.
	 */
	public static function register_roles()
	{
		if (!get_role('nsc_customer')) {
			add_role('nsc_customer', __('Naya Setu User', 'naya-setu-services'), array('read' => true, 'nsc_customer' => true));
		}
		if (!get_role('nsc_associate')) {
			add_role('nsc_associate', __('Naya Setu Associate', 'naya-setu-services'), array('read' => true, 'nsc_associate' => true));
		}
		if (!get_role('nsc_operator')) {
			add_role('nsc_operator', __('Naya Setu Employee', 'naya-setu-services'), array('read' => true, 'nsc_operator' => true));
		}

		$service_caps = array(
			'nss_book_service' => true,
			'nss_view_own_applications' => true,
			'nss_manage_own_documents' => true,
		);
		foreach (array('nsc_customer', 'nsc_associate', 'nsc_operator') as $role_slug) {
			$role = get_role($role_slug);
			if (!$role) {
				continue;
			}
			foreach ($service_caps as $cap => $grant) {
				if (!$role->has_cap($cap)) {
					$role->add_cap($cap);
				}
			}
		}

		$operator = get_role('nsc_operator');
		if ($operator && !$operator->has_cap('nss_view_all_applications')) {
			$operator->add_cap('nss_view_all_applications');
		}

		$admin = get_role('administrator');
		if ($admin) {
			$admin_caps = array(
				'nsc_customer',
				'nss_book_service',
				'nss_view_own_applications',
				'nss_manage_own_documents',
				'nss_view_all_applications',
				'nss_manage_service_config',
				'nss_verify_documents',
				'nss_manage_applications',
				'nss_view_reports',
				'nss_manage_settings',
			);
			foreach ($admin_caps as $cap) {
				if (!$admin->has_cap($cap)) {
					$admin->add_cap($cap);
				}
			}
		}
	}

	public static function create_tables()
	{
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();

		$profiles = $wpdb->prefix . 'nss_profiles';
		$documents = $wpdb->prefix . 'nss_documents';
		$service_config = $wpdb->prefix . 'nss_service_config';
		$applications = $wpdb->prefix . 'nss_applications';
		$status_log = $wpdb->prefix . 'nss_status_log';
		$payments = $wpdb->prefix . 'nss_payments';
		$api_logs = $wpdb->prefix . 'nss_api_logs';
		$notifications = $wpdb->prefix . 'nss_notifications';

		$sql = array();

		$sql[] = "CREATE TABLE {$profiles} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			father_name VARCHAR(150) NOT NULL DEFAULT '',
			mother_name VARCHAR(150) NOT NULL DEFAULT '',
			dob DATE NULL DEFAULT NULL,
			gender VARCHAR(20) NOT NULL DEFAULT '',
			address1 VARCHAR(255) NOT NULL DEFAULT '',
			address2 VARCHAR(255) NOT NULL DEFAULT '',
			district VARCHAR(100) NOT NULL DEFAULT '',
			state VARCHAR(100) NOT NULL DEFAULT '',
			pincode VARCHAR(10) NOT NULL DEFAULT '',
			aadhaar_no VARCHAR(20) NOT NULL DEFAULT '',
			samagra_id VARCHAR(30) NOT NULL DEFAULT '',
			pan_no VARCHAR(15) NOT NULL DEFAULT '',
			photo_doc_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			signature_doc_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			business_json LONGTEXT NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			UNIQUE KEY user_id (user_id)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$documents} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			doc_type VARCHAR(20) NOT NULL DEFAULT 'other',
			file_path VARCHAR(500) NOT NULL DEFAULT '',
			file_name VARCHAR(255) NOT NULL DEFAULT '',
			mime VARCHAR(100) NOT NULL DEFAULT '',
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			verified_by BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			verified_at DATETIME NULL DEFAULT NULL,
			expiry_date DATE NULL DEFAULT NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY user_id (user_id),
			KEY doc_type (doc_type)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$service_config} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			category_key VARCHAR(40) NOT NULL DEFAULT '',
			category_label VARCHAR(100) NOT NULL DEFAULT '',
			category_icon VARCHAR(40) NOT NULL DEFAULT '',
			service_key VARCHAR(60) NOT NULL DEFAULT '',
			service_label VARCHAR(150) NOT NULL DEFAULT '',
			sort_order INT UNSIGNED NOT NULL DEFAULT 0,
			active TINYINT(1) NOT NULL DEFAULT 1,
			payment_required TINYINT(1) NOT NULL DEFAULT 0,
			amount DECIMAL(10,2) NOT NULL DEFAULT 0,
			workflow_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
			api_provider_key VARCHAR(40) NOT NULL DEFAULT '',
			required_documents LONGTEXT NULL,
			fields_json LONGTEXT NULL,
			redirect_url VARCHAR(255) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			UNIQUE KEY service_key (service_key),
			KEY category_key (category_key)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$applications} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			service_key VARCHAR(60) NOT NULL DEFAULT '',
			category_key VARCHAR(40) NOT NULL DEFAULT '',
			application_no VARCHAR(40) NOT NULL DEFAULT '',
			form_data_json LONGTEXT NULL,
			documents_json LONGTEXT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'draft',
			status_note VARCHAR(255) NOT NULL DEFAULT '',
			payment_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			coupon_code VARCHAR(40) NOT NULL DEFAULT '',
			discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			submitted_at DATETIME NULL DEFAULT NULL,
			completed_at DATETIME NULL DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY user_id (user_id),
			KEY service_key (service_key),
			KEY status (status),
			KEY application_no (application_no)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$status_log} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			application_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			from_status VARCHAR(20) NOT NULL DEFAULT '',
			to_status VARCHAR(20) NOT NULL DEFAULT '',
			note VARCHAR(255) NOT NULL DEFAULT '',
			changed_by BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY application_id (application_id)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$payments} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			application_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			provider VARCHAR(30) NOT NULL DEFAULT 'razorpay',
			order_id VARCHAR(80) NOT NULL DEFAULT '',
			payment_id VARCHAR(80) NOT NULL DEFAULT '',
			amount DECIMAL(10,2) NOT NULL DEFAULT 0,
			currency VARCHAR(10) NOT NULL DEFAULT 'INR',
			status VARCHAR(20) NOT NULL DEFAULT 'created',
			raw_json LONGTEXT NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY user_id (user_id),
			KEY application_id (application_id)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$api_logs} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			context VARCHAR(50) NOT NULL DEFAULT '',
			application_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			level VARCHAR(20) NOT NULL DEFAULT 'info',
			message TEXT NULL,
			request_json LONGTEXT NULL,
			response_json LONGTEXT NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY context (context),
			KEY application_id (application_id)
		) {$charset_collate};";

		$sql[] = "CREATE TABLE {$notifications} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			user_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
			channel VARCHAR(20) NOT NULL DEFAULT 'sms',
			event_key VARCHAR(60) NOT NULL DEFAULT '',
			message TEXT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'queued',
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY user_id (user_id)
		) {$charset_collate};";

		foreach ($sql as $statement) {
			dbDelta($statement);
		}
	}

	/**
	 * Seeds wp_nss_service_config from NSS_Service_Catalog::defaults() — but
	 * only inserts rows whose service_key doesn't already exist. Once a row
	 * is in the DB, admin edits in Service Config own it; re-running this
	 * (e.g. on a version bump) never overwrites them.
	 */
	public static function seed_service_catalog()
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_service_config';
		$now = current_time('mysql');
		$sort = 0;

		foreach (NSS_Service_Catalog::defaults() as $category_key => $category) {
			foreach ($category['services'] as $service) {
				$sort += 10;
				$exists = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE service_key = %s", $service['key']));
				if ($exists) {
					continue;
				}
				$wpdb->insert(
					$table,
					array(
						'category_key' => $category_key,
						'category_label' => $category['label'],
						'category_icon' => $category['icon'],
						'service_key' => $service['key'],
						'service_label' => $service['label'],
						'sort_order' => $sort,
						'active' => 1,
						'payment_required' => !empty($service['payment_required']) ? 1 : 0,
						'amount' => (float) $service['amount'],
						'workflow_mode' => $service['workflow_mode'],
						'api_provider_key' => $service['api_provider_key'],
						'required_documents' => wp_json_encode(array_values($service['docs'])),
						'fields_json' => wp_json_encode(array_values($service['fields'])),
						'redirect_url' => $service['redirect_hash'],
						'created_at' => $now,
						'updated_at' => $now,
					)
				);
			}
		}
	}

	/** Move only the legacy default bindings; administrator custom bindings remain untouched. */
	protected static function migrate_provider_bindings()
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_service_config';
		$now = current_time('mysql');
		$wpdb->query($wpdb->prepare("UPDATE {$table} SET api_provider_key = %s, workflow_mode = 'api', updated_at = %s WHERE service_key IN ('account_verification', 'penny_drop_verification') AND api_provider_key = 'penny_drop'", 'decentro_banking', $now));
		$wpdb->query($wpdb->prepare("UPDATE {$table} SET api_provider_key = %s, workflow_mode = 'api', updated_at = %s WHERE service_key IN ('insurance_life', 'insurance_health', 'insurance_vehicle', 'insurance_term') AND api_provider_key = ''", 'turtlefin_insurance', $now));
		$wpdb->query($wpdb->prepare("UPDATE {$table} SET api_provider_key = %s, workflow_mode = 'api', updated_at = %s WHERE service_key = 'insurance_health' AND api_provider_key = 'turtlefin_insurance'", 'turtlefin_insurance', $now));
		$wpdb->query($wpdb->prepare("UPDATE {$table} SET api_provider_key = '', workflow_mode = 'manual', updated_at = %s WHERE service_key IN ('insurance_life', 'insurance_term') AND api_provider_key = 'turtlefin_insurance'", $now));
	}

	public static function seed_settings()
	{
		$defaults = array(
			'courier_portal_url' => self::detect_courier_portal_url(),
			'payments' => array(
				'razorpay_key_id' => '',
				'razorpay_key_secret' => '',
				'razorpay_enabled' => 0,
			),
			'notify' => array(
				'sms_provider' => '',
				'sms_api_key' => '',
				'whatsapp_provider' => '',
				'whatsapp_api_key' => '',
			),
			'providers' => array(
				'pan_protean' => array('enabled' => 0, 'label' => 'Protean (PAN)', 'api_key' => '', 'api_secret' => ''),
				'pan_uti' => array('enabled' => 0, 'label' => 'UTI (PAN)', 'api_key' => '', 'api_secret' => ''),
				'gst_api' => array('enabled' => 0, 'label' => 'GST API', 'api_key' => '', 'api_secret' => ''),
				'ckyc' => array('enabled' => 0, 'label' => 'CKYC', 'api_key' => '', 'api_secret' => ''),
				'penny_drop' => array('enabled' => 0, 'label' => 'Penny Drop', 'api_key' => '', 'api_secret' => ''),
				'decentro_banking' => array(
					'enabled' => 1, 'label' => 'Decentro Banking (Account Validation)',
					'api_key' => 'GUPTATECHHUBOPCPRIVATELIMITED_6_sop', 'api_secret' => '641d58db208a4c85898078bbf1c506a1',
					'module_secret' => 'a9cb41b4642446969912dda476b2fe2f', 'provider_secret' => 'bcba42cd416640a3a8b824305adaa9a2',
					'base_url' => 'https://in.staging.decentro.tech',
				),
				'sandbox' => array(
					'enabled' => 1, 'label' => 'Sandbox.co.in (KYC & Verification)',
					'api_key' => 'key_live_369581746f694b1696216d1e5b005813', 'api_secret' => 'secret_live_0906cc4d56e6438492285cadf185f47c',
					'base_url' => 'https://api.sandbox.co.in',
				),
				'turtlefin_insurance' => array(
					'enabled' => 0, 'label' => 'Turtlefin OneAPI (Insurance)', 'api_key' => '', 'api_secret' => '',
					'base_url' => '', 'token_path' => '/v1/token/issue',
				),
			),
			// Same public client-side Firebase web config already used by naya-setu-courier,
			// so a phone number verified in either plugin's OTP flow is the same Firebase user.
			'firebase' => array(
				'apiKey' => 'AIzaSyDaPiCrFpCdPeGnm6K6mUnfPCS0z35T2SQ',
				'authDomain' => 'naya-setu.firebaseapp.com',
				'projectId' => 'naya-setu',
				'storageBucket' => 'naya-setu.firebasestorage.app',
				'messagingSenderId' => '798242383499',
				'appId' => '1:798242383499:web:72fd876de244e6cffc168e',
			),
		);
		$existing = get_option('nss_settings', array());
		$merged = wp_parse_args($existing, $defaults);

		foreach (array('payments', 'notify', 'providers', 'firebase') as $group) {
			if (isset($defaults[$group]) && is_array($defaults[$group])) {
				$merged[$group] = wp_parse_args($merged[$group] ?? array(), $defaults[$group]);
				if ('providers' === $group) {
					foreach ($defaults['providers'] as $key => $provider_defaults) {
						$merged['providers'][$key] = wp_parse_args($merged['providers'][$key] ?? array(), $provider_defaults);
					}
				}
			}
		}

		update_option('nss_settings', $merged);
	}

	/**
	 * Looks for a published page carrying naya-setu-courier's [nayasetu_courier]
	 * shortcode so Settings -> General starts with a working Courier Portal URL
	 * out of the box; falls back to /courier/ if that plugin isn't installed yet
	 * (the admin can fill in the real URL once it is).
	 */
	protected static function detect_courier_portal_url()
	{
		$posts = get_posts(
			array(
				'post_type' => 'page',
				'post_status' => 'publish',
				'posts_per_page' => 1,
				's' => '[nayasetu_courier]',
			)
		);
		foreach ($posts as $post) {
			if (has_shortcode($post->post_content, 'nayasetu_courier')) {
				return get_permalink($post);
			}
		}
		return home_url('/courier/');
	}
}
