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
		add_action('rest_api_init', array($this, 'start_rest_output_buffer'), 1);
		add_filter('rest_pre_serve_request', array($this, 'clean_rest_output_buffer'), 1);
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

	public function start_rest_output_buffer()
	{
		ob_start();
	}

	public function clean_rest_output_buffer($served)
	{
		if (ob_get_level() > 0) {
			ob_clean();
		}
		return $served;
	}
}
