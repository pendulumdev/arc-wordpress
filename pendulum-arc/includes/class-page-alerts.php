<?php
/**
 * Page alerts. One stack at the top of Arc screens, and a menu count for the ones that need attention.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Builds the alert list. Only the keyphrase alert adds to the Arc menu count.
 */
final class Page_Alerts {

	/**
	 * The keyphrase list needs a sync click.
	 *
	 * @param bool   $enabled         Sync is on.
	 * @param bool   $scan_done       The first scan has finished.
	 * @param bool   $connected       A site is paired.
	 * @param string $focus           Local focus phrase.
	 * @param string $focus_synced    Focus phrase Arc last accepted.
	 * @param bool   $dirty           A page row is unsynced.
	 * @param bool   $stored_diverged The last hash check differed.
	 */
	public static function keyphrase_pending(
		bool $enabled,
		bool $scan_done,
		bool $connected,
		string $focus,
		string $focus_synced,
		bool $dirty,
		bool $stored_diverged
	): bool {
		if ( ! $enabled || ! $scan_done || ! $connected ) {
			return false;
		}
		return $dirty || $stored_diverged || $focus !== $focus_synced;
	}

	/**
	 * @param array<int, array{count?: bool}> $alerts Alerts for this screen.
	 */
	public static function count( array $alerts ): int {
		$count = 0;
		foreach ( $alerts as $alert ) {
			if ( ! empty( $alert['count'] ) ) {
				++$count;
			}
		}
		return $count;
	}

	/**
	 * Flash notices stay in the banner. The keyphrase alert is the one that counts.
	 *
	 * @param array{status?: string, message?: string}|null $flash          One-shot notice, or null.
	 * @param bool                                          $keyphrases     Keyphrase list needs a sync.
	 * @param string                                        $connect_url    Connect screen.
	 * @param bool                                          $on_connect     This screen is Connect.
	 * @param bool                                          $google_missing Analytics has no Google account.
	 * @param bool                                          $arc_missing    This install is not paired with Arc.
	 * @return array<int, array{id: string, tone: string, message: string, count: bool, href?: string, hrefLabel?: string}>
	 */
	public static function collect(
		?array $flash,
		bool $keyphrases,
		string $connect_url,
		bool $on_connect,
		bool $google_missing = false,
		bool $arc_missing = false
	): array {
		$alerts = array();
		if ( $arc_missing ) {
			$alert = array(
				'id'      => 'arc',
				'tone'    => 'info',
				'message' => __( 'Boost your online visibility. Connect your WordPress website with Arc for reports, issues, and recommendations across Analytics, Accessibility, SEO, AI readability, Security, and Brand cohesion.', 'pendulum-arc' ),
				'count'   => false,
			);
			if ( ! $on_connect && '' !== $connect_url ) {
				$alert['href']      = $connect_url;
				$alert['hrefLabel'] = __( 'Connect with Arc', 'pendulum-arc' );
			}
			$alerts[] = $alert;
		}
		if ( is_array( $flash ) && '' !== (string) ( $flash['message'] ?? '' ) ) {
			$alerts[] = array(
				'id'      => 'flash',
				'tone'    => self::tone( (string) ( $flash['status'] ?? 'info' ) ),
				'message' => (string) $flash['message'],
				'count'   => false,
			);
		}
		if ( $keyphrases ) {
			$alert = array(
				'id'      => 'keyphrases',
				'tone'    => 'info',
				'message' => __( 'Keyphrases on this site differ from Arc.', 'pendulum-arc' ),
				'count'   => true,
			);
			if ( ! $on_connect && '' !== $connect_url ) {
				$alert['href']      = $connect_url;
				$alert['hrefLabel'] = __( 'Sync with Arc', 'pendulum-arc' );
			}
			$alerts[] = $alert;
		}
		if ( $google_missing ) {
			$alerts[] = array(
				'id'      => 'google',
				'tone'    => 'info',
				'message' => __( 'Connect your Google account to get GA4 and Search Console insights and improve your rankings.', 'pendulum-arc' ),
				'count'   => false,
			);
		}
		return $alerts;
	}

	/**
	 * Banner tone. Success uses the info banner.
	 */
	private static function tone( string $status ): string {
		if ( 'error' === $status || 'warning' === $status ) {
			return $status;
		}
		return 'info';
	}
}
