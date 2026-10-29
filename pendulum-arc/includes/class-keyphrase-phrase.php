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
 *
 * The text matches Arc sanitizeKeyphrasePhrase and parseFocusKeyphrase.
 * A list Arc would drop comes back empty, except that more than five phrases
 * are capped. The cap is what this plugin sends, and Arc stores that cap.
 */
final class Keyphrase_Phrase {

	public const MAX        = 5;
	public const PHRASE_MAX = 80;
	public const JOINED_MAX = 500;

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
	 * Comma-separated list Arc will store. Empty when Arc would drop the row.
	 */
	public static function list( string $raw ): string {
		$joined = trim( $raw );
		if ( '' === $joined ) {
			return '';
		}
		$unique = array();
		$seen   = array();
		foreach ( explode( ',', $joined ) as $part ) {
			$phrase = self::sanitize( $part );
			if ( '' === $phrase ) {
				continue;
			}
			if ( self::contains_comma( $phrase ) || ! self::has_letters( $phrase ) ) {
				return '';
			}
			if ( self::PHRASE_MAX < self::units( $phrase ) ) {
				return '';
			}
			$key = self::fold_key( $phrase );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$unique[]     = $phrase;
			if ( self::MAX <= count( $unique ) ) {
				break;
			}
		}
		if ( ! $unique ) {
			return '';
		}
		$serialised = implode( ', ', $unique );
		if ( self::JOINED_MAX < self::units( $serialised ) ) {
			return '';
		}
		return $serialised;
	}

	/**
	 * NFC, strip invisible marks, fold quotes and dashes, collapse whitespace.
	 */
	private static function sanitize( string $raw ): string {
		if ( class_exists( \Normalizer::class, false ) ) {
			$normalized = \Normalizer::normalize( $raw, \Normalizer::FORM_C );
			if ( is_string( $normalized ) ) {
				$raw = $normalized;
			}
		}
		$chars = preg_split( '//u', $raw, -1, PREG_SPLIT_NO_EMPTY );
		if ( ! is_array( $chars ) ) {
			return '';
		}
		$cleaned = '';
		foreach ( $chars as $char ) {
			if ( self::invisible( self::codepoint( $char ) ) ) {
				continue;
			}
			$cleaned .= $char;
		}
		$cleaned   = strtr(
			$cleaned,
			array(
				"\u{2018}" => "'",
				"\u{2019}" => "'",
				"\u{201A}" => "'",
				"\u{02BC}" => "'",
				"\u{201C}" => '"',
				"\u{201D}" => '"',
				"\u{2010}" => '-',
				"\u{2011}" => '-',
				"\u{2012}" => '-',
				"\u{2013}" => '-',
				"\u{2014}" => '-',
				"\u{2015}" => '-',
				"\u{2212}" => '-',
			)
		);
		$collapsed = preg_replace( '/\s+/u', ' ', $cleaned );
		return trim( (string) $collapsed );
	}

	/**
	 * ASCII comma, Arabic comma, ideographic comma, or fullwidth comma.
	 */
	private static function contains_comma( string $phrase ): bool {
		return 1 === preg_match( '/[,\x{060C}\x{3001}\x{FF0C}]/u', $phrase );
	}

	/**
	 * A phrase of only punctuation is not a keyphrase.
	 */
	private static function has_letters( string $phrase ): bool {
		return 1 === preg_match( '/\p{L}|\p{N}/u', $phrase );
	}

	/**
	 * UTF-16 code units, which is what Arc counts for the 80 and 500 limits.
	 */
	private static function units( string $text ): int {
		if ( ! preg_match_all( '/./u', $text, $matches ) || ! isset( $matches[0] ) ) {
			return strlen( $text );
		}
		$count = 0;
		foreach ( $matches[0] as $char ) {
			$count += 3 < strlen( $char ) ? 2 : 1;
		}
		return $count;
	}

	/**
	 * Case fold for duplicate detection. ASCII is enough when mbstring is absent.
	 */
	private static function fold_key( string $phrase ): string {
		if ( function_exists( 'mb_strtolower' ) ) {
			return mb_strtolower( $phrase, 'UTF-8' );
		}
		return strtolower( $phrase );
	}

	/**
	 * Unicode code point for one UTF-8 character.
	 */
	private static function codepoint( string $char ): int {
		$bytes = unpack( 'C*', $char );
		if ( ! is_array( $bytes ) ) {
			return 0;
		}
		$bytes = array_values( $bytes );
		$count = count( $bytes );
		if ( 1 === $count ) {
			return $bytes[0];
		}
		if ( 2 === $count ) {
			return ( ( $bytes[0] & 0x1F ) << 6 ) | ( $bytes[1] & 0x3F );
		}
		if ( 3 === $count ) {
			return ( ( $bytes[0] & 0x0F ) << 12 ) | ( ( $bytes[1] & 0x3F ) << 6 ) | ( $bytes[2] & 0x3F );
		}
		if ( 4 === $count ) {
			return ( ( $bytes[0] & 0x07 ) << 18 ) | ( ( $bytes[1] & 0x3F ) << 12 ) | ( ( $bytes[2] & 0x3F ) << 6 ) | ( $bytes[3] & 0x3F );
		}
		return 0;
	}

	/**
	 * C0/C1 controls, bidi overrides, and zero-width marks. Tab and newline stay for collapse.
	 */
	private static function invisible( int $code ): bool {
		if ( 0x08 >= $code ) {
			return true;
		}
		if ( 0x0B === $code || 0x0C === $code ) {
			return true;
		}
		if ( 0x0E <= $code && 0x1F >= $code ) {
			return true;
		}
		if ( 0x7F <= $code && 0x9F >= $code ) {
			return true;
		}
		if ( 0x200B <= $code && 0x200F >= $code ) {
			return true;
		}
		if ( 0x202A <= $code && 0x202E >= $code ) {
			return true;
		}
		if ( 0x2060 <= $code && 0x2064 >= $code ) {
			return true;
		}
		if ( 0x2066 <= $code && 0x206F >= $code ) {
			return true;
		}
		return 0xFEFF === $code;
	}
}
