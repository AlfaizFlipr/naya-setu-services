<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The one application model every service shares — a row here plus a
 * service_key is the entire "instance" of a submission; the service-specific
 * shape lives only in form_data_json (validated against that service's
 * fields_json at submit time).
 */
class NSS_Application
{
	public static function create_draft($user_id, $service_key)
	{
		$config = NSS_Service_Config::get($service_key);
		if (!$config) {
			return new WP_Error('nss_unknown_service', 'Unknown service.');
		}
		if ($config['redirect_url']) {
			return new WP_Error('nss_redirect_service', 'This service is handled by the Courier dashboard.');
		}

		global $wpdb;
		$now = current_time('mysql');
		$wpdb->insert(
			$wpdb->prefix . 'nss_applications',
			array(
				'user_id' => (int) $user_id,
				'service_key' => $service_key,
				'category_key' => $config['category_key'],
				'application_no' => '',
				'form_data_json' => wp_json_encode(new stdClass()),
				'documents_json' => wp_json_encode(array()),
				'status' => NSS_Status_Engine::DRAFT,
				'created_at' => $now,
				'updated_at' => $now,
			)
		);
		return self::get((int) $wpdb->insert_id);
	}

	public static function get($id)
	{
		global $wpdb;
		$row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_applications WHERE id = %d', (int) $id), ARRAY_A);
		if (!$row) {
			return null;
		}
		return self::hydrate($row);
	}

	public static function list_for_user($user_id, $status = '')
	{
		global $wpdb;
		$sql = 'SELECT * FROM ' . $wpdb->prefix . 'nss_applications WHERE user_id = %d';
		$args = array((int) $user_id);
		if ($status) {
			$sql .= ' AND status = %s';
			$args[] = $status;
		}
		$sql .= ' ORDER BY id DESC';
		$rows = $wpdb->get_results($wpdb->prepare($sql, $args), ARRAY_A);
		return array_map(array(__CLASS__, 'hydrate'), $rows);
	}

	public static function list_all($args = array())
	{
		global $wpdb;
		$per_page = max(1, (int) ($args['per_page'] ?? 20));
		$paged = max(1, (int) ($args['paged'] ?? 1));
		$where = array('1=1');
		$where[] = "status != 'draft'"; // Exclude drafts from admin views
		$params = array();
		if (!empty($args['status'])) {
			$where[] = 'status = %s';
			$params[] = $args['status'];
		}
		if (!empty($args['service_key'])) {
			$where[] = 'service_key = %s';
			$params[] = $args['service_key'];
		}
		if (!empty($args['search'])) {
			$where[] = 'application_no LIKE %s';
			$params[] = '%' . $wpdb->esc_like($args['search']) . '%';
		}
		$where_sql = implode(' AND ', $where);
		$table = $wpdb->prefix . 'nss_applications';

		$total = (int) ($params ? $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE {$where_sql}", $params)) : $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE {$where_sql}"));

