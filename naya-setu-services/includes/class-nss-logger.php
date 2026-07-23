<?php

if (!defined('ABSPATH')) {
	exit;
}

class NSS_Logger
{
	public static function log($context, $message, $data = null, $level = 'info')
	{
		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'nss_api_logs',
			array(
				'context' => $context,
				'level' => $level,
				'message' => $message,
				'request_json' => '',
				'response_json' => null === $data ? '' : wp_json_encode($data),
				'created_at' => current_time('mysql'),
			)
		);
	}

	public static function error($context, $message, $data = null)
	{
		self::log($context, $message, $data, 'error');
	}
}
