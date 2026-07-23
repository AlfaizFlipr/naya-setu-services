<?php

if (!defined('ABSPATH')) {
	exit;
}

/** CERSAI CKYC Registry API connector — stub, same pattern as the PAN connectors. */
class NSS_Provider_Ckyc implements NSS_Provider_Interface
{
	protected function config()
	{
		return NSS_Settings::provider('ckyc');
	}

	public function label()
	{
		return 'CKYC';
	}

	public function is_configured()
	{
		$c = $this->config();
		return !empty($c['enabled']) && !empty($c['api_key']) && !empty($c['api_secret']);
	}

	public function submit(array $application)
	{
		if (!$this->is_configured()) {
			return new WP_Error('nss_provider_off', 'CKYC API is not configured.');
		}
		return new WP_Error('nss_provider_unimplemented', 'CKYC API integration is not implemented yet.');
	}

	public function check_status($reference)
	{
		return new WP_Error('nss_provider_unimplemented', 'CKYC API integration is not implemented yet.');
	}
}
