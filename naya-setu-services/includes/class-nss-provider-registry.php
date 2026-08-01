<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Resolves a service's api_provider_key to a live connector — mirrors
 * NSC_Courier_Registry. Falls back to the manual-workflow provider whenever
 * no key is set or the resolved connector isn't configured yet, so a service
 * marked workflow_mode=api behaves exactly like manual mode until an admin
 * fills in real credentials in Settings -> API Providers (Q5 of the brief).
 */
class NSS_Provider_Registry
{
	protected static $map = array(
		'pan_protean' => 'NSS_Provider_Pan_Protean',
		'pan_uti' => 'NSS_Provider_Pan_Uti',
		'gst_api' => 'NSS_Provider_Gst',
		'ckyc' => 'NSS_Provider_Ckyc',
		'penny_drop' => 'NSS_Provider_Penny_Drop',
		'decentro_banking' => 'NSS_Provider_Decentro_Banking',
		'sandbox' => 'NSS_Provider_Sandbox',
		'turtlefin_insurance' => 'NSS_Provider_Turtlefin_Insurance',
	);

	/** @return NSS_Provider_Interface */
	public static function get($api_provider_key)
	{
		if (isset(self::$map[$api_provider_key]) && class_exists(self::$map[$api_provider_key])) {
			$provider = new self::$map[$api_provider_key]();
			if ($provider->is_configured()) {
				return $provider;
			}
		}
		return new NSS_Provider_Manual();
	}

	public static function all_configured()
	{
		$out = array();
		foreach (self::$map as $key => $class) {
			if (class_exists($class)) {
				$provider = new $class();
				$out[$key] = array('label' => $provider->label(), 'configured' => $provider->is_configured());
			}
		}
		return $out;
	}
}
