<?php
/**
 * SHA-256 of the SEO keyphrase set. The bytes match Arc seoKeyphraseHash.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * First line is the focus. Page lines follow in path order.
 */
final class Keyphrase_Hash {

	/**
	 * Shared fixture: focus "widgets" and /about "about widgets".
	 */
	public const FIXTURE = '54c1239c30bd5352d14365628e3e98c8d23c005fcc5645f67ad7076533dff37c';

	/**
	 * @param array<int, array{path: string, phrase: string}> $pages Page rows. Focus is not one of them.
	 */
	public static function of( ?string $focus, array $pages ): string {
		$lines = array();
		foreach ( $pages as $page ) {
			$path = (string) ( $page['path'] ?? '' );
			if ( '' === $path || '/' === $path ) {
				continue;
			}
			$lines[ $path ] = $path . "\t" . (string) ( $page['phrase'] ?? '' ) . "\n";
		}
		ksort( $lines, SORT_STRING );
		$text = 'focus' . "\t" . (string) $focus . "\n" . implode( '', $lines );
		return hash( 'sha256', $text );
	}
}
