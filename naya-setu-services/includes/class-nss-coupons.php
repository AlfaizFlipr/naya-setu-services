<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Shares naya-setu-courier's coupon pool (wp_nsc_coupons) the same way
 * NSS_Wallet shares its wallet ledger — one set of promo codes usable across
 * both dashboards. Delegates to NSC_Coupons when that plugin is active,
 * otherwise reads the same table directly if it exists.
 */
class NSS_Coupons
{
	protected static function table()
	{
		global $wpdb;
		return $wpdb->prefix . 'nsc_coupons';
	}

	protected static function table_exists()
	{
		global $wpdb;
		$table = self::table();
		return $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
	}

	public static function is_available()
	{
		return class_exists('NSC_Coupons') || self::table_exists();
	}

	protected static function find($code)
	{
		global $wpdb;
		return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . self::table() . ' WHERE code = %s', strtoupper(trim($code))));
	}

	/**
	 * @return array|WP_Error { discount_amount, code }
	 */
	public static function apply($code, $amount)
	{
		if (class_exists('NSC_Coupons')) {
			return NSC_Coupons::apply($code, $amount);
		}
		if (!self::table_exists()) {
			return new WP_Error('nss_coupons_unavailable', 'Coupons are not available on this site yet.');
		}

		$coupon = self::find($code);
		if (!$coupon) {
			return new WP_Error('nss_invalid_coupon', 'Invalid coupon code.');
		}
		if (!$coupon->active) {
			return new WP_Error('nss_inactive_coupon', 'This coupon is no longer active.');
		}
		if ($coupon->expires_at && strtotime($coupon->expires_at) < current_time('timestamp')) {
			return new WP_Error('nss_expired_coupon', 'This coupon has expired.');
		}
		if ($coupon->max_uses > 0 && $coupon->used_count >= $coupon->max_uses) {
			return new WP_Error('nss_exhausted_coupon', 'This coupon has reached its usage limit.');
		}

		$discount = 'percent' === $coupon->discount_type
			? round($amount * (float) $coupon->discount_value / 100, 2)
			: (float) $coupon->discount_value;

		return array('discount_amount' => min($discount, $amount), 'code' => $coupon->code);
	}

	public static function mark_used($code)
	{
		if (class_exists('NSC_Coupons')) {
			NSC_Coupons::mark_used($code);
			return;
		}
		if (!self::table_exists()) {
			return;
		}
		global $wpdb;
		$wpdb->query($wpdb->prepare('UPDATE ' . self::table() . ' SET used_count = used_count + 1 WHERE code = %s', strtoupper(trim($code))));
	}
}
