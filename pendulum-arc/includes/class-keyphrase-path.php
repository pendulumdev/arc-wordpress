<?php
/**
 * Public pathname for a permalink, relative to the paired site.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Arc paths are pathnames. A query string cannot be stored.
 */
final class Keyphrase_Path {

	/**
	 * Pathname, or null when the URL is on another origin or still has a query.
	 */
	public static function from_url( string $url, string $origin ): ?string {
		$url_parts    = wp_parse_url( $url );
		$origin_parts = wp_parse_url( $origin );
		if ( ! is_array( $url_parts ) || ! is_array( $origin_parts ) ) {
			return null;
		}
		if ( ! empty( $url_parts['query'] ) ) {
			return null;
		}
		$host        = strtolower( (string) ( $url_parts['host'] ?? '' ) );
		$origin_host = strtolower( (string) ( $origin_parts['host'] ?? '' ) );
		if ( '' === $host || $host !== $origin_host ) {
			return null;
		}
		if ( ( $url_parts['port'] ?? null ) !== ( $origin_parts['port'] ?? null ) ) {
			return null;
		}
		$path = (string) ( $url_parts['path'] ?? '/' );
		if ( '' === $path ) {
			$path = '/';
		}
		if ( '/' !== $path ) {
			$path = rtrim( $path, '/' );
		}
		if ( '' === $path ) {
			$path = '/';
		}
		if ( ! str_starts_with( $path, '/' ) ) {
			$path = '/' . $path;
		}
		return $path;
	}
}
