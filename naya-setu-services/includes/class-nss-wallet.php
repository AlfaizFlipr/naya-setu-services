<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * One wallet per account across both dashboards — if naya-setu-courier is
 * active on this site, delegate straight to its NSC_Wallet (same
 * wp_nsc_wallet_transactions table, same nsc_wallet_balance user meta) so a
 * top-up made in Courier is spendable here and vice versa. If courier isn't
 * installed, this plugin still reads/writes that same table shape directly —
 * no wallet table of its own, so there is only ever one ledger per user.
 */
class NSS_Wallet
{
	protected static function table()
	{
		global $wpdb;
		return $wpdb->prefix . 'nsc_wallet_transactions';
	}

	protected static function table_exists()
	{
		global $wpdb;
		$table = self::table();
		return $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table;
	}

	public static function is_available()
	{
		return class_exists('NSC_Wallet') || self::table_exists();
	}

	public static function balance($user_id)
	{
		if (class_exists('NSC_Wallet')) {
			return NSC_Wallet::balance($user_id);
		}
		if (!self::table_exists()) {
			return 0.0;
		}
		$cached = get_user_meta($user_id, 'nsc_wallet_balance', true);
		if ('' !== $cached) {
			return (float) $cached;
		}
		global $wpdb;
		$table = self::table();
		$credits = (float) $wpdb->get_var($wpdb->prepare("SELECT COALESCE(SUM(amount),0) FROM {$table} WHERE user_id = %d AND type = 'credit'", $user_id));
		$debits = (float) $wpdb->get_var($wpdb->prepare("SELECT COALESCE(SUM(amount),0) FROM {$table} WHERE user_id = %d AND type = 'debit'", $user_id));
		$balance = round($credits - $debits, 2);
		update_user_meta($user_id, 'nsc_wallet_balance', $balance);
		return $balance;
	}

	/** @return float|WP_Error New balance on success. */
	public static function debit($user_id, $amount, $ref_type = 'nss_application', $ref_id = 0, $note = '')
	{
		if ($amount <= 0) {
			return new WP_Error('nss_bad_amount', 'Amount must be greater than zero.');
		}
		if (class_exists('NSC_Wallet')) {
			return NSC_Wallet::debit($user_id, $amount, $ref_type, $ref_id, $note);
		}
		if (!self::table_exists()) {
			return new WP_Error('nss_wallet_unavailable', 'Wallet is not available on this site yet.');
		}
		if (self::balance($user_id) < $amount) {
			return new WP_Error('nss_insufficient_balance', 'Insufficient wallet balance. Please top up your wallet.');
		}
		$balance = round(self::balance($user_id) - $amount, 2);

		global $wpdb;
		$wpdb->insert(
			self::table(),
			array(
				'user_id' => $user_id,
				'type' => 'debit',
				'amount' => round($amount, 2),
				'balance_after' => $balance,
				'ref_type' => $ref_type,
				'ref_id' => (int) $ref_id,
				'note' => $note,
				'created_at' => current_time('mysql'),
			)
		);
		update_user_meta($user_id, 'nsc_wallet_balance', $balance);
		return $balance;
	}
}
