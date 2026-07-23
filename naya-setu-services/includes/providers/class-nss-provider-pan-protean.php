<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Protean (formerly NSDL) PAN API connector — stub. is_configured() is false
 * until an admin fills in real credentials in Settings -> API Providers, so
 * NSS_Provider_Registry falls back to NSS_Provider_Manual until then (same
 * honesty pattern as DTDC/Delhivery in naya-setu-courier before their keys
 * were set). Wire the real endpoint/payload here once Protean access exists.
 */
class NSS_Provider_Pan_Protean implements NSS_Provider_Interface
{
	protected function config()
	{
		return NSS_Settings::provider('pan_protean');
	}

	public function label()
	{
		return 'Protean (PAN)';
	}

	public function is_configured()
	{
		$c = $this->config();
		return !empty($c['enabled']) && !empty($c['api_key']) && !empty($c['api_secret']);
	}

	public function submit(array $application)
	{
		if (!$this->is_configured()) {
			return new WP_Error('nss_provider_off', 'Protean PAN API is not configured.');
		}
		// Real endpoint/payload go here once credentials are available.
		return new WP_Error('nss_provider_unimplemented', 'Protean PAN API integration is not implemented yet.');
	}

	public function check_status($reference)
	{
		return new WP_Error('nss_provider_unimplemented', 'Protean PAN API integration is not implemented yet.');
	}
}
