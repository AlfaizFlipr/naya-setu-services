<?php

if (!defined('ABSPATH')) {
	exit;
}

/** GST Suvidha Provider (GSP) API connector — stub, same pattern as the PAN connectors. */
class NSS_Provider_Gst implements NSS_Provider_Interface
{
	protected function config()
	{
		return NSS_Settings::provider('gst_api');
	}

	public function label()
	{
		return 'GST API';
	}

	public function is_configured()
	{
		$c = $this->config();
		return !empty($c['enabled']) && !empty($c['api_key']) && !empty($c['api_secret']);
	}

	public function submit(array $application)
	{
		if (!$this->is_configured()) {
			return new WP_Error('nss_provider_off', 'GST API is not configured.');
		}
		return new WP_Error('nss_provider_unimplemented', 'GST API integration is not implemented yet.');
	}

	public function check_status($reference)
	{
		return new WP_Error('nss_provider_unimplemented', 'GST API integration is not implemented yet.');
	}
}
