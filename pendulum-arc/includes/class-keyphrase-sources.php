<?php
/**
 * Preference order for phrases already stored by SEO plugins.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Yoast, then Rank Math, then SEOPress, then All in One SEO. The first non-empty list wins.
 */
final class Keyphrase_Sources {

	/**
	 * @param array{yoast?: string, yoast_premium?: string, rank_math?: string, seopress?: string, aioseo?: string} $sources Raw plugin values.
	 */
	public static function phrase( array $sources ): string {
		$yoast = Keyphrase_Phrase::yoast(
			(string) ( $sources['yoast'] ?? '' ),
			(string) ( $sources['yoast_premium'] ?? '' )
		);
		if ( '' !== $yoast ) {
			return $yoast;
		}
		$rank = Keyphrase_Phrase::list( (string) ( $sources['rank_math'] ?? '' ) );
		if ( '' !== $rank ) {
			return $rank;
		}
		$seopress = Keyphrase_Phrase::list( (string) ( $sources['seopress'] ?? '' ) );
		if ( '' !== $seopress ) {
			return $seopress;
		}
		return Keyphrase_Phrase::aioseo( (string) ( $sources['aioseo'] ?? '' ) );
	}
}
