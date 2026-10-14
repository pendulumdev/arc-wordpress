<?php
/**
 * PKCE S256 values for the Arc authorize request.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Generates the verifier, challenge, and OAuth state.
 */
final class Pkce {

	/**
	 * URL-safe verifier of 43 or more characters.
	 */
	public static function verifier(): string {
		return self::base64url( random_bytes( 32 ) );
	}

	/**
	 * S256 challenge for a verifier.
	 *
	 * @param string $verifier PKCE verifier.
	 */
	public static function challenge( string $verifier ): string {
		return self::base64url( hash( 'sha256', $verifier, true ) );
	}

	/**
	 * Unguessable state for the authorize round trip.
	 */
	public static function state(): string {
		return self::base64url( random_bytes( 32 ) );
	}

	/**
	 * Base64url without padding.
	 *
	 * @param string $raw Raw bytes.
	 */
	private static function base64url( string $raw ): string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- PKCE base64url, not obfuscation.
		return rtrim( strtr( base64_encode( $raw ), '+/', '-_' ), '=' );
	}
}
