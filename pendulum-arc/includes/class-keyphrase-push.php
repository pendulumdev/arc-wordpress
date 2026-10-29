<?php
/**
 * Decides a patch or a replace from the Arc hash and the local dirty rows.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A matching acked hash means only dirty rows are sent. Otherwise the whole list replaces the target.
 */
final class Keyphrase_Push {

	public const BATCH = 500;

	/**
	 * @param array<int, array{path: string, phrase: string, synced_phrase: string, deleted: bool}> $rows Page rows.
	 * @return array{mode: string, upserts: array<int, array{path: string, focusKeyphrase: string}>, deletes: array<int, string>, send_focus: bool, focus: string|null}
	 */
	public static function plan( ?string $acked_hash, string $arc_hash, string $focus, string $focus_synced, array $rows ): array {
		$replace      = null === $acked_hash || '' === $acked_hash || $acked_hash !== $arc_hash;
		$focus_phrase = Keyphrase_Phrase::list( $focus );
		$synced_focus = Keyphrase_Phrase::list( $focus_synced );
		$upserts      = array();
		$deletes      = array();
		foreach ( $rows as $row ) {
			$path = (string) ( $row['path'] ?? '' );
			if ( '' === $path || '/' === $path ) {
				continue;
			}
			$deleted = ! empty( $row['deleted'] );
			$phrase  = Keyphrase_Phrase::list( (string) ( $row['phrase'] ?? '' ) );
			$synced  = Keyphrase_Phrase::list( (string) ( $row['synced_phrase'] ?? '' ) );
			if ( $replace ) {
				if ( ! $deleted && '' !== $phrase ) {
					$upserts[] = array(
						'path'           => $path,
						'focusKeyphrase' => $phrase,
					);
				}
				continue;
			}
			if ( $deleted || ( '' === $phrase && '' !== $synced ) ) {
				$deletes[] = $path;
				continue;
			}
			if ( '' !== $phrase && $phrase !== $synced ) {
				$upserts[] = array(
					'path'           => $path,
					'focusKeyphrase' => $phrase,
				);
			}
		}
		return array(
			'mode'       => $replace ? 'replace' : 'patch',
			'upserts'    => $upserts,
			'deletes'    => $deletes,
			'send_focus' => $replace || $focus_phrase !== $synced_focus,
			'focus'      => '' === $focus_phrase ? null : $focus_phrase,
		);
	}

	/**
	 * @param array<int, array{path: string, focusKeyphrase: string}> $upserts Upserts.
	 * @param array<int, string>                                      $deletes Paths to delete.
	 * @return array<int, array{upserts: array<int, array{path: string, focusKeyphrase: string}>, deletes: array<int, string>}>
	 */
	public static function batches( array $upserts, array $deletes ): array {
		$ops = array();
		foreach ( $deletes as $path ) {
			$ops[] = array(
				'kind' => 'delete',
				'path' => $path,
			);
		}
		foreach ( $upserts as $row ) {
			$ops[] = array(
				'kind' => 'upsert',
				'row'  => $row,
			);
		}
		if ( ! $ops ) {
			return array();
		}
		$out = array();
		foreach ( array_chunk( $ops, self::BATCH ) as $chunk ) {
			$batch = array(
				'upserts' => array(),
				'deletes' => array(),
			);
			foreach ( $chunk as $op ) {
				if ( 'delete' === $op['kind'] ) {
					$batch['deletes'][] = $op['path'];
				} else {
					$batch['upserts'][] = $op['row'];
				}
			}
			$out[] = $batch;
		}
		return $out;
	}
}
