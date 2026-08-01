<?php

if (!defined('ABSPATH')) {
	exit;
}

/** Decentro Account Validation (penniless/penny-drop) adapter. */
class NSS_Provider_Decentro_Banking implements NSS_Provider_Interface
{
	protected function config()
	{
		return NSS_Settings::provider('decentro_banking');
	}

	public function label()
	{
		return 'Decentro Banking (Account Validation)';
	}

	public function is_configured()
	{
		$c = $this->config();
		return !empty($c['enabled']) && !empty($c['api_key']) && !empty($c['api_secret']) && !empty($c['module_secret']) && !empty($c['provider_secret']);
	}

	protected function base_url()
	{
		$c = $this->config();
		$url = untrailingslashit($c['base_url'] ?? 'https://in.staging.decentro.tech');
		// Preserve existing settings while moving the integration to Decentro's
		// current Bank Validation endpoint hosts.
		if ('https://staging.api.decentro.tech' === $url) {
			return 'https://in.staging.decentro.tech';
		}
		if ('https://api.decentro.tech' === $url) {
			return 'https://in.decentro.tech';
		}
		return $url;
	}

	protected function headers($include_module_secret = true)
	{
		$c = $this->config();
		$headers = array(
			'Content-Type' => 'application/json',
			'Accept' => 'application/json',
			'client_id' => $c['api_key'],
			'client_secret' => $c['api_secret'],
		);
		if ($include_module_secret && !empty($c['module_secret'])) {
			$headers['module_secret'] = $c['module_secret'];
		}
		if ($include_module_secret && !empty($c['provider_secret'])) {
			$headers['provider_secret'] = $c['provider_secret'];
		}
		return $headers;
	}

	public function submit(array $application)
	{
		if (!$this->is_configured()) {
			return new WP_Error('nss_provider_off', 'Decentro Banking is not configured.');
		}
		$form = $application['form_data'] ?? array();
		$account = preg_replace('/\s+/', '', (string) ($form['account_number'] ?? ''));
		$ifsc = strtoupper(trim((string) ($form['ifsc_code'] ?? '')));
		if (!$account || !preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $ifsc)) {
			return new WP_Error('nss_invalid_bank_details', 'Enter a valid account number and IFSC code.');
		}

		$reference = 'NSSAV' . (int) ($application['application_id'] ?? 0) . wp_generate_uuid4();
		$validation_type = !empty($form['validation_type']) ? sanitize_key($form['validation_type']) : 'penniless';
		if (!in_array($validation_type, array('penniless', 'pennydrop', 'hybrid'), true)) {
			$validation_type = 'penniless';
		}
		$beneficiary = array(
			'account_number' => $account,
			'ifsc' => $ifsc,
		);
		if (!empty($form['account_holder_name'])) {
			$beneficiary['name'] = sanitize_text_field($form['account_holder_name']);
		}
		$payload = array(
			'reference_id' => substr($reference, 0, 50),
			'purpose_message' => 'Bank account verification',
			'validation_type' => $validation_type,
			'perform_name_match' => false,
			'beneficiary_details' => $beneficiary,
		);
		$url = $this->base_url() . '/core_banking/money_transfer/validate_account';
		$response = wp_remote_post($url, array('timeout' => 25, 'headers' => $this->headers(), 'body' => wp_json_encode($payload)));
		if (is_wp_error($response)) {
			return new WP_Error('nss_decentro_unavailable', 'Bank verification could not be reached. Please try again shortly.', array(
				'transport_error_code' => $response->get_error_code(),
				'transport_error_data' => $response->get_error_data(),
			));
		}
		$code = (int) wp_remote_retrieve_response_code($response);
		$raw_body = wp_remote_retrieve_body($response);
		$body = json_decode($raw_body, true);
		if ($code < 200 || $code >= 300 || !is_array($body)) {
			return new WP_Error('nss_decentro_error', 'Bank verification was declined by the provider.', array(
				'http_status' => $code,
				'provider_response' => is_array($body) ? $body : $raw_body,
			));
		}
		$data = is_array($body['data'] ?? null) ? $body['data'] : $body;
		$provider_reference = (string) ($body['decentroTxnId'] ?? $body['decentro_txn_id'] ?? $data['decentro_txn_id'] ?? $payload['reference_id']);
		$api_status = strtolower((string) ($body['status'] ?? $body['api_status'] ?? ''));
		$transaction_status = strtolower((string) ($body['transactionStatus'] ?? $data['transaction_status'] ?? ''));
		$account_status = strtolower((string) ($body['accountStatus'] ?? $data['account_status'] ?? $data['status'] ?? ''));
		if ('failure' === $api_status || 'failure' === $transaction_status || in_array($account_status, array('invalid', 'failure', 'failed', 'rejected'), true)) {
			return new WP_Error('nss_decentro_validation_failed', sanitize_text_field($body['providerMessage'] ?? $body['message'] ?? 'The bank account could not be verified.'), array('provider_response' => $body));
		}
		if (in_array($account_status, array('valid', 'success', 'verified', 'completed'), true) || ('success' === $api_status && 'success' === $transaction_status)) {
			$form['_verification_status'] = 'success';
			$form['_verified_name'] = $data['name'] ?? $data['beneficiary_name'] ?? $form['account_holder_name'] ?? 'Verified Account';
			$form['_verified_details'] = array(
				'Account Number' => $account,
				'IFSC Code' => $ifsc,
				'Verified Name' => $form['_verified_name'],
				'Provider Transaction ID' => $provider_reference,
			);
			return array('reference' => $provider_reference, 'status' => 'completed', 'remark' => 'Bank account verified.', 'form_data' => $form);
		}
		return array('reference' => $provider_reference, 'status' => 'in_progress', 'remark' => 'Bank verification is pending.', 'form_data' => $form);
	}

	public function check_status($reference)
	{
		if (!$this->is_configured() || !$reference) {
			return new WP_Error('nss_provider_off', 'Decentro Banking is not configured.');
		}
		return new WP_Error('nss_decentro_status_unsupported', 'This Decentro bank validation is synchronous; use the result returned when it is submitted.');
	}
}
