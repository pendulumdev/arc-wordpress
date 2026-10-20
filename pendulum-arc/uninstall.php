<?php
/**
 * Remove stored credentials and cookie consent data when the plugin is deleted.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'arc_wordpress_connection' );
delete_option( 'arc_cookie_consent_settings' );
delete_option( 'arc_consent_log_db' );
delete_option( 'arc_keyphrase_sync' );
delete_option( 'arc_keyphrase_db' );

global $wpdb;

$arc_wordpress_pending             = $wpdb->esc_like( '_transient_arc_wordpress_' ) . '%';
$arc_wordpress_timeout             = $wpdb->esc_like( '_transient_timeout_arc_wordpress_' ) . '%';
$arc_wordpress_cookie_rate         = $wpdb->esc_like( '_transient_arc_cookie_consent_rate_' ) . '%';
$arc_wordpress_cookie_rate_timeout = $wpdb->esc_like( '_transient_timeout_arc_cookie_consent_rate_' ) . '%';

// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s",
		$arc_wordpress_pending,
		$arc_wordpress_timeout,
		$arc_wordpress_cookie_rate,
		$arc_wordpress_cookie_rate_timeout
	)
);

$arc_wordpress_consent_log = $wpdb->prefix . 'arc_consent_log';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query( "DROP TABLE IF EXISTS {$arc_wordpress_consent_log}" );

$arc_wordpress_keyphrases = $wpdb->prefix . 'arc_keyphrases';
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
$wpdb->query( "DROP TABLE IF EXISTS {$arc_wordpress_keyphrases}" );
