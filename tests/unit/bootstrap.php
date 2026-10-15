<?php
/**
 * Loads pure classes for PHPUnit without WordPress.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

if ( ! function_exists( 'wp_parse_url' ) ) {
	/**
	 * Stand-in for the WordPress helper. PHPUnit does not load WordPress.
	 *
	 * @param string $url URL.
	 * @return array<string, mixed>|false
	 */
	function wp_parse_url( string $url ) {
		$parts = parse_url( $url );
		return is_array( $parts ) ? $parts : false;
	}
}

if ( ! function_exists( '__' ) ) {
	/**
	 * Stand-in for the WordPress translation helper.
	 *
	 * @param string $text Text.
	 */
	function __( string $text ): string {
		return $text;
	}
}

$root = dirname( __DIR__, 2 ) . '/pendulum-arc';
require $root . '/includes/class-site-origin.php';
require $root . '/includes/class-pairing.php';
require $root . '/includes/class-site-draft.php';
require $root . '/includes/class-pkce.php';
require $root . '/includes/class-secret-box.php';
require $root . '/includes/class-admin-access.php';
require $root . '/includes/class-consent-settings.php';
require $root . '/includes/class-consent-catalog.php';
require $root . '/includes/class-consent-scripts.php';
require $root . '/includes/class-consent-list.php';
require $root . '/includes/class-consent-log-payload.php';
require $root . '/includes/class-github-release.php';
require $root . '/includes/class-arc-api-exception.php';
require $root . '/includes/class-connect-service.php';
