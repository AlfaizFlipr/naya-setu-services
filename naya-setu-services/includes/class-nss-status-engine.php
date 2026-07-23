<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The one status graph every service shares (brief section 8):
 * draft -> submitted -> in_progress <-> pending_user -> completed, or
 * -> rejected from any non-terminal state. Every transition is written to
 * wp_nss_status_log so admin has a full audit trail per application.
 */
class NSS_Status_Engine
{
	const DRAFT = 'draft';
	const SUBMITTED = 'submitted';
	const IN_PROGRESS = 'in_progress';
	const PENDING_USER = 'pending_user';
	const COMPLETED = 'completed';
	const REJECTED = 'rejected';

	protected static $graph = array(
		self::DRAFT => array(self::SUBMITTED),
		self::SUBMITTED => array(self::IN_PROGRESS, self::REJECTED),
		self::IN_PROGRESS => array(self::PENDING_USER, self::COMPLETED, self::REJECTED),
		self::PENDING_USER => array(self::IN_PROGRESS, self::REJECTED),
		self::COMPLETED => array(),
		self::REJECTED => array(),
	);

	public static function can_transition($from, $to)
	{
		return in_array($to, self::$graph[$from] ?? array(), true);
	}

	/**
	 * @return true|WP_Error
	 */
	public static function transition($application_id, $from, $to, $note = '', $changed_by = 0)
	{
		if (!self::can_transition($from, $to)) {
			return new WP_Error('nss_bad_transition', sprintf('Cannot move an application from "%s" to "%s".', $from, $to));
		}

		global $wpdb;
		$table = $wpdb->prefix . 'nss_applications';
		$update = array('status' => $to, 'status_note' => sanitize_text_field($note), 'updated_at' => current_time('mysql'));
		if (self::SUBMITTED === $to) {
			$update['submitted_at'] = current_time('mysql');
		}
		if (self::COMPLETED === $to) {
			$update['completed_at'] = current_time('mysql');
		}
		$wpdb->update($table, $update, array('id' => (int) $application_id));

		$wpdb->insert(
			$wpdb->prefix . 'nss_status_log',
			array(
				'application_id' => (int) $application_id,
				'from_status' => $from,
				'to_status' => $to,
				'note' => sanitize_text_field($note),
				'changed_by' => (int) $changed_by,
				'created_at' => current_time('mysql'),
			)
		);

		return true;
	}

	public static function log_for($application_id)
	{
		global $wpdb;
		return $wpdb->get_results(
			$wpdb->prepare('SELECT * FROM ' . $wpdb->prefix . 'nss_status_log WHERE application_id = %d ORDER BY id ASC', (int) $application_id),
			ARRAY_A
		);
	}

	public static function labels()
	{
		return array(
			self::DRAFT => 'Draft',
			self::SUBMITTED => 'Submitted',
			self::IN_PROGRESS => 'In Progress',
			self::PENDING_USER => 'Pending From You',
			self::COMPLETED => 'Completed',
			self::REJECTED => 'Rejected',
		);
	}
}
