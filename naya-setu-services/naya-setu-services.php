<?php
/**
 * Plugin Name: Naya Setu Services
 * Plugin URI: https://nayasetu.in/
 * Description: Unified self-service dashboard for every Naya Setu service (Identity, Business, Banking & Finance, Transport, Revenue & Legal, Government Schemes, Digital Services) — dynamic JSON-driven forms, a shared document vault, and a common status/payment/notification engine. Courier requests hand off to the Naya Setu Courier Booking plugin.
 * Version: 1.0.0
 * Author: Naya Setu
 * Author URI: https://nayasetu.in/
 * Text Domain: naya-setu-services
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
	exit;
}

define('NSS_VERSION', '1.0.0');
define('NSS_PLUGIN_FILE', __FILE__);
define('NSS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('NSS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('NSS_DB_VERSION', '1.1.0');

spl_autoload_register(
	function ($class) {
		if (strpos($class, 'NSS_') !== 0) {
			return;
		}
		$slug = 'class-' . str_replace('_', '-', strtolower($class)) . '.php';
		foreach (array('includes/', 'includes/providers/', 'public/') as $dir) {
			$file = NSS_PLUGIN_DIR . $dir . $slug;
			if (file_exists($file)) {
				require_once $file;
				return;
			}
		}
	}
);

function nss_activate()
{
	require_once NSS_PLUGIN_DIR . 'includes/class-nss-install.php';
	NSS_Install::run();
	flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'nss_activate');

function nss_deactivate()
{
	flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'nss_deactivate');

add_action(
	'plugins_loaded',
	function () {
		load_plugin_textdomain('naya-setu-services', false, dirname(plugin_basename(__FILE__)) . '/languages');

		// Auto-upgrade tables/roles/catalog if the plugin was updated without a fresh activation.
		if (get_option('nss_db_version') !== NSS_DB_VERSION) {
			require_once NSS_PLUGIN_DIR . 'includes/class-nss-install.php';
			NSS_Install::run();
		}

		NSS_Plugin::instance();
	}
);
