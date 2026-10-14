<?php
/**
 * Loads ArcWordpress classes from includes/class-*.php.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

spl_autoload_register(
	static function ( string $class_name ): void {
		$prefix = 'ArcWordpress\\';
		if ( strncmp( $prefix, $class_name, strlen( $prefix ) ) !== 0 ) {
			return;
		}

		$relative = strtolower( str_replace( '_', '-', substr( $class_name, strlen( $prefix ) ) ) );
		$path     = ARC_WORDPRESS_DIR . 'includes/class-' . $relative . '.php';

		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}
);
