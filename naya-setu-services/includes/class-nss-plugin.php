<?php

if (!defined('ABSPATH')) {
	exit;
}

class NSS_Plugin
{
	private static $instance = null;

	public static function instance()
	{
		if (null === self::$instance) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct()
	{
		add_action('init', array($this, 'register_shortcodes'));
		add_action('rest_api_init', array($this, 'register_rest'));
		add_action('wp_login', array('NSS_Associate', 'track_login'), 10, 2);

		new NSS_Portal();
	}

	public function register_shortcodes()
	{
		add_shortcode('nayasetu_services', array('NSS_Portal', 'render'));
	}

	public function register_rest()
	{
		(new NSS_Rest())->register();
	}
}
