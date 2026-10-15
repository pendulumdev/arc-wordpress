<?php
/**
 * Which plugin screens require a stored connection.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Page-slug rules for the Arc admin menu.
 */
final class Admin_Access {

	/**
	 * Dashboard and every future pendulum-arc-* screen.
	 *
	 * @param string $page Sanitized page query value.
	 */
	public static function is_plugin_page( string $page ): bool {
		return 'pendulum-arc' === $page || str_starts_with( $page, 'pendulum-arc-' );
	}

	/**
	 * Connect and GDPR consent stay open. Every other plugin screen needs a connection.
	 *
	 * @param string $page Sanitized page query value.
	 */
	public static function requires_connection( string $page ): bool {
		if ( 'pendulum-arc-connect' === $page || 'pendulum-arc-gdpr' === $page ) {
			return false;
		}
		return self::is_plugin_page( $page );
	}
}
