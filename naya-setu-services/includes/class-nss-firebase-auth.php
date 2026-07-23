<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Verifies Firebase phone-auth ID tokens with plain PHP (openssl + curl) — no
 * Admin SDK, no Composer. Line-for-line port of naya-setu-courier's
 * NSC_Firebase_Auth, reading the same Firebase project config (see
 * NSS_Install::seed_settings()) so a phone verified in either plugin's OTP
 * flow is the same Firebase user.
 * Recipe: https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
class NSS_Firebase_Auth
{
	const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
	const CACHE_KEY = 'nss_firebase_certs';

	/**
	 * @return array|WP_Error Decoded token claims (incl. 'phone_number', 'user_id') on success.
	 */
	public static function verify($id_token)
	{
		$project_id = trim((string) (NSS_Settings::get('firebase', array())['projectId'] ?? ''));
		if ('' === $project_id) {
			return new WP_Error('nss_firebase_not_configured', 'Firebase is not configured (missing Project ID in Settings).');
		}

		$parts = explode('.', (string) $id_token);
		if (3 !== count($parts)) {
			return new WP_Error('nss_firebase_malformed', 'Malformed authentication token.');
		}
		list($header_b64, $payload_b64, $sig_b64) = $parts;

		$header = json_decode(self::base64url_decode($header_b64), true);
		$payload = json_decode(self::base64url_decode($payload_b64), true);
		$signature = self::base64url_decode($sig_b64);

		if (!is_array($header) || !is_array($payload) || false === $signature) {
			return new WP_Error('nss_firebase_malformed', 'Malformed authentication token.');
		}
		if ('RS256' !== ($header['alg'] ?? '')) {
			return new WP_Error('nss_firebase_bad_alg', 'Unexpected token algorithm.');
		}

		$certs = self::get_certs();
		if (is_wp_error($certs)) {
			return $certs;
		}
		$kid = $header['kid'] ?? '';
		if ('' === $kid || empty($certs[$kid])) {
			return new WP_Error('nss_firebase_unknown_kid', 'Could not verify token signature (unknown key).');
		}

		$public_key = openssl_pkey_get_public($certs[$kid]);
		if (!$public_key) {
			return new WP_Error('nss_firebase_bad_cert', 'Could not load verification certificate.');
		}
		$signing_input = $header_b64 . '.' . $payload_b64;
		$ok = 1 === openssl_verify($signing_input, $signature, $public_key, OPENSSL_ALGO_SHA256);
		if (!$ok) {
			return new WP_Error('nss_firebase_bad_signature', 'Token signature verification failed.');
		}

		$now = time();
		$leeway = 300;
		if (($payload['iss'] ?? '') !== 'https://securetoken.google.com/' . $project_id) {
			return new WP_Error('nss_firebase_bad_issuer', 'Token issuer mismatch.');
		}
		if (($payload['aud'] ?? '') !== $project_id) {
			return new WP_Error('nss_firebase_bad_audience', 'Token audience mismatch.');
		}
		if (empty($payload['exp']) || $payload['exp'] < ($now - $leeway)) {
			return new WP_Error('nss_firebase_expired', 'Session expired — please request a new OTP.');
		}
		if (empty($payload['iat']) || $payload['iat'] > ($now + $leeway)) {
			return new WP_Error('nss_firebase_bad_iat', 'Token is not yet valid.');
		}
		if (empty($payload['sub'])) {
			return new WP_Error('nss_firebase_no_sub', 'Token missing subject.');
		}
		if (empty($payload['phone_number'])) {
			return new WP_Error('nss_firebase_no_phone', 'Token has no verified phone number.');
		}

		$payload['user_id'] = $payload['sub'];
		return $payload;
	}

	protected static function get_certs()
	{
		$cached = get_transient(self::CACHE_KEY);
		if (is_array($cached)) {
			return $cached;
		}

		$response = wp_remote_get(self::CERTS_URL, array('timeout' => 15));
		if (is_wp_error($response)) {
			return new WP_Error('nss_firebase_certs_fetch_failed', 'Could not reach Google to verify the token. Try again.');
		}
		$body = json_decode(wp_remote_retrieve_body($response), true);
		if (!is_array($body)) {
			return new WP_Error('nss_firebase_certs_invalid', 'Could not verify the token (invalid certificate response).');
		}

		$max_age = 3600;
		$cache_control = wp_remote_retrieve_header($response, 'cache-control');
		if (is_string($cache_control) && preg_match('/max-age=(\d+)/', $cache_control, $m)) {
			$max_age = max(60, (int) $m[1]);
		}
		set_transient(self::CACHE_KEY, $body, $max_age);

		return $body;
	}

	protected static function base64url_decode($data)
	{
		$b64 = strtr($data, '-_', '+/');
		$padded = str_pad($b64, strlen($b64) % 4 === 0 ? strlen($b64) : strlen($b64) + (4 - strlen($b64) % 4), '=');
		return base64_decode($padded, true);
	}
}
