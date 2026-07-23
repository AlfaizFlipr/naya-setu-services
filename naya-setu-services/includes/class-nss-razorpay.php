<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Minimal Razorpay Orders API client (REST, no SDK) — near-identical port of
 * naya-setu-courier's NSC_Razorpay. Only invoked when a service's
 * payment_required flag is set (Q10 of the brief); free services skip
 * straight to submission.
 */
class NSS_Razorpay
{
	protected static function keys()
	{
		$payments = NSS_Settings::get('payments', array());
		return array(
			'key_id' => trim((string) ($payments['razorpay_key_id'] ?? '')),
			'key_secret' => trim((string) ($payments['razorpay_key_secret'] ?? '')),
		);
	}

	public static function is_configured()
	{
		$keys = self::keys();
		$payments = NSS_Settings::get('payments', array());
		return !empty($payments['razorpay_enabled']) && $keys['key_id'] && $keys['key_secret'];
	}

	/**
	 * @return array|WP_Error { id, amount, currency }
	 */
	public static function create_order($amount_inr, $receipt)
	{
		if (!self::is_configured()) {
			return new WP_Error('nss_razorpay_off', 'Online payment is not configured yet. Please contact support.');
		}
		$keys = self::keys();

		$response = wp_remote_post(
			'https://api.razorpay.com/v1/orders',
			array(
				'timeout' => 30,
				'headers' => array(
					'Authorization' => 'Basic ' . base64_encode($keys['key_id'] . ':' . $keys['key_secret']),
					'Content-Type' => 'application/json',
				),
				'body' => wp_json_encode(array(
					'amount' => (int) round($amount_inr * 100),
					'currency' => 'INR',
					'receipt' => substr($receipt, 0, 40),
				)),
			)
		);

		if (is_wp_error($response)) {
			NSS_Logger::error('razorpay', $response->get_error_message());
			return new WP_Error('nss_razorpay_error', 'Could not reach the payment gateway. Please try again.');
		}

		$code = wp_remote_retrieve_response_code($response);
		$body = json_decode(wp_remote_retrieve_body($response), true);
		NSS_Logger::log('razorpay', 'create_order -> ' . $code, $body, ($code >= 200 && $code < 300) ? 'info' : 'error');

		if ($code < 200 || $code >= 300 || empty($body['id'])) {
			return new WP_Error('nss_razorpay_error', $body['error']['description'] ?? 'Payment order creation failed.');
		}

		return array('id' => $body['id'], 'amount' => $body['amount'], 'currency' => $body['currency']);
	}

	public static function verify_signature($order_id, $payment_id, $signature)
	{
		if (!self::is_configured()) {
			return new WP_Error('nss_razorpay_off', 'Online payment is not configured.');
		}
		if (!$order_id || !$payment_id || !$signature) {
			return new WP_Error('nss_razorpay_bad_payload', 'Missing payment verification data.');
		}

		$keys = self::keys();
		$expected = hash_hmac('sha256', $order_id . '|' . $payment_id, $keys['key_secret']);

		if (!hash_equals($expected, $signature)) {
			NSS_Logger::error('razorpay', 'Signature mismatch', array('order_id' => $order_id, 'payment_id' => $payment_id));
			return new WP_Error('nss_razorpay_signature', 'Payment verification failed.');
		}

		return true;
	}
}
