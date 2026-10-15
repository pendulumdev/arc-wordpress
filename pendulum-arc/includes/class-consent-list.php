<?php
/**
 * Filters the cookie table for the list shortcode.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Optional and type filters. An empty argument does not filter.
 */
final class Consent_List {

	/**
	 * @param array<int, array<string, mixed>> $rows     Cookie rows.
	 * @param string                           $optional `yes`, `no`, or empty.
	 * @param string                           $type     Type label, or empty.
	 * @return array<int, array<string, mixed>>
	 */
	public static function filter( array $rows, string $optional, string $type ): array {
		$optional = strtolower( trim( $optional ) );
		$type     = trim( $type );
		$out      = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$requirement = (string) ( $row['requirement'] ?? '' );
			if ( 'yes' === $optional && 'optional' !== $requirement ) {
				continue;
			}
			if ( 'no' === $optional && 'required' !== $requirement ) {
				continue;
			}
			if ( '' !== $type && 0 !== strcasecmp( (string) ( $row['type'] ?? '' ), $type ) ) {
				continue;
			}
			$out[] = $row;
		}
		return $out;
	}
}
