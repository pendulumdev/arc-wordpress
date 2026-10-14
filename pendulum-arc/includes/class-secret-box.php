<?php
/**
 * Seals credential bytes with libsodium.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Secret-box helper. The key comes from the caller.
 */
final class Secret_Box {

	/**
	 * Encrypts a string.
	 *
	 * @param string $plain Plain text.
	 * @param string $key   32-byte key.
	 * @throws \InvalidArgumentException When the key length is wrong.
	 * @throws \RuntimeException When sodium cannot seal the value.
	 */
	public static function seal( string $plain, string $key ): string {
		self::assert_key( $key );
		$nonce  = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$cipher = sodium_crypto_secretbox( $plain, $nonce, $key );
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Sealed credential storage.
		return base64_encode( $nonce . $cipher );
	}

	/**
	 * Decrypts a value from seal().
	 *
	 * @param string $sealed Sealed text.
	 * @param string $key    32-byte key.
	 * @throws \RuntimeException When the value cannot be opened.
	 */
	public static function open( string $sealed, string $key ): string {
		self::assert_key( $key );
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- Sealed credential storage.
		$raw = base64_decode( $sealed, true );
		$min = SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + SODIUM_CRYPTO_SECRETBOX_MACBYTES;
		if ( ! is_string( $raw ) || strlen( $raw ) < $min ) {
			throw new \RuntimeException( 'Sealed value is unreadable.' );
		}
		$nonce  = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$cipher = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$plain  = sodium_crypto_secretbox_open( $cipher, $nonce, $key );
		if ( ! is_string( $plain ) ) {
			throw new \RuntimeException( 'Sealed value is unreadable.' );
		}
		return $plain;
	}

	/**
	 * Rejects a key that sodium would not accept.
	 *
	 * @param string $key Key bytes.
	 * @throws \InvalidArgumentException When the key length is wrong.
	 */
	private static function assert_key( string $key ): void {
		if ( SODIUM_CRYPTO_SECRETBOX_KEYBYTES !== strlen( $key ) ) {
			throw new \InvalidArgumentException( 'Secret box key must be 32 bytes.' );
		}
	}
}
