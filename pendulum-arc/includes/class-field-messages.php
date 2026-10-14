<?php
/**
 * Translated copy for site-draft error codes.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Maps draft codes to admin-facing sentences.
 */
final class Field_Messages {

	/**
	 * One sentence for a code.
	 *
	 * @param string $code Draft error code.
	 */
	public static function for_code( string $code ): string {
		switch ( $code ) {
			case Site_Draft::NAME_SHORT:
				return __( 'Site name must be at least 2 characters.', 'pendulum-arc' );
			case Site_Draft::NAME_LONG:
				return __( 'Site name must be at most 120 characters.', 'pendulum-arc' );
			case Site_Draft::URL:
				return __( 'Enter a full http or https URL.', 'pendulum-arc' );
			case Site_Draft::PROJECT:
			case Site_Draft::PROJECT_UNKNOWN:
				return __( 'Choose a project.', 'pendulum-arc' );
			default:
				return __( 'Check this field.', 'pendulum-arc' );
		}
	}

	/**
	 * Codes to sentences.
	 *
	 * @param array<string, string> $codes Field codes.
	 * @return array<string, string>
	 */
	public static function map( array $codes ): array {
		$out = array();
		foreach ( $codes as $field => $code ) {
			$out[ $field ] = self::for_code( (string) $code );
		}
		return $out;
	}
}
