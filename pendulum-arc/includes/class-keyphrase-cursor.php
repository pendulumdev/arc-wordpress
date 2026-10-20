<?php
/**
 * Scan cursor. Posts, then each public taxonomy, one bounded page at a time.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A short page finishes that phase. A full page keeps the cursor moving.
 */
final class Keyphrase_Cursor {

	/**
	 * @param array<int, string> $taxonomies Public taxonomy names.
	 * @return array{phase: string, after_id: int, taxonomy: int, offset: int, done: bool}
	 */
	public static function start( array $taxonomies ): array {
		unset( $taxonomies );
		return array(
			'phase'    => 'posts',
			'after_id' => 0,
			'taxonomy' => 0,
			'offset'   => 0,
			'done'     => false,
		);
	}

	/**
	 * @param array{phase?: string, after_id?: int, taxonomy?: int, offset?: int} $cursor  Current cursor.
	 * @param int                                                                  $count   Rows read this tick.
	 * @param int                                                                  $batch   Page size.
	 * @param int                                                                  $last_id Highest post id in the page. Ignored for terms.
	 * @param int                                                                  $taxes   How many taxonomies will be scanned.
	 * @return array{phase: string, after_id: int, taxonomy: int, offset: int, done: bool}
	 */
	public static function advance( array $cursor, int $count, int $batch, int $last_id, int $taxes ): array {
		$phase    = (string) ( $cursor['phase'] ?? 'posts' );
		$after_id = (int) ( $cursor['after_id'] ?? 0 );
		$taxonomy = (int) ( $cursor['taxonomy'] ?? 0 );
		$offset   = (int) ( $cursor['offset'] ?? 0 );
		if ( 'posts' === $phase ) {
			if ( $count >= $batch ) {
				return array(
					'phase'    => 'posts',
					'after_id' => $last_id > $after_id ? $last_id : $after_id,
					'taxonomy' => 0,
					'offset'   => 0,
					'done'     => false,
				);
			}
			if ( $taxes < 1 ) {
				return array(
					'phase'    => 'terms',
					'after_id' => $last_id > $after_id ? $last_id : $after_id,
					'taxonomy' => 0,
					'offset'   => 0,
					'done'     => true,
				);
			}
			return array(
				'phase'    => 'terms',
				'after_id' => $last_id > $after_id ? $last_id : $after_id,
				'taxonomy' => 0,
				'offset'   => 0,
				'done'     => false,
			);
		}
		if ( $count >= $batch ) {
			return array(
				'phase'    => 'terms',
				'after_id' => $after_id,
				'taxonomy' => $taxonomy,
				'offset'   => $offset + $count,
				'done'     => false,
			);
		}
		$next = $taxonomy + 1;
		if ( $next < $taxes ) {
			return array(
				'phase'    => 'terms',
				'after_id' => $after_id,
				'taxonomy' => $next,
				'offset'   => 0,
				'done'     => false,
			);
		}
		return array(
			'phase'    => 'terms',
			'after_id' => $after_id,
			'taxonomy' => $next,
			'offset'   => 0,
			'done'     => true,
		);
	}
}