		$sql = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY id DESC LIMIT %d OFFSET %d";
		$params[] = $per_page;
		$params[] = ($paged - 1) * $per_page;
		$rows = $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A);

		return array('items' => array_map(array(__CLASS__, 'hydrate'), $rows), 'total' => $total, 'per_page' => $per_page, 'paged' => $paged);
	}

	public static function save_draft($id, $user_id, array $form_data, array $document_ids = array())
	{
		$app = self::get($id);
		if (!$app || (int) $app['user_id'] !== (int) $user_id) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		global $wpdb;
		$wpdb->update(
			$wpdb->prefix . 'nss_applications',
			array(
				'form_data_json' => wp_json_encode($form_data),
				'documents_json' => wp_json_encode($document_ids),
				'updated_at' => current_time('mysql'),
			),
			array('id' => (int) $id)
		);
		return self::get($id);
	}

	/** @return array|WP_Error Updated application row (with coupon_code/discount_amount) on success. */
	public static function apply_coupon($id, $user_id, $code)
	{
		$app = self::get($id);
		if (!$app || (int) $app['user_id'] !== (int) $user_id) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		$config = NSS_Service_Config::get($app['service_key']);
		if (empty($config['payment_required'])) {
			return new WP_Error('nss_no_payment_needed', 'This service does not require payment.');
		}

		$result = NSS_Coupons::apply($code, (float) $config['amount']);
		if (is_wp_error($result)) {
			return $result;
		}

		global $wpdb;
		$wpdb->update(
			$wpdb->prefix . 'nss_applications',
			array('coupon_code' => $result['code'], 'discount_amount' => $result['discount_amount'], 'updated_at' => current_time('mysql')),
			array('id' => (int) $id)
		);
		return self::get($id);
	}

	public static function remove_coupon($id, $user_id)
	{
		$app = self::get($id);
		if (!$app || (int) $app['user_id'] !== (int) $user_id) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		global $wpdb;
		$wpdb->update(
			$wpdb->prefix . 'nss_applications',
			array('coupon_code' => '', 'discount_amount' => 0, 'updated_at' => current_time('mysql')),
			array('id' => (int) $id)
		);
		return self::get($id);
	}

	/**
	 * Validates required fields/docs, gates on payment, hands off to the
	 * provider registry, and moves status draft -> submitted -> in_progress
	 * (or leaves it at 'submitted' if payment is still required and unpaid).
	 */
	public static function submit($id, $user_id)
	{
		$app = self::get($id);
		if (!$app || (int) $app['user_id'] !== (int) $user_id) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		if (NSS_Status_Engine::DRAFT !== $app['status']) {
			return new WP_Error('nss_already_submitted', 'This application has already been submitted.');
		}

		$config = NSS_Service_Config::get($app['service_key']);
		$validation = self::validate($config, $app['form_data'], $app['document_ids'], $user_id);
		if (is_wp_error($validation)) {
			return $validation;
		}

		if (!empty($config['payment_required']) && !$app['payment_id']) {
			$transition = NSS_Status_Engine::transition($id, NSS_Status_Engine::DRAFT, NSS_Status_Engine::SUBMITTED, 'Awaiting payment', $user_id);
			if (is_wp_error($transition)) {
				return $transition;
			}
			self::assign_application_no($id);
			return self::get($id);
		}

		return self::advance_after_payment($id, $user_id);
	}

	/** Called directly for free services, and again once NSS_Razorpay verifies payment for paid ones. */
	public static function advance_after_payment($id, $user_id)
	{
		$app = self::get($id);
		if (!$app) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		if (in_array($app['status'], array(NSS_Status_Engine::IN_PROGRESS, NSS_Status_Engine::PENDING_USER, NSS_Status_Engine::COMPLETED), true)) {
			return $app;
		}

		if (NSS_Status_Engine::DRAFT === $app['status']) {
			NSS_Status_Engine::transition($id, NSS_Status_Engine::DRAFT, NSS_Status_Engine::SUBMITTED, '', $user_id);
			self::assign_application_no($id);
			$app = self::get($id);
		}

		if ($app['coupon_code']) {
			NSS_Coupons::mark_used($app['coupon_code']);
		}

		$config = NSS_Service_Config::get($app['service_key']);
		$provider = NSS_Provider_Registry::get($config['api_provider_key']);
		$result = $provider->submit(array('service_key' => $app['service_key'], 'form_data' => $app['form_data'], 'profile' => NSS_Profile::for_user($user_id)));

		NSS_Logger::log('application-submit', $config['service_label'] . ' -> ' . get_class($provider), array('application_id' => $id, 'result' => is_wp_error($result) ? $result->get_error_message() : $result), is_wp_error($result) ? 'error' : 'info');

		NSS_Status_Engine::transition($id, NSS_Status_Engine::SUBMITTED, NSS_Status_Engine::IN_PROGRESS, '', $user_id);
		NSS_Notify::status_changed($user_id, $app, NSS_Status_Engine::IN_PROGRESS);

		return self::get($id);
	}

	public static function admin_update_status($id, $to_status, $note, $changed_by)
	{
		$app = self::get($id);
		if (!$app) {
			return new WP_Error('nss_not_found', 'Application not found.');
		}
		$result = NSS_Status_Engine::transition($id, $app['status'], $to_status, $note, $changed_by);
		if (is_wp_error($result)) {
			return $result;
		}
		NSS_Notify::status_changed($app['user_id'], $app, $to_status);
		return self::get($id);
	}

	protected static function validate($config, array $form_data, array $document_ids, $user_id)
	{
		foreach ($config['fields'] as $field) {
			if (!empty($field['required']) && ('' === ($form_data[$field['name']] ?? ''))) {
				return new WP_Error('nss_missing_field', sprintf('"%s" is required.', $field['label']));
			}
		}

		$have_types = array();
		foreach ($document_ids as $doc_id) {
			$doc = NSS_Documents::get($doc_id);
			if ($doc && (int) $doc['user_id'] === (int) $user_id) {
				$have_types[$doc['doc_type']] = true;
			}
		}
		foreach ($config['required_documents'] as $doc_type) {
			if (empty($have_types[$doc_type])) {
				return new WP_Error('nss_missing_document', sprintf('Please attach your %s.', NSS_Service_Catalog::DOC_TYPES[$doc_type] ?? $doc_type));
			}
		}
		return true;
	}

	protected static function assign_application_no($id)
	{
		global $wpdb;
		$app_no = 'NSS-' . gmdate('Ym') . '-' . str_pad($id, 5, '0', STR_PAD_LEFT);
		$wpdb->update($wpdb->prefix . 'nss_applications', array('application_no' => $app_no), array('id' => (int) $id));
	}

	protected static function hydrate(array $row)
	{
		$row['form_data'] = $row['form_data_json'] ? (array) json_decode($row['form_data_json'], true) : array();
		$row['document_ids'] = $row['documents_json'] ? (array) json_decode($row['documents_json'], true) : array();
		return $row;
	}
}
