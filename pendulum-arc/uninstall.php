<?php
/**
 * Remove stored credentials when the plugin is deleted.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'arc_wordpress_connection' );

global $wpdb;

$arc_wordpress_pending = $wpdb->esc_like( '_transient_arc_wordpress_' ) . '%';
$arc_wordpress_timeout = $wpdb->esc_like( '_transient_timeout_arc_wordpress_' ) . '%';

// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$arc_wordpress_pending,
		$arc_wordpress_timeout
	)
);
