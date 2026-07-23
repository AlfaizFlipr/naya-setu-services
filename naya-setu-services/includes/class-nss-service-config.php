<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Read/write access to wp_nss_service_config — the live, admin-editable copy
 * of the category/service tree (NSS_Service_Catalog::defaults() only seeds
 * it once). This is what the public dashboard's category/service grid and
 * form builder read, and what the in-dashboard "Service Config" admin route
 * edits — no code change needed to add a service or tweak its fields (Q6).
 */
class NSS_Service_Config
{
	public static function get($service_key)
	{
		global $wpdb;
		$row = $wpdb->get_row(
			$wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_service_config WHERE service_key = %s', $service_key),
			ARRAY_A
		);
		return $row ? self::hydrate($row) : null;
	}

	/** Nested category -> services tree for the dashboard's category/service grid. */
	public static function tree($active_only = true)
	{
		global $wpdb;
		$sql = 'SELECT * FROM ' . $wpdb->prefix . 'nss_service_config';
		if ($active_only) {
			$sql .= ' WHERE active = 1';
		}
		$sql .= ' ORDER BY category_key, sort_order ASC';
		$rows = $wpdb->get_results($sql, ARRAY_A);

		$tree = array();
		foreach ($rows as $row) {
			$row = self::hydrate($row);
			$cat = $row['category_key'];
			if (!isset($tree[$cat])) {
				$tree[$cat] = array('key' => $cat, 'label' => $row['category_label'], 'icon' => $row['category_icon'], 'services' => array());
			}
			$tree[$cat]['services'][] = $row;
		}
		return array_values($tree);
	}

	public static function all($args = array())
	{
		global $wpdb;
		$per_page = max(1, (int) ($args['per_page'] ?? 200));
		$paged = max(1, (int) ($args['paged'] ?? 1));
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . $wpdb->prefix . 'nss_service_config ORDER BY category_key, sort_order ASC LIMIT %d OFFSET %d',
				$per_page,
				($paged - 1) * $per_page
			),
			ARRAY_A
		);
		return array_map(array(__CLASS__, 'hydrate'), $rows);
	}

	public static function update($service_key, array $data)
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_service_config';
		$update = array('updated_at' => current_time('mysql'));

		if (isset($data['service_label'])) {
			$update['service_label'] = sanitize_text_field($data['service_label']);
		}
		if (isset($data['active'])) {
			$update['active'] = !empty($data['active']) ? 1 : 0;
		}
		if (isset($data['sort_order'])) {
			$update['sort_order'] = (int) $data['sort_order'];
		}
		if (isset($data['payment_required'])) {
			$update['payment_required'] = !empty($data['payment_required']) ? 1 : 0;
		}
		if (isset($data['amount'])) {
			$update['amount'] = (float) $data['amount'];
		}
		if (isset($data['workflow_mode']) && in_array($data['workflow_mode'], array('manual', 'api'), true)) {
			$update['workflow_mode'] = $data['workflow_mode'];
		}
		if (isset($data['api_provider_key'])) {
			$update['api_provider_key'] = sanitize_key($data['api_provider_key']);
		}
		if (isset($data['required_documents']) && is_array($data['required_documents'])) {
			$update['required_documents'] = wp_json_encode(array_values($data['required_documents']));
		}
		if (isset($data['fields']) && is_array($data['fields'])) {
			$update['fields_json'] = wp_json_encode(array_values($data['fields']));
		}
		if (isset($data['redirect_url'])) {
			$update['redirect_url'] = sanitize_text_field($data['redirect_url']);
		}

		$wpdb->update($table, $update, array('service_key' => $service_key));
		return self::get($service_key);
	}

	protected static function hydrate(array $row)
	{
		$row['fields'] = $row['fields_json'] ? (array) json_decode($row['fields_json'], true) : array();
		$row['required_documents'] = $row['required_documents'] ? (array) json_decode($row['required_documents'], true) : array();
		return $row;
	}
}
