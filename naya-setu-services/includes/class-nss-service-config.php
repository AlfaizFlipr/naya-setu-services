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

	/**
	 * Creates a new subcategory (service row) under a category. If the given
	 * category_key doesn't exist yet, this also creates the category since a
	 * category has no existence separate from the service rows under it.
	 */
	public static function create(array $data)
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_service_config';

		$category_key = sanitize_key($data['category_key'] ?? '');
		$service_key = sanitize_key($data['service_key'] ?? '');
		if (!$category_key || !$service_key) {
			return new WP_Error('nss_invalid', 'Category key and service key are required.');
		}
		if (self::get($service_key)) {
			return new WP_Error('nss_duplicate', 'A service with that key already exists.');
		}

		$next_sort = (int) $wpdb->get_var(
			$wpdb->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM ' . $table . ' WHERE category_key = %s', $category_key)
		);

		$now = current_time('mysql');
		$wpdb->insert($table, array(
			'category_key' => $category_key,
			'category_label' => sanitize_text_field($data['category_label'] ?? $category_key),
			'category_icon' => sanitize_text_field($data['category_icon'] ?? 'briefcase'),
			'service_key' => $service_key,
			'service_label' => sanitize_text_field($data['service_label'] ?? $service_key),
			'sort_order' => $next_sort,
			'active' => 1,
			'payment_required' => 0,
			'amount' => 0,
			'workflow_mode' => 'manual',
			'created_at' => $now,
			'updated_at' => $now,
		));

		return self::get($service_key);
	}

	/** Deletes a single subcategory (service row). */
	public static function delete($service_key)
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_service_config';
		return false !== $wpdb->delete($table, array('service_key' => sanitize_key($service_key)));
	}

	/** Deletes an entire category and every subcategory (service) under it. */
	public static function delete_category($category_key)
	{
		global $wpdb;
		$table = $wpdb->prefix . 'nss_service_config';
		return false !== $wpdb->delete($table, array('category_key' => sanitize_key($category_key)));
	}

	protected static function hydrate(array $row)
	{
		$row['fields'] = $row['fields_json'] ? (array) json_decode($row['fields_json'], true) : array();
		$row['required_documents'] = $row['required_documents'] ? (array) json_decode($row['required_documents'], true) : array();
		return $row;
	}
}
