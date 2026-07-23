<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Same nsc_associate_code / nsc_associate_status user-meta keys as
 * naya-setu-courier's NSC_Associate — an Associate approved in one plugin's
 * admin is approved in both, because it's the same account/meta row. Referral
 * revenue roll-ups stay in the courier plugin (shipment-specific); this class
 * only owns the account-approval gate that both dashboards need at login.
 */
class NSS_Associate
{
	public static function track_login($user_login, $user)
	{
		update_user_meta($user->ID, 'nsc_last_login_at', current_time('mysql'));
	}

	public static function code_exists($code)
	{
		return (bool) self::get_by_code($code);
	}

	public static function get_by_code($code)
	{
		$code = sanitize_text_field($code);
		if ('' === $code) {
			return null;
		}
		$users = get_users(array('meta_key' => 'nsc_associate_code', 'meta_value' => $code, 'number' => 1));
		return $users ? $users[0] : null;
	}

	public static function status($user_id)
	{
		return get_user_meta((int) $user_id, 'nsc_associate_status', true) ?: 'pending';
	}

	public static function is_approved($user_id)
	{
		return 'approved' === self::status($user_id);
	}

	public static function list_pending()
	{
		$users = get_users(array(
			'role' => 'nsc_associate',
			'meta_key' => 'nsc_associate_status',
			'meta_value' => 'pending',
			'orderby' => 'registered',
			'order' => 'ASC',
		));
		return array_map(array(__CLASS__, 'summarize'), $users);
	}

	public static function summarize(WP_User $user)
	{
		return array(
			'id' => $user->ID,
			'name' => $user->display_name,
			'email' => $user->user_email,
			'mobile' => get_user_meta($user->ID, 'nsc_mobile', true),
			'associate_code' => get_user_meta($user->ID, 'nsc_associate_code', true),
			'status' => self::status($user->ID),
			'registered' => $user->user_registered,
		);
	}

	public static function approve($user_id)
	{
		$user = get_user_by('id', (int) $user_id);
		if (!$user || !in_array('nsc_associate', $user->roles, true)) {
			return new WP_Error('nss_not_associate', 'Not an associate account.');
		}
		update_user_meta($user_id, 'nsc_associate_status', 'approved');
		return true;
	}

	public static function reject($user_id)
	{
		$user = get_user_by('id', (int) $user_id);
		if (!$user || !in_array('nsc_associate', $user->roles, true)) {
			return new WP_Error('nss_not_associate', 'Not an associate account.');
		}
		update_user_meta($user_id, 'nsc_associate_status', 'rejected');
		return true;
	}
}
