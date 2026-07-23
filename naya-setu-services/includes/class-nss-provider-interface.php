<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Contract every service connector implements — mirrors naya-setu-courier's
 * NSC_Courier_Interface so the same "swap the adapter, not the call site"
 * pattern applies here (Q4/Q6 of the brief).
 */
interface NSS_Provider_Interface
{
	public function label();

	/** @return bool Whether real credentials are configured for this provider. */
	public function is_configured();

	/**
	 * @param array $application Associative array: service_key, form_data, profile.
	 * @return array|WP_Error ['reference' => string, 'status' => string] on success.
	 */
	public function submit(array $application);

	/** @return array|WP_Error ['status' => string, 'remark' => string] */
	public function check_status($reference);
}
