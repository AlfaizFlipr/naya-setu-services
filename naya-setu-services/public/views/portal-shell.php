<?php

if (!defined('ABSPATH')) {
	exit;
}

$user = wp_get_current_user();
$can_manage_apps = user_can($user, 'nss_manage_applications') || user_can($user, 'nss_view_all_applications');
$can_verify_docs = user_can($user, 'nss_verify_documents');
$can_manage_config = user_can($user, 'nss_manage_service_config');
$can_view_reports = user_can($user, 'nss_view_reports');
$is_admin = user_can($user, 'nss_manage_settings');
$show_admin_group = $can_manage_apps || $can_verify_docs || $can_manage_config || $can_view_reports || $is_admin;
?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<div class="nss-app">
	<div class="nss-shell">
		<aside class="nss-sidebar" id="nss-sidebar">
			<div class="nss-brand">
				<img class="nss-brand-logo"
					src="<?php echo esc_url(NSS_PLUGIN_URL . 'public/assets/img/naya-setu-logo.webp'); ?>"
					alt="Naya Setu" />
				<div class="nss-brand-name">Naya Setu<small>Services</small></div>
			</div>
			<nav class="nss-nav" id="nss-nav">
				<a href="#dashboard" data-route="dashboard"><?php echo NSS_Icons::get('dashboard'); ?> Dashboard</a>
				<a href="#categories" data-route="categories"><?php echo NSS_Icons::get('folder'); ?> Browse Categories</a>

				<div class="nss-nav-group-label">My Account</div>
				<a href="#applications" data-route="applications"><?php echo NSS_Icons::get('file-text'); ?> My
					Applications</a>
				<a href="#documents" data-route="documents"><?php echo NSS_Icons::get('folder'); ?> My Documents</a>
				<a href="#profile" data-route="profile"><?php echo NSS_Icons::get('user'); ?> My Profile</a>
				<a href="#wallet" data-route="wallet"><?php echo NSS_Icons::get('wallet'); ?> My Wallet</a>
				<a href="#notifications" data-route="notifications"><?php echo NSS_Icons::get('bell'); ?>
					Notifications</a>
				<a href="#payments" data-route="payments"><?php echo NSS_Icons::get('receipt'); ?> Payment History</a>

				<?php if ($show_admin_group): ?>
					<div class="nss-nav-group-label">Admin</div>
				<?php endif; ?>
				<?php if ($can_manage_apps): ?>
					<a href="#admin-applications" data-route="admin-applications"><?php echo NSS_Icons::get('briefcase'); ?>
						All Applications</a>
				<?php endif; ?>
				<?php if ($can_verify_docs): ?>
					<a href="#admin-documents" data-route="admin-documents"><?php echo NSS_Icons::get('shield-check'); ?>
						Document Verification</a>
				<?php endif; ?>
				<?php if ($can_manage_config): ?>
					<a href="#admin-service-config"
						data-route="admin-service-config"><?php echo NSS_Icons::get('settings'); ?> Service Config</a>
				<?php endif; ?>
				<?php if ($can_view_reports): ?>
					<a href="#admin-payments" data-route="admin-payments"><?php echo NSS_Icons::get('credit-card'); ?>
						Payments</a>
					<a href="#admin-reports" data-route="admin-reports"><?php echo NSS_Icons::get('chart'); ?> Reports</a>
				<?php endif; ?>
				<?php if ($is_admin): ?>
					<a href="#admin-api-logs" data-route="admin-api-logs"><?php echo NSS_Icons::get('file-text'); ?> API
						Logs</a>
					<a href="#admin-associates" data-route="admin-associates"><?php echo NSS_Icons::get('users'); ?>
						Associates</a>
					<a href="#admin-settings" data-route="admin-settings"><?php echo NSS_Icons::get('settings'); ?>
						Settings</a>
				<?php endif; ?>
			</nav>
		</aside>
		<div class="nss-sidebar-overlay" id="nss-sidebar-overlay"></div>

		<div class="nss-main">
			<div class="nss-topbar">
				<div style="display:flex;align-items:center;gap:12px;">
					<button class="nss-menu-toggle" id="nss-menu-toggle"><?php echo NSS_Icons::get('menu'); ?></button>
					<div class="nss-topbar-title" id="nss-topbar-title">Dashboard</div>
				</div>
				<div class="nss-topbar-right">
					<a href="#dashboard" id="nss-new-request-btn"
						class="nss-btn nss-btn-primary nss-btn-sm"><?php echo NSS_Icons::get('plus', 'nss-icon-sm'); ?>
						New Request</a>
					<div class="nss-user-pill">
						<div class="nss-user-avatar">
							<?php echo esc_html(strtoupper(substr($user->display_name, 0, 1))); ?></div>
						<span><?php echo esc_html($user->display_name); ?></span>
					</div>
					<a class="nss-btn nss-btn-sm"
						href="<?php echo esc_url(wp_logout_url(get_permalink())); ?>"><?php echo NSS_Icons::get('logout', 'nss-icon-sm'); ?>
						Logout</a>
				</div>
			</div>
			<div class="nss-content" id="nss-content">
				<div class="nss-loading">Loading…</div>
			</div>
		</div>
	</div>
	<div id="nss-toast"></div>
</div>