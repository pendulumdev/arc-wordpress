<?php
/**
 * Focus phrases stored by SEO plugins, reduced to Arc's list shape.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * At most five phrases, joined the way Arc serialises a keyphrase list.
 */
final class Keyphrase_Phrase {

	public const MAX = 5;

	/**
	 * First non-empty candidate wins.
	 *
	 * @param array<int, string> $candidates Plugin values in preference order.
	 */
	public static function first( array $candidates ): string {
		foreach ( $candidates as $candidate ) {
			$phrase = self::list( $candidate );
			if ( '' !== $phrase ) {
				return $phrase;
			}
		}
		return '';
	}

	/**
	 * Yoast focus keyword, then premium keywords when the JSON is a list of keyword objects.
	 */
	public static function yoast( string $focus, string $premium_json ): string {
		$extra   = array();
		$decoded = json_decode( $premium_json, true );
		if ( is_array( $decoded ) ) {
			foreach ( $decoded as $row ) {
				if ( is_array( $row ) && isset( $row['keyword'] ) && is_string( $row['keyword'] ) ) {
					$extra[] = $row['keyword'];
				}
			}
		}
		$joined = $focus;
		if ( $extra ) {
			$joined .= ', ' . implode( ', ', $extra );
		}
		return self::list( $joined );
	}

	/**
	 * All in One SEO keyphrases JSON: focus, then additional.
	 */
	public static function aioseo( string $json ): string {
		$decoded = json_decode( $json, true );
		if ( ! is_array( $decoded ) ) {
			return '';
		}
		$parts = array();
		$focus = $decoded['focus']['keyphrase'] ?? '';
		if ( is_string( $focus ) ) {
			$parts[] = $focus;
		}
		$additional = $decoded['additional'] ?? array();
		if ( is_array( $additional ) ) {
			foreach ( $additional as $row ) {
				if ( is_array( $row ) && isset( $row['keyphrase'] ) && is_string( $row['keyphrase'] ) ) {
					$parts[] = $row['keyphrase'];
				}
			}
		}
		return self::list( implode( ', ', $parts ) );
	}

	/**
	 * Comma-separated list. Empty tokens, duplicates, and phrases with no letter or number drop.
	 */
	public static function list( string $raw ): string {
		$raw   = strtr(
			$raw,
			array(
				"\u{2010}" => '-',
				"\u{2011}" => '-',
				"\u{2012}" => '-',
				"\u{2013}" => '-',
				"\u{2014}" => '-',
				"\u{2015}" => '-',
				"\u{2212}" => '-',
			)
		);
		$parts = preg_split( '/\s*,\s*/', $raw );
		if ( ! is_array( $parts ) ) {
			return '';
		}
		$out  = array();
		$seen = array();
		foreach ( $parts as $part ) {
			$phrase = trim( (string) preg_replace( '/\s+/u', ' ', (string) $part ) );
			if ( '' === $phrase || ! preg_match( '/\p{L}|\p{N}/u', $phrase ) ) {
				continue;
			}
			$key = strtolower( $phrase );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$out[]        = $phrase;
			if ( count( $out ) >= self::MAX ) {
				break;
			}
		}
		return implode( ', ', $out );
	}
}
