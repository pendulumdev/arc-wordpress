<?php
/**
 * Points wp-env at the local Arc portal and API.
 *
 * The browser still uses localhost. PHP inside the container reaches the
 * host through host.docker.internal. This file is not part of the plugin zip.
 *
 * @package ArcWordpress
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'arc_wordpress_portal_url',
	static function (): string {
		return 'http://localhost:3001';
	}
);

add_filter(
	'arc_wordpress_api_url',
	static function (): string {
		return 'http://localhost:8090';
	}
);

add_filter(
	'pre_http_request',
	static function ( $preempt, array $args, string $url ) {
		if ( ! str_contains( $url, '://localhost:' ) ) {
			return $preempt;
		}
		$rewritten = preg_replace( '#://localhost:#', '://host.docker.internal:', $url, 1 );
		if ( ! is_string( $rewritten ) || $rewritten === $url ) {
			return $preempt;
		}
		$host = wp_parse_url( $url, PHP_URL_HOST );
		$port = wp_parse_url( $url, PHP_URL_PORT );
		if ( is_string( $host ) && is_int( $port ) ) {
			if ( ! isset( $args['headers'] ) || ! is_array( $args['headers'] ) ) {
				$args['headers'] = array();
			}
			$args['headers']['Host'] = $host . ':' . $port;
		}
		static $inside = false;
		if ( $inside ) {
			return $preempt;
		}
		$inside   = true;
		$response = wp_remote_request( $rewritten, $args );
		$inside   = false;
		return $response;
	},
	10,
	3
);
