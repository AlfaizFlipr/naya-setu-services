<?php

if (!defined('ABSPATH')) {
	exit;
}

class NSS_Settings
{
	public static function all()
	{
		return get_option('nss_settings', array());
	}

	public static function get($key, $default = '')
	{
		$settings = self::all();
		return isset($settings[$key]) ? $settings[$key] : $default;
	}

	public static function update($key, $value)
	{
		$settings = self::all();
		$settings[$key] = $value;
		update_option('nss_settings', $settings);
	}

	public static function provider($key)
	{
		$providers = self::get('providers', array());
		return isset($providers[$key]) ? $providers[$key] : array();
	}

	public static function update_provider($key, array $data)
	{
		$providers = self::get('providers', array());
		$providers[$key] = wp_parse_args($data, isset($providers[$key]) ? $providers[$key] : array());
		self::update('providers', $providers);
	}
}
