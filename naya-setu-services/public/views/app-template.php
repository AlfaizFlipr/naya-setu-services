<?php

if (!defined('ABSPATH')) {
	exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>

<head>
	<meta charset="<?php bloginfo('charset'); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php echo esc_html(get_the_title()); ?> — <?php bloginfo('name'); ?></title>
	<style>
		html,
		body {
			margin: 0;
			padding: 0;
		}
	</style>
	<?php wp_head(); ?>
</head>

<body <?php body_class('nss-fullpage'); ?>>
	<?php
	while (have_posts()):
		the_post();
		the_content();
	endwhile;
	?>
	<?php wp_footer(); ?>
</body>

</html>