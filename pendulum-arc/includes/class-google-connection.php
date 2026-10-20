<?php
/**
 * Whether Arc has a Google account. Remembered when scores are read, so later screens do not ask again.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The option is not autoloaded. A missing value means this install has not read scores yet.
 */
final class Google_Connection {

	public const OPTION = 'arc_google_missing';

	/**
	 * Stores the Analytics setup from a scores response.
	 *
	 * @param string|null $setup connect_google, assign_site, not_enabled, or null when ready.
	 */
	public static function remember( ?string $setup ): void {
		update_option( self::OPTION, 'connect_google' === $setup ? '1' : '0', false );
	}

	/**
	 * True only after scores said there is no Google account.
	 */
	public static function missing(): bool {
		return '1' === (string) get_option( self::OPTION, '' );
	}

	/**
	 * Forgets the flag when this install disconnects.
	 */
	public static function clear(): void {
		delete_option( self::OPTION );
	}
}
