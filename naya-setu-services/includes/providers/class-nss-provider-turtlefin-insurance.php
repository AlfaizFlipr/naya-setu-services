<?php

if (!defined('ABSPATH')) {
	exit;
}

/** Turtlefin OneAPI token and quote adapter. Product payloads are configured per enabled product. */
class NSS_Provider_Turtlefin_Insurance implements NSS_Provider_Interface
{
	protected function config()
	{
		return NSS_Settings::provider('turtlefin_insurance');
	}

	public function label()
	{
		return 'Turtlefin OneAPI (Insurance)';
	}

	public function is_configured()
	{
		$c = $this->config();
		return !empty($c['enabled']) && !empty($c['api_key']) && !empty($c['api_secret']) && !empty($c['base_url']);
	}

	protected function access_token()
	{
		$c = $this->config();
		$token_url = untrailingslashit($c['base_url']) . '/' . ltrim($c['token_path'] ?? '/v1/token/issue', '/');
		$response = wp_remote_post($token_url, array(
			'timeout' => 20,
			'headers' => array('Accept' => 'application/json', 'Authorization' => 'Basic ' . base64_encode($c['api_key'] . ':' . $c['api_secret'])),
		));
		if (is_wp_error($response) || (int) wp_remote_retrieve_response_code($response) >= 300) {
			return new WP_Error('nss_turtlefin_auth', 'Could not authenticate with Turtlefin.');
		}
		$body = json_decode(wp_remote_retrieve_body($response), true);
		$token = $body['access_token'] ?? $body['token'] ?? $body['data']['access_token'] ?? '';
		return $token ? $token : new WP_Error('nss_turtlefin_auth', 'Turtlefin did not return an access token.');
	}

	/** Replaces {{form.field}}, {{profile.field}}, and {{application.field}} in an admin-supplied sandbox schema. */
	protected function interpolate($value, array $application)
	{
		if (is_array($value)) {
			foreach ($value as $key => $item) {
				$value[$key] = $this->interpolate($item, $application);
			}
			return $value;
		}
		if (!is_string($value)) {
			return $value;
		}
		return preg_replace_callback('/\\{\\{(form|profile|application)\\.([a-zA-Z0-9_]+)\\}\\}/', function ($match) use ($application) {
			$source = 'form' === $match[1] ? ($application['form_data'] ?? array()) : ('profile' === $match[1] ? ($application['profile'] ?? array()) : $application);
			return isset($source[$match[2]]) && is_scalar($source[$match[2]]) ? (string) $source[$match[2]] : '';
		}, $value);
	}

	public function submit(array $application)
	{
		if (!$this->is_configured()) {
			return new WP_Error('nss_provider_off', 'Turtlefin Insurance is not configured.');
		}
		$c = $this->config();
		$service_products = array(
			'insurance_bike' => 'bike', 'insurance_vehicle' => 'private-car', 'insurance_private_car' => 'private-car',
			'insurance_health' => 'group-hospicash', 'insurance_group_personal_accident' => 'group-personal-accident',
			'insurance_fire' => 'fire', 'insurance_marine' => 'marine', 'insurance_workmen_compensation' => 'workmen-compensation',
			'insurance_mobile' => 'mobile', 'insurance_consumer_goods' => 'consumer-goods', 'insurance_shop' => 'shop',
			'insurance_active_360' => 'active-360', 'insurance_wellness' => 'wellness',
		);
		$product = $service_products[$application['service_key'] ?? ''] ?? '';
		$templates = json_decode($c['quote_payload_templates'] ?? '{}', true);
		if (!$product || empty($templates[$product]) || !is_array($templates[$product])) {
			return new WP_Error('nss_turtlefin_mapping_required', 'Insurance product mapping is not configured. Add the Turtlefin quote payload template for this enabled product before accepting applications.');
		}
		$token = $this->access_token();
		if (is_wp_error($token)) {
			return $token;
		}
		$payload = $this->interpolate($templates[$product], $application);
		$payload = apply_filters('nss_turtlefin_quote_payload', $payload, $application, $product);
		$response = wp_remote_post(untrailingslashit($c['base_url']) . '/v1/products/' . rawurlencode($product) . '/quotes', array(
			'timeout' => 30,
			'headers' => array('Accept' => 'application/json', 'Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $token),
			'body' => wp_json_encode($payload),
		));
		if (is_wp_error($response) || (int) wp_remote_retrieve_response_code($response) >= 300) {
			return new WP_Error('nss_turtlefin_quote_error', 'Insurance quote could not be created.');
		}
		$body = json_decode(wp_remote_retrieve_body($response), true);
		$data = is_array($body['data'] ?? null) ? $body['data'] : (array) $body;
		$reference = (string) ($data['quoteId'] ?? $data['quote_id'] ?? $body['quoteId'] ?? '');
		if (!$reference) {
			return new WP_Error('nss_turtlefin_quote_error', 'Turtlefin did not return a quote reference.');
		}
		return array('reference' => $reference, 'status' => 'in_progress', 'remark' => 'Insurance quote created. Select a plan to continue.');
	}

	public function check_status($reference)
	{
		return new WP_Error('nss_turtlefin_status_via_webhook', 'Insurance status must be updated from the verified Turtlefin webhook.');
	}
}
