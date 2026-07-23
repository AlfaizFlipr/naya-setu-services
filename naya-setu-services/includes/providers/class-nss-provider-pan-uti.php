<?php

if (!defined('ABSPATH')) {
	exit;
}

/** UTIITSL PAN API connector — stub, same pattern as NSS_Provider_Pan_Protean. */
class NSS_Provider_Pan_Uti implements NSS_Provider_Interface
{
	protected function config()
	{
		return NSS_Settings::provider('pan_uti');
	}

	public function label()
	{
		return 'UTI (PAN)';
	}

	public function is_configured()
	{
		$c = $this->config();
		return !empty($c['enabled']) && !empty($c['api_key']) && !empty($c['api_secret']);
	}

	public function submit(array $application)
	{
		if (!$this->is_configured()) {
			return new WP_Error('nss_provider_off', 'UTI PAN API is not configured.');
		}
		return new WP_Error('nss_provider_unimplemented', 'UTI PAN API integration is not implemented yet.');
	}

	public function check_status($reference)
	{
		return new WP_Error('nss_provider_unimplemented', 'UTI PAN API integration is not implemented yet.');
	}
}
