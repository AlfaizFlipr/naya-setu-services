<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * SMS/WhatsApp/Email/Push status-change notifications. Sends for real only
 * when a provider is configured in Settings -> Notify (same honest pattern as
 * naya-setu-courier's NSC_Notify); otherwise just logs and records a
 * wp_nss_notifications row so the in-dashboard Notifications route still has
 * something to show.
 */
class NSS_Notify
{
	public static function status_changed($user_id, array $application, $status)
	{
		$config = NSS_Service_Config::get($application['service_key']);
		$service_label = $config ? $config['service_label'] : $application['service_key'];
		$labels = NSS_Status_Engine::labels();

		$text = sprintf(
			'Your application %s (%s) is now: %s',
			$application['application_no'] ?: ('#' . $application['id']),
			$service_label,
			$labels[$status] ?? $status
		);

		self::record($user_id, 'status_changed', $text);

		$user = get_user_by('id', $user_id);
		$mobile = get_user_meta($user_id, 'nsc_mobile', true);
		$notify = NSS_Settings::get('notify', array());

		if ($mobile && !empty($notify['sms_provider']) && !empty($notify['sms_api_key'])) {
			self::send_sms($mobile, $text, $notify);
		} else {
			NSS_Logger::log('notify', 'SMS (not sent, no provider configured): ' . $text, array('mobile' => $mobile));
		}

		if ($mobile && !empty($notify['whatsapp_provider']) && !empty($notify['whatsapp_api_key'])) {
			self::send_whatsapp($mobile, $text, $notify);
		} else {
			NSS_Logger::log('notify', 'WhatsApp (not sent, no provider configured): ' . $text, array('mobile' => $mobile));
		}

		if ($user && is_email($user->user_email)) {
			wp_mail($user->user_email, get_bloginfo('name') . ' — Application Update', $text);
		}
	}

	protected static function record($user_id, $event_key, $message)
	{
		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'nss_notifications',
			array(
				'user_id' => (int) $user_id,
				'channel' => 'push',
				'event_key' => $event_key,
				'message' => $message,
				'status' => 'queued',
				'created_at' => current_time('mysql'),
			)
		);
	}

	public static function list_for_user($user_id)
	{
		global $wpdb;
		return $wpdb->get_results(
			$wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_notifications WHERE user_id = %d ORDER BY id DESC LIMIT 100', (int) $user_id),
			ARRAY_A
		);
	}

	protected static function send_sms($mobile, $text, array $notify)
	{
		$response = wp_remote_post(
			apply_filters('nss_sms_endpoint', '', $notify),
			array('timeout' => 15, 'body' => array('mobile' => $mobile, 'message' => $text, 'api_key' => $notify['sms_api_key']))
		);
		NSS_Logger::log('notify-sms', is_wp_error($response) ? $response->get_error_message() : 'sent', array('mobile' => $mobile));
	}

	protected static function send_whatsapp($mobile, $text, array $notify)
	{
		$response = wp_remote_post(
			apply_filters('nss_whatsapp_endpoint', '', $notify),
			array('timeout' => 15, 'body' => array('mobile' => $mobile, 'message' => $text, 'api_key' => $notify['whatsapp_api_key']))
		);
		NSS_Logger::log('notify-whatsapp', is_wp_error($response) ? $response->get_error_message() : 'sent', array('mobile' => $mobile));
	}
}
