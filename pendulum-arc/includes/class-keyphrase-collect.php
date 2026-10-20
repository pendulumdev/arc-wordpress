<?php
/**
 * One permalink plus stored plugin phrases, classified for the local list.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Front page is the site focus. Other paths are page rows. Query URLs are skipped.
 */
final class Keyphrase_Collect {

	/**
	 * @param array<int, string> $candidates Plugin phrases in preference order.
	 * @return array{role: string, path: string, phrase: string}
	 */
	public static function row( string $url, string $origin, bool $front, array $candidates ): array {
		$phrase = Keyphrase_Phrase::first( $candidates );
		$path   = Keyphrase_Path::from_url( $url, $origin );
		if ( null === $path ) {
			return array(
				'role'   => 'skip',
				'path'   => '',
				'phrase' => '',
			);
		}
		if ( $front || '/' === $path ) {
			return array(
				'role'   => '' === $phrase ? 'clear-focus' : 'focus',
				'path'   => '/',
				'phrase' => $phrase,
			);
		}
		if ( '' === $phrase ) {
			return array(
				'role'   => 'clear',
				'path'   => $path,
				'phrase' => '',
			);
		}
		return array(
			'role'   => 'page',
			'path'   => $path,
			'phrase' => $phrase,
		);
	}
}
