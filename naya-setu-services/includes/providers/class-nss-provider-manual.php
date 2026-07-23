<?php

if (!defined('ABSPATH')) {
	exit;
}

/**
 * Default provider for every service without a live API (Q5: "Workflow
 * manual mode chalega"). submit() just hands the application to an operator
 * queue — NSS_Application::submit() has already moved status to
 * 'in_progress'; from here a human in wp-admin -> Applications does the rest
 * and advances status manually. No fake API call is pretended.
 */
class NSS_Provider_Manual implements NSS_Provider_Interface
{
	public function label()
	{
		return 'Manual Workflow';
	}

	public function is_configured()
	{
		return true;
	}

	public function submit(array $application)
	{
		return array('reference' => '', 'status' => 'in_progress');
	}

	public function check_status($reference)
	{
		return array('status' => 'in_progress', 'remark' => 'Being processed by an operator.');
	}
}
