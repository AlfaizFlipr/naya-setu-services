<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Master Profile — merges wp_users (name/email/mobile, already collected at
 * signup) with wp_nss_profiles (everything else common across services) and
 * the current photo/signature from the document vault. Every service form's
 * "Common Details" block reads from here; it is never re-entered per service.
 */
class NSS_Profile
{
	public static function for_user($user_id)
	{
		$user_id = (int) $user_id;
		$user = get_user_by('id', $user_id);
		if (!$user) {
			return new WP_Error('nss_no_user', 'User not found.');
		}

		global $wpdb;
		$row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_profiles WHERE user_id = %d', $user_id), ARRAY_A);
		if (!$row) {
			$row = array(
				'father_name' => '',
				'mother_name' => '',
				'dob' => '',
				'gender' => '',
				'address1' => '',
				'address2' => '',
				'district' => '',
				'state' => '',
				'pincode' => '',
				'aadhaar_no' => '',
				'samagra_id' => '',
				'pan_no' => '',
				'photo_doc_id' => 0,
				'signature_doc_id' => 0,
				'business_json' => '',
			);
		}

		$photo = (int) ($row['photo_doc_id'] ?? 0) ? NSS_Documents::get((int) $row['photo_doc_id']) : null;
		$signature = (int) ($row['signature_doc_id'] ?? 0) ? NSS_Documents::get((int) $row['signature_doc_id']) : null;

		return array(
			'user_id' => $user_id,
			'name' => $user->display_name,
			'email' => $user->user_email,
			'mobile' => get_user_meta($user_id, 'nsc_mobile', true),
			'father_name' => $row['father_name'],
			'mother_name' => $row['mother_name'],
			'dob' => $row['dob'],
			'gender' => $row['gender'],
			'address1' => $row['address1'],
			'address2' => $row['address2'],
			'district' => $row['district'],
			'state' => $row['state'],
			'pincode' => $row['pincode'],
			'aadhaar_no' => $row['aadhaar_no'],
			'samagra_id' => $row['samagra_id'],
			'pan_no' => $row['pan_no'],
			'photo_url' => $photo ? NSS_Documents::url($photo) : '',
			'signature_url' => $signature ? NSS_Documents::url($signature) : '',
			'business' => $row['business_json'] ? json_decode($row['business_json'], true) : null,
			'complete' => self::is_complete($row, $user),
		);
	}

	public static function update($user_id, array $data)
	{
		global $wpdb;
		$user_id = (int) $user_id;
		$table = $wpdb->prefix . 'nss_profiles';

		$allowed = array('father_name', 'mother_name', 'dob', 'gender', 'address1', 'address2', 'district', 'state', 'pincode', 'aadhaar_no', 'samagra_id', 'pan_no', 'photo_doc_id', 'signature_doc_id');
		$values = array('user_id' => $user_id, 'updated_at' => current_time('mysql'));
		foreach ($allowed as $field) {
			if (array_key_exists($field, $data)) {
				$values[$field] = in_array($field, array('photo_doc_id', 'signature_doc_id'), true) ? (int) $data[$field] : sanitize_text_field($data[$field]);
			}
		}
		if (array_key_exists('business', $data)) {
			$values['business_json'] = wp_json_encode($data['business']);
		}

		$exists = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE user_id = %d", $user_id));
		if ($exists) {
			$wpdb->update($table, $values, array('user_id' => $user_id));
		} else {
			$values['created_at'] = current_time('mysql');
			$wpdb->insert($table, $values);
		}

		if (isset($data['name'])) {
			wp_update_user(array('ID' => $user_id, 'display_name' => sanitize_text_field($data['name']), 'first_name' => sanitize_text_field($data['name'])));
		}
		if (isset($data['mobile'])) {
			update_user_meta($user_id, 'nsc_mobile', NSS_Auth::normalize_mobile($data['mobile']));
		}

		return self::for_user($user_id);
	}

	protected static function is_complete($row, $user)
	{
		return (bool) ($user->display_name && get_user_meta($user->ID, 'nsc_mobile', true) && $row['address1'] && $row['pincode']);
	}
}
