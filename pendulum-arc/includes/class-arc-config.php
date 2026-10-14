<?php
/**
 * Portal and API hosts from spec 19.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Resolves which Arc hosts this install talks to.
 */
final class Arc_Config {

	public const CLIENT_ID = 'arc_app_wordpress';

	/**
	 * Hosts by environment. No trailing slash.
	 *
	 * @var array<string, array{portal: string, api: string}>
	 */
	private const HOSTS = array(
		'production' => array(
			'portal' => 'https://arc.pendulumdev.co.uk',
			'api'    => 'https://api.arc.pendulumdev.co.uk',
		),
		'preview'    => array(
			'portal' => 'https://arc.preview.pendulumdev.co.uk',
			'api'    => 'https://api.arc.preview.pendulumdev.co.uk',
		),
	);

	/**
	 * production or preview for the OAuth browser flow.
	 */
	public static function env(): string {
		$env = 'production';
		if ( defined( 'ARC_WORDPRESS_ENV' ) && is_string( ARC_WORDPRESS_ENV ) && isset( self::HOSTS[ ARC_WORDPRESS_ENV ] ) ) {
			$env = ARC_WORDPRESS_ENV;
		}
		$filtered = apply_filters( 'arc_wordpress_env', $env );
		return is_string( $filtered ) && isset( self::HOSTS[ $filtered ] ) ? $filtered : 'production';
	}

	/**
	 * Portal origin for an environment.
	 *
	 * @param string $env production or preview.
	 */
	public static function portal( string $env ): string {
		$fallback = self::HOSTS[ $env ]['portal'] ?? self::HOSTS['production']['portal'];
		$filtered = apply_filters( 'arc_wordpress_portal_url', $fallback, $env );
		$base     = is_string( $filtered ) ? $filtered : $fallback;
		return self::require_origin( $base, $fallback );
	}

	/**
	 * API origin for an environment. HTTP calls use this.
	 *
	 * A local http override is where the process listens. The OAuth resource
	 * stays on resource() so the token audience remains the canonical host.
	 *
	 * @param string $env production or preview.
	 */
	public static function api( string $env ): string {
		$fallback = self::HOSTS[ $env ]['api'] ?? self::HOSTS['production']['api'];
		$filtered = apply_filters( 'arc_wordpress_api_url', $fallback, $env );
		$base     = is_string( $filtered ) ? $filtered : $fallback;
		return self::require_origin( $base, $fallback );
	}

	/**
	 * OAuth resource. An https override replaces it. An http localhost
	 * override only changes where HTTP is sent.
	 *
	 * @param string $env production or preview.
	 */
	public static function resource( string $env ): string {
		$http  = self::api( $env );
		$parts = wp_parse_url( $http );
		if ( is_array( $parts ) && 'https' === strtolower( (string) ( $parts['scheme'] ?? '' ) ) ) {
			return $http;
		}
		return self::HOSTS[ $env ]['api'] ?? self::HOSTS['production']['api'];
	}

	/**
	 * Issued client id. Arc must store this on oauth_clients.
	 */
	public static function client_id(): string {
		$id = self::CLIENT_ID;
		if ( defined( 'ARC_WORDPRESS_OAUTH_CLIENT_ID' ) && is_string( ARC_WORDPRESS_OAUTH_CLIENT_ID ) && '' !== ARC_WORDPRESS_OAUTH_CLIENT_ID ) {
			$id = ARC_WORDPRESS_OAUTH_CLIENT_ID;
		}
		$filtered = apply_filters( 'arc_wordpress_oauth_client_id', $id );
		return is_string( $filtered ) && '' !== $filtered ? $filtered : self::CLIENT_ID;
	}

	/**
	 * Browser return address for this install.
	 */
	public static function redirect_uri(): string {
		return admin_url( 'admin.php?page=pendulum-arc-connect' );
	}

	/**
	 * WordPress home URL and site title sent as site_origin and site_name.
	 *
	 * @return array{origin: string, name: string}
	 */
	public static function install_profile(): array {
		$name = trim( (string) get_bloginfo( 'name' ) );
		if ( strlen( $name ) < 2 ) {
			$host = wp_parse_url( home_url(), PHP_URL_HOST );
			$name = is_string( $host ) && '' !== $host ? $host : 'WordPress';
		}
		return array(
			'origin' => home_url(),
			'name'   => $name,
		);
	}

	/**
	 * Accepts https, or http on localhost while WP_DEBUG is on.
	 *
	 * @param string $base     Candidate origin.
	 * @param string $fallback Spec origin when the candidate is refused.
	 */
	private static function require_origin( string $base, string $fallback ): string {
		$base  = rtrim( trim( $base ), '/' );
		$parts = wp_parse_url( $base );
		if ( ! is_array( $parts ) ) {
			return $fallback;
		}
		$scheme = strtolower( (string) ( $parts['scheme'] ?? '' ) );
		$host   = strtolower( (string) ( $parts['host'] ?? '' ) );
		$local  = in_array( $host, array( 'localhost', '127.0.0.1' ), true );
		$debug  = defined( 'WP_DEBUG' ) && WP_DEBUG;
		if ( 'https' === $scheme || ( $local && $debug && 'http' === $scheme ) ) {
			return $base;
		}
		return $fallback;
	}
}
