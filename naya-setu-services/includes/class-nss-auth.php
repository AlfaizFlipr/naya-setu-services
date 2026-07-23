<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Shared account-creation/login logic, ported from naya-setu-courier's
 * NSC_Auth so both plugins manage exactly the same accounts: same role slugs
 * (nsc_customer/nsc_associate/nsc_operator), same user-meta keys (nsc_mobile,
 * nsc_firebase_uid, nsc_associate_code, nsc_associate_status, nsc_referred_by).
 * A user created here logs into naya-setu-courier with the same credentials
 * and vice versa — one WordPress site, one wp_users table, no sync needed.
 */
class NSS_Auth
{
	/**
	 * @param array $args name, email, mobile, password, role ('customer'|'associate'),
	 *                    associate_code, referral_code, firebase_uid (optional)
	 * @return array|WP_Error ['user_id'=>int,'pending'=>bool] on success
	 */
	public static function create_account(array $args)
	{
		$name = sanitize_text_field($args['name'] ?? '');
		$email = sanitize_email($args['email'] ?? '');
		$mobile = self::normalize_mobile($args['mobile'] ?? '');
		$password = (string) ($args['password'] ?? '');
		$role = in_array($args['role'] ?? '', array('associate'), true) ? 'associate' : 'customer';
		$associate_code = sanitize_text_field($args['associate_code'] ?? '');
		$referral_code = sanitize_text_field($args['referral_code'] ?? '');
		$firebase_uid = sanitize_text_field($args['firebase_uid'] ?? '');

		if (!$name || !is_email($email) || strlen($password) < 6) {
			return new WP_Error('nss_invalid', 'Please fill all required fields correctly (password must be at least 6 characters).');
		}
		if (email_exists($email)) {
			return new WP_Error('nss_exists', 'An account with this email already exists — please log in instead.');
		}
		if ($mobile && self::find_by_mobile($mobile)) {
			return new WP_Error('nss_exists', 'An account with this mobile number already exists — please log in instead.');
		}
		if ('associate' === $role) {
			if ('' === $associate_code) {
				return new WP_Error('nss_invalid', 'Please choose an Associate Code.');
			}
			if (NSS_Associate::code_exists($associate_code)) {
				return new WP_Error('nss_code_taken', 'That Associate Code is already taken — please choose another.');
			}
		}

		$username = sanitize_user(current(explode('@', $email)) . wp_rand(100, 999));
		$user_id = wp_create_user($username, $password, $email);
		if (is_wp_error($user_id)) {
			return new WP_Error('nss_failed', 'Could not create your account. Please try again.');
		}

		wp_update_user(array('ID' => $user_id, 'display_name' => $name, 'first_name' => $name));
		if ($mobile) {
			update_user_meta($user_id, 'nsc_mobile', $mobile);
		}
		if ($firebase_uid) {
			update_user_meta($user_id, 'nsc_firebase_uid', $firebase_uid);
		}

		$user = new WP_User($user_id);
		$pending = false;

		if ('associate' === $role) {
			$user->set_role('nsc_associate');
			update_user_meta($user_id, 'nsc_associate_code', $associate_code);
			update_user_meta($user_id, 'nsc_associate_status', 'pending');
			$pending = true;
		} else {
			$user->set_role('nsc_customer');
			if ('' !== $referral_code) {
				$associate = NSS_Associate::get_by_code($referral_code);
				if ($associate && NSS_Associate::is_approved($associate->ID)) {
					update_user_meta($user_id, 'nsc_referred_by', $referral_code);
				}
			}
		}

		return array('user_id' => $user_id, 'pending' => $pending);
	}

	public static function start_session_or_error($user_id)
	{
		$user = get_user_by('id', (int) $user_id);
		if (!$user) {
			return new WP_Error('nss_no_user', 'Account not found.');
		}
		if (in_array('nsc_associate', $user->roles, true) && !NSS_Associate::is_approved($user_id)) {
			$status = NSS_Associate::status($user_id);
			return new WP_Error(
				'nss_pending',
				'rejected' === $status
					? 'Your Associate application was not approved. Contact support for details.'
					: 'Your Associate account is awaiting admin approval. You will be able to log in once approved.'
			);
		}
		wp_set_current_user($user_id);
		wp_set_auth_cookie($user_id, true);
		update_user_meta($user_id, 'nsc_last_login_at', current_time('mysql'));
		return true;
	}

	public static function find_by_mobile($mobile)
	{
		$mobile = self::normalize_mobile($mobile);
		if ('' === $mobile) {
			return null;
		}
		$users = get_users(array('meta_key' => 'nsc_mobile', 'meta_value' => $mobile, 'number' => 1));
		return $users ? $users[0] : null;
	}

	public static function find_by_firebase_uid($uid)
	{
		$uid = sanitize_text_field($uid);
		if ('' === $uid) {
			return null;
		}
		$users = get_users(array('meta_key' => 'nsc_firebase_uid', 'meta_value' => $uid, 'number' => 1));
		return $users ? $users[0] : null;
	}

	/** Firebase phone_number claims are E.164 (+91XXXXXXXXXX); we store the local 10-digit form. */
	public static function normalize_mobile($raw)
	{
		$digits = preg_replace('/\D/', '', (string) $raw);
		return substr($digits, -10);
	}
}
