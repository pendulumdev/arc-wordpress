<?php
/**
 * Turns optional script tags into inert text until consent allows them.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Script tag rewrite. A required match, or an allowed optional match, leaves
 * the tag alone. Any other listed handle or URL is printed as text/plain.
 */
final class Consent_Scripts {

	/**
	 * @param string                           $tag     Script tag HTML.
	 * @param string                           $handle  WordPress script handle.
	 * @param string                           $src     Script URL.
	 * @param array<int, array<string, mixed>> $cookies Cookie rows.
	 * @param array<int, string>               $allowed Allowed row ids.
	 */
	public static function rewrite_tag( string $tag, string $handle, string $src, array $cookies, array $allowed ): string {
		$blocking = null;
		foreach ( $cookies as $cookie ) {
			if ( ! is_array( $cookie ) || ! self::matches( $cookie, $handle, $src ) ) {
				continue;
			}
			$id = isset( $cookie['id'] ) ? (string) $cookie['id'] : '';
			if ( 'required' === ( $cookie['requirement'] ?? '' ) || in_array( $id, $allowed, true ) ) {
				return $tag;
			}
			if ( null === $blocking && '' !== $id ) {
				$blocking = $id;
			}
		}
		if ( null === $blocking ) {
			return $tag;
		}
		return self::inert( $tag, $blocking );
	}

	/**
	 * @param array<string, mixed> $cookie Cookie row.
	 * @param string               $handle Script handle.
	 * @param string               $src    Script URL.
	 */
	private static function matches( array $cookie, string $handle, string $src ): bool {
		$scripts = isset( $cookie['scripts'] ) ? (string) $cookie['scripts'] : '';
		$lines   = preg_split( '/\R/', $scripts );
		if ( ! is_array( $lines ) ) {
			return false;
		}
		foreach ( $lines as $token ) {
			$token = trim( (string) $token );
			if ( '' === $token ) {
				continue;
			}
			if ( self::is_url( $token ) ) {
				if ( '' !== $src && str_contains( $src, $token ) ) {
					return true;
				}
				continue;
			}
			if ( $token === $handle ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * A token with a scheme, a slash, or a dot is a URL fragment. A bare
	 * word is a WordPress script handle.
	 *
	 * @param string $token One scripts-field line.
	 */
	private static function is_url( string $token ): bool {
		return str_contains( $token, '/' ) || str_contains( $token, '.' ) || str_starts_with( $token, 'http' );
	}

	/**
	 * @param string $tag Script tag.
	 * @param string $id  Cookie row id.
	 */
	private static function inert( string $tag, string $id ): string {
		$id       = preg_replace( '/[^a-z0-9_]/', '', $id ) ?? '';
		$original = 'text/javascript';
		if ( 1 === preg_match( '/\stype=(["\'])([^"\']*)\1/i', $tag, $matches ) ) {
			if ( '' !== $matches[2] ) {
				$original = $matches[2];
			}
			$replaced = preg_replace( '/\stype=(["\'])([^"\']*)\1/i', '', $tag, 1 );
			if ( is_string( $replaced ) ) {
				$tag = $replaced;
			}
		}
		$original  = str_replace( array( '"', '<', '>' ), '', $original );
		$extra     = ' type="text/plain" data-arc-script-type="' . $original . '" data-arc-cookie="' . $id . '"';
		$rewritten = preg_replace( '/<script\b/i', '<script' . $extra, $tag, 1 );
		return is_string( $rewritten ) ? $rewritten : $tag;
	}
}
