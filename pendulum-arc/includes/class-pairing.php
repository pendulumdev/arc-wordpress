<?php
/**
 * Reads Arc JSON without assuming one key style.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Response shapes from spec 19.
 */
final class Pairing {

	public const SERVICES = array( 'analytics', 'seo', 'a11y', 'ai', 'security', 'brand' );

	/**
	 * True when the pasted value is an Arc API key.
	 *
	 * @param string $key Pasted key.
	 */
	public static function is_api_key( string $key ): bool {
		return 1 === preg_match( '/^arc_(live|test)_[A-Za-z0-9]+_[A-Za-z0-9]+$/', $key );
	}

	/**
	 * production or preview from the key prefix.
	 *
	 * @param string $key Valid API key.
	 */
	public static function env_for_key( string $key ): string {
		return str_starts_with( $key, 'arc_test_' ) ? 'preview' : 'production';
	}

	/**
	 * Credential label from GET /v1/me.
	 *
	 * @param array<string, mixed> $json Response body.
	 */
	public static function account_label( array $json ): string {
		return Site_Origin::field( $json, array( 'name', 'label' ) );
	}

	/**
	 * Project rows from a list response.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @return array<int, array{id: string, name: string, slug: string}>
	 */
	public static function projects( array $json ): array {
		$rows = self::rows( $json, array( 'projects', 'items', 'data' ) );
		$out  = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$id   = Site_Origin::field( $row, array( 'id' ) );
			$name = Site_Origin::field( $row, array( 'name' ) );
			if ( '' === $id ) {
				continue;
			}
			$out[] = array(
				'id'   => $id,
				'name' => '' !== $name ? $name : $id,
				'slug' => self::path_segment( Site_Origin::field( $row, array( 'slug' ) ) ),
			);
		}
		return $out;
	}

	/**
	 * One project from GET /v1/projects/{id}.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @return array{id: string, name: string, slug: string}
	 */
	public static function project( array $json ): array {
		$row = $json['project'] ?? $json;
		if ( ! is_array( $row ) ) {
			$row = array();
		}
		$parsed = self::projects( array( 'projects' => array( $row ) ) );
		if ( array() === $parsed ) {
			return array(
				'id'   => '',
				'name' => '',
				'slug' => '',
			);
		}
		return $parsed[0];
	}

	/**
	 * Portal page for one site. Falls back to the portal origin when the
	 * slug or site id is not a single path segment.
	 *
	 * @param string $portal  Portal origin.
	 * @param string $slug    Project slug.
	 * @param string $site_id Site id.
	 */
	public static function site_portal_url( string $portal, string $slug, string $site_id ): string {
		$origin = rtrim( $portal, '/' );
		$slug   = self::path_segment( $slug );
		$site   = self::path_segment( $site_id );
		if ( '' === $origin || '' === $slug || '' === $site ) {
			return $origin;
		}
		return $origin . '/app/projects/' . rawurlencode( $slug ) . '/sites/' . rawurlencode( $site );
	}

	/**
	 * One URL path segment, or empty when the value could change the path.
	 *
	 * @param string $value Raw id or slug.
	 */
	private static function path_segment( string $value ): string {
		$value = trim( $value );
		if ( '' === $value || str_contains( $value, '/' ) || str_contains( $value, '\\' ) || str_contains( $value, '..' ) ) {
			return '';
		}
		return $value;
	}

	/**
	 * Site rows from a list response.
	 *
	 * @param array<string, mixed> $json       Response body.
	 * @param string               $project_id Project the list was requested for.
	 * @return array<int, array{id: string, projectId: string, name: string, baseUrl: string}>
	 */
	public static function sites( array $json, string $project_id ): array {
		$rows = self::rows( $json, array( 'sites', 'items', 'data' ) );
		$out  = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$site = Site_Origin::site_row( $row );
			if ( null === $site ) {
				continue;
			}
			if ( '' === $site['projectId'] ) {
				$site['projectId'] = $project_id;
			}
			$out[] = $site;
		}
		return $out;
	}

	/**
	 * Site object from a token or create response.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @return array{id: string, projectId: string, name: string, baseUrl: string}|null
	 */
	public static function site( array $json ): ?array {
		if ( isset( $json['site'] ) && is_array( $json['site'] ) ) {
			$nested = Site_Origin::site_row( $json['site'] );
			if ( null !== $nested ) {
				return $nested;
			}
		}
		if ( isset( $json['access_token'] ) || isset( $json['accessToken'] ) ) {
			return null;
		}
		$id = Site_Origin::field( $json, array( 'siteId', 'site_id' ) );
		if ( '' === $id ) {
			return null;
		}
		return Site_Origin::site_row(
			array(
				'id'        => $id,
				'projectId' => Site_Origin::field( $json, array( 'projectId', 'project_id' ) ),
				'name'      => Site_Origin::field( $json, array( 'name' ) ),
				'baseUrl'   => Site_Origin::field( $json, array( 'baseUrl', 'base_url' ) ),
			)
		);
	}

	/**
	 * OAuth token fields.
	 *
	 * @param array<string, mixed> $json Token response.
	 * @return array{accessToken: string, refreshToken: string, expiresIn: int, site: array{id: string, projectId: string, name: string, baseUrl: string}|null}
	 */
	public static function token( array $json ): array {
		$expires = 0;
		if ( isset( $json['expires_in'] ) && is_numeric( $json['expires_in'] ) ) {
			$expires = (int) $json['expires_in'];
		} elseif ( isset( $json['expiresIn'] ) && is_numeric( $json['expiresIn'] ) ) {
			$expires = (int) $json['expiresIn'];
		}
		return array(
			'accessToken'  => Site_Origin::field( $json, array( 'access_token', 'accessToken' ) ),
			'refreshToken' => Site_Origin::field( $json, array( 'refresh_token', 'refreshToken' ) ),
			'expiresIn'    => $expires,
			'site'         => self::site( $json ),
		);
	}

	/**
	 * One row per service, using the latest score when Arc sent one.
	 *
	 * @param array<string, mixed> $json Scores response.
	 * @return array<int, array{service: string, score: float|null, band: string|null, issueCount: int, manualCount: int, issueSeverity: string|null, keyphraseScore: float|null, keyphraseBand: string|null}>
	 */
	public static function scores( array $json ): array {
		$indexed = array();
		$raw     = $json['scores'] ?? null;
		if ( is_array( $raw ) && array_is_list( $raw ) ) {
			foreach ( $raw as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$service = Site_Origin::field( $row, array( 'service' ) );
				if ( '' !== $service ) {
					$indexed[ $service ] = $row;
				}
			}
		} elseif ( is_array( $raw ) ) {
			foreach ( $raw as $service => $row ) {
				if ( is_array( $row ) ) {
					$indexed[ (string) $service ] = $row;
				}
			}
		}

		$out = array();
		foreach ( self::SERVICES as $service ) {
			$row   = $indexed[ $service ] ?? array();
			$out[] = array(
				'service'        => $service,
				'score'          => self::score_value( $row ),
				'band'           => self::band_value( $row ),
				'issueCount'     => self::count_value( $row, 'issueCount' ),
				'manualCount'    => self::count_value( $row, 'manualCount' ),
				'issueSeverity'  => self::severity_value( $row ),
				'keyphraseScore' => self::decimal_score( $row, 'keyphraseScore' ),
				'keyphraseBand'  => self::label_value( $row, array( 'keyphraseBand', 'keyphrase_band' ) ),
				'visitors'       => self::visitors( $service, $row ),
			);
		}
		return $out;
	}

	/**
	 * Path of a GA4 landing label. Absolute URLs keep only the path.
	 *
	 * @param string $label Page path or URL from the report.
	 */
	public static function landing_path( string $label ): string {
		$label = trim( $label );
		if ( '' === $label ) {
			return '/';
		}
		if ( 1 === preg_match( '#^https?://#i', $label ) ) {
			$parts = wp_parse_url( $label );
			$path  = is_array( $parts ) ? (string) ( $parts['path'] ?? '/' ) : '/';
		} else {
			$path = $label;
		}
		$path = '/' . ltrim( $path, '/' );
		if ( str_contains( $path, '..' ) || str_contains( $path, '\\' ) ) {
			return '/';
		}
		return $path;
	}

	/**
	 * Visitor Analytics summary. Charts are always the four GA4 graphs.
	 *
	 * @param array<string, mixed> $json Analytics response.
	 * @return array<string, mixed>
	 */
	public static function analytics( array $json ): array {
		$charts = array();
		$raw    = $json['charts'] ?? null;
		if ( is_array( $raw ) ) {
			foreach ( $raw as $chart ) {
				if ( ! is_array( $chart ) ) {
					continue;
				}
				$id = Site_Origin::field( $chart, array( 'id' ) );
				if ( '' === $id ) {
					continue;
				}
				$charts[] = $chart;
			}
		}
		$pages = array();
		$raw   = $json['landingPages'] ?? null;
		if ( is_array( $raw ) ) {
			foreach ( $raw as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$path    = self::landing_path( Site_Origin::field( $row, array( 'path', 'label' ) ) );
				$pages[] = array(
					'path'           => $path,
					'sessions'       => self::count_value( $row, 'sessions' ),
					'engagementRate' => self::rate_value( $row, 'engagementRate' ),
				);
			}
		}
		$metrics = array();
		$raw     = $json['metrics'] ?? null;
		if ( is_array( $raw ) ) {
			foreach ( $raw as $metric ) {
				if ( is_array( $metric ) ) {
					$metrics[] = $metric;
				}
			}
		}
		return array(
			'runId'             => Site_Origin::field( $json, array( 'runId', 'run_id' ) ),
			'rangeLabel'        => Site_Origin::field( $json, array( 'rangeLabel', 'range_label' ) ),
			'connectionMeta'    => Site_Origin::field( $json, array( 'connectionMeta', 'connection_meta' ) ),
			'searchConsoleMeta' => Site_Origin::field( $json, array( 'searchConsoleMeta', 'search_console_meta' ) ),
			'overline'          => Site_Origin::field( $json, array( 'overline' ) ),
			'title'             => Site_Origin::field( $json, array( 'title' ) ),
			'detail'            => Site_Origin::field( $json, array( 'detail' ) ),
			'metrics'           => $metrics,
			'charts'            => $charts,
			'landingPages'      => $pages,
		);
	}

	/**
	 * Next page cursor, when the list is paged.
	 *
	 * @param array<string, mixed> $json Response body.
	 */
	public static function next_cursor( array $json ): string {
		return Site_Origin::field( $json, array( 'nextCursor', 'next_cursor' ) );
	}

	/**
	 * List rows under the first present key.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @param array<int, string>   $keys Candidate list keys.
	 * @return array<int, mixed>
	 */
	private static function rows( array $json, array $keys ): array {
		foreach ( $keys as $key ) {
			if ( isset( $json[ $key ] ) && is_array( $json[ $key ] ) ) {
				return $json[ $key ];
			}
		}
		return array();
	}

	/**
	 * Visitor counts for the Analytics card, or null.
	 *
	 * @param string               $service Service key.
	 * @param array<string, mixed> $row     Score row.
	 * @return array{newUsers: int, returningUsers: int, previousNewUsers: int|null, previousReturningUsers: int|null, series: array<int, int>}|null
	 */
	private static function visitors( string $service, array $row ): ?array {
		if ( 'analytics' !== $service ) {
			return null;
		}
		$raw = $row['visitors'] ?? null;
		if ( ! is_array( $raw ) || ! is_numeric( $raw['newUsers'] ?? null ) || ! is_numeric( $raw['returningUsers'] ?? null ) ) {
			return null;
		}
		$series = array();
		if ( is_array( $raw['series'] ?? null ) ) {
			foreach ( $raw['series'] as $point ) {
				if ( is_numeric( $point ) ) {
					$series[] = (int) $point;
				}
			}
		}
		return array(
			'newUsers'               => max( 0, (int) $raw['newUsers'] ),
			'returningUsers'         => max( 0, (int) $raw['returningUsers'] ),
			'previousNewUsers'       => is_numeric( $raw['previousNewUsers'] ?? null ) ? (int) $raw['previousNewUsers'] : null,
			'previousReturningUsers' => is_numeric( $raw['previousReturningUsers'] ?? null ) ? (int) $raw['previousReturningUsers'] : null,
			'series'                 => $series,
		);
	}

	/**
	 * Whole-number score from 0 to 100, or null.
	 *
	 * @param array<string, mixed> $row Score row.
	 */
	private static function score_value( array $row ): ?int {
		$number = self::decimal_score( $row, 'score' );
		return null === $number ? null : (int) round( $number );
	}

	/**
	 * Engagement rate stored from 0 to 1.
	 *
	 * @param array<string, mixed> $row Landing row.
	 */
	private static function rate_value( array $row, string $key ): ?float {
		$raw = $row[ $key ] ?? null;
		if ( ! is_numeric( $raw ) ) {
			return null;
		}
		$number = (float) $raw;
		if ( $number < 0 || $number > 1 ) {
			return null;
		}
		return $number;
	}

	/**
	 * Score from 0 to 100, kept to one decimal, or null.
	 *
	 * @param array<string, mixed> $row Score row.
	 */
	private static function decimal_score( array $row, string $key ): ?float {
		$raw = $row[ $key ] ?? null;
		if ( ! is_numeric( $raw ) ) {
			return null;
		}
		$number = (float) $raw;
		if ( $number < 0 || $number > 100 ) {
			return null;
		}
		return round( $number, 1 );
	}

	/**
	 * Non-negative count. Missing or junk is zero.
	 *
	 * @param array<string, mixed> $row Score row.
	 */
	private static function count_value( array $row, string $key ): int {
		$raw = $row[ $key ] ?? 0;
		if ( ! is_numeric( $raw ) ) {
			return 0;
		}
		$number = (int) $raw;
		return $number < 0 ? 0 : $number;
	}

	/**
	 * Closed severity, or null.
	 *
	 * @param array<string, mixed> $row Score row.
	 */
	private static function severity_value( array $row ): ?string {
		$severity = Site_Origin::field( $row, array( 'issueSeverity', 'issue_severity' ) );
		if ( in_array( $severity, array( 'critical', 'high', 'medium', 'low' ), true ) ) {
			return $severity;
		}
		return null;
	}

	/**
	 * Short band label, or null.
	 *
	 * @param array<string, mixed> $row Score row.
	 */
	private static function band_value( array $row ): ?string {
		return self::label_value( $row, array( 'band', 'scoreBand', 'score_band' ) );
	}

	/**
	 * Short label, or null.
	 *
	 * @param array<string, mixed> $row  Score row.
	 * @param array<int, string>   $keys Candidate keys.
	 */
	private static function label_value( array $row, array $keys ): ?string {
		$band = Site_Origin::field( $row, $keys );
		if ( '' === $band ) {
			return null;
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- This file is unit-tested without WordPress.
		$band = trim( strip_tags( $band ) );
		if ( strlen( $band ) > 80 ) {
			$band = substr( $band, 0, 80 );
		}
		return '' === $band ? null : $band;
	}
}
