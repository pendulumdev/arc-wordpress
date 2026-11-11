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
	 * @return array<int, array{service: string, score: float|null, band: string|null, issueCount: int, manualCount: int, issueSeverity: string|null, keyphraseScore: float|null, keyphraseBand: string|null, setup: string|null}>
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

		$setup = self::analytics_setup( $json['analyticsSetup'] ?? null );
		$out   = array();
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
				'setup'          => 'analytics' === $service ? $setup : null,
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
			'generation'        => self::generation( $json['generation'] ?? '' ),
			'rangeLabel'        => Site_Origin::field( $json, array( 'rangeLabel', 'range_label' ) ),
			'connectionMeta'    => Site_Origin::field( $json, array( 'connectionMeta', 'connection_meta' ) ),
			'searchConsoleMeta' => Site_Origin::field( $json, array( 'searchConsoleMeta', 'search_console_meta' ) ),
			'overline'          => Site_Origin::field( $json, array( 'overline' ) ),
			'title'             => Site_Origin::field( $json, array( 'title' ) ),
			'detail'            => Site_Origin::field( $json, array( 'detail' ) ),
			'metrics'           => $metrics,
			'charts'            => $charts,
			'landingPages'      => $pages,
			'issues'            => self::issue_groups( $json['issues'] ?? null ),
		);
	}

	/**
	 * Report Issues menu groups. Unknown rows are dropped.
	 *
	 * @param mixed $raw Response issues.
	 * @return array<int, array<string, mixed>>
	 */
	private static function issue_groups( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$groups = array();
		foreach ( $raw as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}
			$label = Site_Origin::field( $group, array( 'label' ) );
			if ( '' === $label ) {
				continue;
			}
			$items = array();
			$rows  = $group['items'] ?? null;
			if ( is_array( $rows ) ) {
				foreach ( $rows as $row ) {
					if ( ! is_array( $row ) ) {
						continue;
					}
					$title = Site_Origin::field( $row, array( 'title' ) );
					if ( '' === $title ) {
						continue;
					}
					$items[] = array(
						'kind'            => Site_Origin::field( $row, array( 'kind' ) ),
						'key'             => Site_Origin::field( $row, array( 'key' ) ),
						'title'           => $title,
						'summary'         => Site_Origin::field( $row, array( 'summary' ) ),
						'fix'             => Site_Origin::field( $row, array( 'fix' ) ),
						'severity'        => Site_Origin::field( $row, array( 'severity' ) ),
						'occurrenceCount' => self::count_value( $row, 'occurrenceCount' ),
						'pages'           => self::issue_pages( $row['pages'] ?? null ),
					);
				}
			}
			$groups[] = array(
				'sectionId' => Site_Origin::field( $group, array( 'sectionId', 'section_id' ) ),
				'label'     => $label,
				'items'     => $items,
			);
		}
		return $groups;
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
	 * Analytics gap from the scores payload, or null when it can run.
	 *
	 * @param mixed $value Raw analyticsSetup.
	 */
	private static function analytics_setup( $value ): ?string {
		if ( 'connect_google' === $value || 'assign_site' === $value || 'not_enabled' === $value ) {
			return $value;
		}
		return null;
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

	/**
	 * Crawl report shell and cards. Paged table rows may arrive empty when
	 * the API deferred them; the admin UI loads windows separately.
	 * Inspector fields are dropped.
	 *
	 * @param array<string, mixed> $json Report response.
	 * @return array<string, mixed>
	 */
	public static function report( array $json ): array {
		$service = Site_Origin::field( $json, array( 'service' ) );
		if ( ! in_array( $service, array( 'seo', 'a11y', 'ai', 'security', 'brand' ), true ) ) {
			$service = '';
		}
		$hero = $json['hero'] ?? null;
		return array(
			'runId'      => Site_Origin::field( $json, array( 'runId', 'run_id' ) ),
			'generation' => self::generation( $json['generation'] ?? '' ),
			'service'    => $service,
			'hero'       => self::report_hero( is_array( $hero ) ? $hero : array() ),
			'blocks'     => self::report_blocks( $json['blocks'] ?? null ),
			'issues'     => self::issue_groups( $json['issues'] ?? null ),
		);
	}

	/**
	 * @param array<string, mixed> $hero Hero object.
	 * @return array<string, mixed>
	 */
	private static function report_hero( array $hero ): array {
		$peer    = $hero['peer'] ?? null;
		$metrics = array();
		if ( is_array( $hero['metrics'] ?? null ) ) {
			foreach ( array_slice( $hero['metrics'], 0, 12 ) as $metric ) {
				if ( ! is_array( $metric ) ) {
					continue;
				}
				$label = self::report_text( $metric['label'] ?? '', 80 );
				if ( '' === $label ) {
					continue;
				}
				$metrics[] = array(
					'label' => $label,
					'value' => self::report_text( $metric['value'] ?? '-', 40 ),
					'mood'  => self::report_tone( $metric['mood'] ?? '' ),
					'tone'  => self::report_tone( $metric['tone'] ?? '' ),
				);
			}
		}
		$inventory = array();
		if ( is_array( $hero['inventory'] ?? null ) ) {
			foreach ( array_slice( $hero['inventory'], 0, 12 ) as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$label = self::report_text( $row['label'] ?? '', 80 );
				$value = self::report_text( $row['value'] ?? '', 240 );
				if ( '' === $label || '' === $value ) {
					continue;
				}
				$inventory[] = array(
					'label' => $label,
					'value' => $value,
				);
			}
		}
		return array(
			'title'     => self::report_text( $hero['title'] ?? '', 120 ),
			'score'     => self::report_text( $hero['score'] ?? '-', 40 ),
			'band'      => self::report_text( $hero['band'] ?? '', 80 ),
			'mood'      => self::report_tone( $hero['mood'] ?? '' ),
			'coverage'  => self::report_text( $hero['coverage'] ?? '', 40 ),
			'peer'      => is_array( $peer ) ? array(
				'title' => self::report_text( $peer['title'] ?? '', 80 ),
				'score' => self::report_text( $peer['score'] ?? '-', 40 ),
				'band'  => self::report_text( $peer['band'] ?? '', 80 ),
				'mood'  => self::report_tone( $peer['mood'] ?? '' ),
			) : null,
			'metrics'   => $metrics,
			'summary'   => self::report_text( $hero['summary'] ?? '', 240 ),
			'inventory' => $inventory,
			'note'      => self::report_text( $hero['note'] ?? '', 500 ),
		);
	}

	/**
	 * @param mixed $raw Blocks.
	 * @return array<int, array<string, mixed>>
	 */
	private static function report_blocks( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$blocks = array();
		foreach ( array_slice( $raw, 0, 24 ) as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}
			$kind = Site_Origin::field( $block, array( 'kind' ) );
			if ( 'table' === $kind ) {
				$blocks[] = self::report_table( $block );
			} elseif ( 'card' === $kind ) {
				$blocks[] = self::report_card( $block );
			}
		}
		return $blocks;
	}

	/**
	 * @param array<string, mixed> $block Table block.
	 * @return array<string, mixed>
	 */
	private static function report_table( array $block ): array {
		$columns = array();
		if ( is_array( $block['columns'] ?? null ) ) {
			foreach ( array_slice( $block['columns'], 0, 12 ) as $column ) {
				if ( ! is_array( $column ) ) {
					continue;
				}
				$label = self::report_text( $column['label'] ?? '', 80 );
				if ( '' === $label ) {
					continue;
				}
				$columns[] = array(
					'id'    => self::report_text( $column['id'] ?? '', 40 ),
					'label' => $label,
					'align' => 'end' === ( $column['align'] ?? '' ) ? 'end' : 'start',
				);
			}
		}
		$rows  = array();
		$limit = 'surfaces' === self::report_text( $block['id'] ?? '', 40 ) ? 400 : 200;
		if ( is_array( $block['rows'] ?? null ) ) {
			foreach ( array_slice( $block['rows'], 0, $limit ) as $row ) {
				if ( ! is_array( $row ) || ! is_array( $row['cells'] ?? null ) ) {
					continue;
				}
				$cells = array();
				foreach ( array_slice( $row['cells'], 0, 12 ) as $cell ) {
					if ( is_array( $cell ) ) {
						$cells[] = self::report_cell( $cell );
					}
				}
				$entry   = array(
					'id'      => self::report_text( $row['id'] ?? '', 180 ),
					'kind'    => self::report_kind( $row['kind'] ?? '' ),
					'cells'   => $cells,
					'targets' => self::report_targets( $row['targets'] ?? null ),
				);
				$page    = self::report_page( $row['page'] ?? null );
				$bot     = self::report_bot( $row['bot'] ?? null );
				$llms    = self::report_llms( $row['llms'] ?? null );
				$social  = self::report_social( $row['social'] ?? null );
				$form    = self::report_form( $row['form'] ?? null );
				$surface = self::report_surface( $row['surface'] ?? null );
				$slot    = self::report_slot( $row['slot'] ?? null );
				if ( null !== $page ) {
					$entry['page'] = $page;
				}
				if ( null !== $bot ) {
					$entry['bot'] = $bot;
				}
				if ( null !== $llms ) {
					$entry['llms'] = $llms;
				}
				if ( null !== $social ) {
					$entry['social'] = $social;
				}
				if ( null !== $form ) {
					$entry['form'] = $form;
				}
				if ( null !== $surface ) {
					$entry['surface'] = $surface;
				}
				if ( null !== $slot ) {
					$entry['slot'] = $slot;
				}
				$rows[] = $entry;
			}
		}
		$table = array(
			'kind'    => 'table',
			'id'      => self::report_text( $block['id'] ?? '', 40 ),
			'heading' => self::report_text( $block['heading'] ?? '', 80 ),
			'empty'   => self::report_text( $block['empty'] ?? '', 180 ),
			'span'    => 'half' === ( $block['span'] ?? '' ) ? 'half' : 'full',
			'columns' => $columns,
			'rows'    => $rows,
		);
		if ( array_key_exists( 'pageIndex', $block ) ) {
			$table['pageIndex'] = self::report_count( $block['pageIndex'] );
		}
		if ( array_key_exists( 'pageCount', $block ) ) {
			$table['pageCount'] = max( 1, self::report_count( $block['pageCount'] ) );
		}
		if ( array_key_exists( 'total', $block ) ) {
			$table['total'] = self::report_count( $block['total'] );
		}
		$viewports = array();
		if ( is_array( $block['viewports'] ?? null ) ) {
			foreach ( array_slice( $block['viewports'], 0, 12 ) as $viewport ) {
				$text = self::report_text( $viewport, 40 );
				if ( '' !== $text ) {
					$viewports[] = $text;
				}
			}
		}
		if ( count( $viewports ) > 0 ) {
			$table['viewports'] = $viewports;
		}
		$file = self::http_url( Site_Origin::field( $block, array( 'fileHref' ) ) );
		if ( null !== $file ) {
			$table['fileHref'] = $file;
		}
		$format = array();
		if ( is_array( $block['formatIssues'] ?? null ) ) {
			foreach ( array_slice( $block['formatIssues'], 0, 12 ) as $issue ) {
				$text = self::report_text( $issue, 240 );
				if ( '' !== $text ) {
					$format[] = $text;
				}
			}
		}
		if ( count( $format ) > 0 ) {
			$table['formatIssues'] = $format;
		}
		$notes = array();
		if ( is_array( $block['notes'] ?? null ) ) {
			foreach ( array_slice( $block['notes'], 0, 8 ) as $note ) {
				$text = self::report_text( $note, 240 );
				if ( '' !== $text ) {
					$notes[] = $text;
				}
			}
		}
		if ( count( $notes ) > 0 ) {
			$table['notes'] = $notes;
		}
		return $table;
	}

	/**
	 * Surfaces inventory row. Dropped when the URL is not http(s).
	 *
	 * @param mixed $raw Surface detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_surface( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$url   = self::http_url( Site_Origin::field( $raw, array( 'url' ) ) );
		$kind  = is_string( $raw['kind'] ?? null ) ? $raw['kind'] : '';
		$kinds = array( 'login', 'admin', 'junk', 'social', 'provider', 'other' );
		if ( null === $url || ! in_array( $kind, $kinds, true ) ) {
			return null;
		}
		$labels = array( 'open', 'blocked', 'missing', 'redirect', 'closed' );
		$tones  = array( 'good', 'bad', 'info', 'warn', 'muted' );
		$groups = array( 'environment', 'database', 'other' );
		$label  = is_string( $raw['statusLabel'] ?? null ) ? $raw['statusLabel'] : '';
		$tone   = is_string( $raw['statusTone'] ?? null ) ? $raw['statusTone'] : '';
		$group  = is_string( $raw['junkGroup'] ?? null ) ? $raw['junkGroup'] : '';
		$status = null;
		if ( is_numeric( $raw['status'] ?? null ) ) {
			$parsed = (int) $raw['status'];
			if ( $parsed >= 0 && $parsed <= 599 ) {
				$status = $parsed;
			}
		}
		return array(
			'kind'        => $kind,
			'url'         => $url,
			'display'     => self::report_text( $raw['display'] ?? '', 180 ),
			'status'      => $status,
			'statusLabel' => in_array( $label, $labels, true ) ? $label : null,
			'statusTone'  => in_array( $tone, $tones, true ) ? $tone : 'muted',
			'note'        => self::report_text( $raw['note'] ?? '', 180 ),
			'junkGroup'   => 'junk' === $kind && in_array( $group, $groups, true )
				? $group
				: null,
		);
	}

	/**
	 * Bot access row. Dropped when the user agent or status is missing.
	 *
	 * @param mixed $raw Bot detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_bot( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$ua     = self::report_text( $raw['ua'] ?? '', 80 );
		$status = self::report_kind( $raw['status'] ?? '' );
		if ( '' === $ua || null === $status ) {
			return null;
		}
		return array(
			'ua'       => $ua,
			'status'   => $status,
			'category' => self::report_optional( $raw['category'] ?? '', 40 ),
			'rule'     => self::report_optional( $raw['rule'] ?? '', 120 ),
			'source'   => self::report_optional( $raw['source'] ?? '', 40 ),
		);
	}

	/**
	 * One llms.txt link. Dropped when it has no title and no URL.
	 *
	 * @param mixed $raw Link detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_llms( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$url   = self::http_url( Site_Origin::field( $raw, array( 'url' ) ) ) ?? '';
		$title = self::report_text( $raw['title'] ?? '', 180 );
		if ( '' === $title && '' === $url ) {
			return null;
		}
		$status = null;
		if ( is_numeric( $raw['status'] ?? null ) ) {
			$status = (int) $raw['status'];
		}
		return array(
			'title'    => '' !== $title ? $title : $url,
			'url'      => $url,
			'notes'    => self::report_optional( $raw['notes'] ?? '', 240 ),
			'section'  => self::report_optional( $raw['section'] ?? '', 80 ),
			'optional' => ! empty( $raw['optional'] ),
			'broken'   => ! empty( $raw['broken'] ),
			'status'   => $status,
		);
	}

	/**
	 * @param array<string, mixed> $block Card block.
	 * @return array<string, mixed>
	 */
	private static function report_card( array $block ): array {
		$fields = array();
		if ( is_array( $block['fields'] ?? null ) ) {
			foreach ( array_slice( $block['fields'], 0, 40 ) as $field ) {
				if ( ! is_array( $field ) ) {
					continue;
				}
				$label = self::report_text( $field['label'] ?? '', 80 );
				if ( '' === $label ) {
					continue;
				}
				$fields[] = array(
					'label'    => $label,
					'value'    => self::report_text( $field['value'] ?? '', 500 ),
					'tone'     => self::report_tone( $field['tone'] ?? '' ),
					'href'     => self::http_url( Site_Origin::field( $field, array( 'href' ) ) ),
					'caption'  => self::report_optional( $field['caption'] ?? '', 240 ),
					'pill'     => self::report_optional( $field['pill'] ?? '', 40 ),
					'pillTone' => self::report_accent( $field['pillTone'] ?? '' ),
					'group'    => self::report_optional( $field['group'] ?? '', 40 ),
					'wide'     => ! empty( $field['wide'] ),
					'mark'     => self::report_optional( $field['mark'] ?? '', 40 ),
					'meta'     => self::report_optional( $field['meta'] ?? '', 40 ),
					'targets'  => self::report_targets( $field['targets'] ?? null ),
				);
			}
		}
		$images = array();
		if ( is_array( $block['images'] ?? null ) ) {
			foreach ( array_slice( $block['images'], 0, 24 ) as $image ) {
				if ( ! is_array( $image ) ) {
					continue;
				}
				$src = self::http_url( Site_Origin::field( $image, array( 'src' ) ) );
				if ( null === $src ) {
					continue;
				}
				$href     = self::http_url( Site_Origin::field( $image, array( 'href' ) ) );
				$images[] = array(
					'src'     => $src,
					'href'    => $href ?? $src,
					'alt'     => self::report_text( $image['alt'] ?? '', 180 ),
					'caption' => self::report_text( $image['caption'] ?? '', 180 ),
				);
			}
		}
		$links = array();
		if ( is_array( $block['links'] ?? null ) ) {
			foreach ( array_slice( $block['links'], 0, 40 ) as $link ) {
				if ( ! is_array( $link ) ) {
					continue;
				}
				$href  = self::http_url( Site_Origin::field( $link, array( 'href' ) ) );
				$label = self::report_text( $link['label'] ?? '', 240 );
				if ( null === $href || '' === $label ) {
					continue;
				}
				$links[] = array(
					'href'  => $href,
					'label' => $label,
				);
			}
		}
		$card = array(
			'kind'      => 'card',
			'id'        => self::report_text( $block['id'] ?? '', 40 ),
			'heading'   => self::report_text( $block['heading'] ?? '', 80 ),
			'badge'     => self::report_text( $block['badge'] ?? '', 40 ),
			'badgeTone' => self::report_tone( $block['badgeTone'] ?? '' ),
			'note'      => self::report_text( $block['note'] ?? '', 500 ),
			'href'      => self::http_url( Site_Origin::field( $block, array( 'href' ) ) ),
			'hrefLabel' => self::report_text( $block['hrefLabel'] ?? '', 40 ),
			'span'      => 'half' === ( $block['span'] ?? '' ) ? 'half' : 'full',
			'fields'    => $fields,
			'images'    => $images,
			'text'      => self::report_text( $block['text'] ?? '', 4000 ),
			'links'     => $links,
		);
		$mark = self::report_mark( $block['mark'] ?? null );
		if ( null !== $mark ) {
			$card['mark'] = $mark;
		}
		return $card;
	}

	/**
	 * SEO page row. Unsafe URLs become an empty string.
	 *
	 * @param mixed $raw Page detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_page( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$phrases = array();
		if ( is_array( $raw['keyphrases'] ?? null ) ) {
			foreach ( array_slice( $raw['keyphrases'], 0, 8 ) as $phrase ) {
				$text = self::report_text( $phrase, 80 );
				if ( '' !== $text ) {
					$phrases[] = $text;
				}
			}
		}
		$page = array(
			'title'           => self::report_text( $raw['title'] ?? '', 180 ),
			'path'            => self::report_text( $raw['path'] ?? '', 180 ),
			'url'             => self::http_url( Site_Origin::field( $raw, array( 'url' ) ) ) ?? '',
			'viewport'        => self::report_text( $raw['viewport'] ?? '', 40 ),
			'keyphrases'      => $phrases,
			'keyphraseScore'  => self::report_optional( $raw['keyphraseScore'] ?? '', 16 ),
			'score'           => self::report_text( $raw['score'] ?? '', 16 ),
			'error'           => self::report_optional( $raw['error'] ?? '', 180 ),
			'siteName'        => self::report_optional( $raw['siteName'] ?? '', 80 ),
			'brokenLinkCount' => self::report_count( $raw['brokenLinkCount'] ?? 0 ),
			'issueCount'      => self::report_count( $raw['issueCount'] ?? 0 ),
			'issues'          => self::report_page_issues( $raw['issues'] ?? null ),
		);
		$shot = self::report_shot( $raw['shot'] ?? '' );
		if ( null !== $shot ) {
			$page['shot'] = $shot;
		}
		if ( array_key_exists( 'titleKnown', $raw ) ) {
			$page['titleKnown'] = ! empty( $raw['titleKnown'] );
		}
		return $page;
	}

	/**
	 * Screenshot file name. One path segment, or null.
	 *
	 * @param mixed $value Raw file name.
	 */
	private static function report_shot( $value ): ?string {
		$text = self::report_text( $value, 128 );
		if ( '' === $text || str_contains( $text, '..' ) ) {
			return null;
		}
		if ( 1 !== preg_match( '/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/', $text ) ) {
			return null;
		}
		return $text;
	}

	/**
	 * Issue rows for one page. Markup and the found-on list stay out.
	 *
	 * @param mixed $raw Issue list.
	 * @return array<int, array{key: string, title: string, severity: string, dimension: string, summary: string, fix: string}>
	 */
	private static function report_page_issues( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$allowed = array( 'critical', 'high', 'medium', 'low' );
		$issues  = array();
		foreach ( array_slice( $raw, 0, 24 ) as $issue ) {
			if ( ! is_array( $issue ) ) {
				continue;
			}
			$title = self::report_text( $issue['title'] ?? '', 180 );
			if ( '' === $title ) {
				continue;
			}
			$severity = self::report_text( $issue['severity'] ?? '', 16 );
			if ( ! in_array( $severity, $allowed, true ) ) {
				$severity = '';
			}
			$issues[] = array(
				'key'       => self::report_text( $issue['key'] ?? '', 80 ),
				'title'     => $title,
				'severity'  => $severity,
				'dimension' => self::report_text( $issue['dimension'] ?? '', 40 ),
				'summary'   => self::report_text( $issue['summary'] ?? '', 240 ),
				'fix'       => self::report_text( $issue['fix'] ?? '', 240 ),
			);
		}
		return $issues;
	}

	/**
	 * Pages an issue was found on. Only http(s) urls.
	 *
	 * @param mixed $raw Page list.
	 * @return array<int, array{url: string, label: string}>
	 */
	private static function issue_pages( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$pages = array();
		foreach ( array_slice( $raw, 0, 12 ) as $page ) {
			if ( ! is_array( $page ) ) {
				continue;
			}
			$url = self::http_url( Site_Origin::field( $page, array( 'url' ) ) );
			if ( null === $url ) {
				continue;
			}
			$label   = self::report_text( $page['label'] ?? '', 180 );
			$pages[] = array(
				'url'   => $url,
				'label' => '' !== $label ? $label : $url,
			);
		}
		return $pages;
	}

	/**
	 * Social inventory row. Dropped when the URL is not http(s).
	 *
	 * @param mixed $raw Social detail.
	 * @return array<string, string>|null
	 */
	private static function report_social( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$url = self::http_url( Site_Origin::field( $raw, array( 'url' ) ) );
		if ( null === $url ) {
			return null;
		}
		return array(
			'url'      => $url,
			'platform' => self::report_text( $raw['platform'] ?? '', 40 ),
		);
	}

	/**
	 * Form inventory row.
	 *
	 * @param mixed $raw Form detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_form( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$label = self::report_text( $raw['label'] ?? '', 120 );
		if ( '' === $label ) {
			return null;
		}
		$presence = is_string( $raw['presence'] ?? null ) ? $raw['presence'] : '';
		if ( ! in_array( $presence, array( 'single', 'multiple', 'sitewide' ), true ) ) {
			$presence = 'single';
		}
		$variants = array();
		if ( is_array( $raw['variants'] ?? null ) ) {
			foreach ( array_slice( $raw['variants'], 0, 8 ) as $variant ) {
				if ( ! is_array( $variant ) ) {
					continue;
				}
				$variants[] = self::report_form_variant( $variant );
			}
		}
		return array(
			'label'    => $label,
			'presence' => $presence,
			'variants' => $variants,
		);
	}

	/**
	 * One form variant.
	 *
	 * @param array<string, mixed> $variant Variant.
	 * @return array<string, mixed>
	 */
	private static function report_form_variant( array $variant ): array {
		$protections = array();
		if ( is_array( $variant['protections'] ?? null ) ) {
			foreach ( array_slice( $variant['protections'], 0, 6 ) as $protection ) {
				$text = self::report_text( $protection, 40 );
				if ( '' !== $text ) {
					$protections[] = $text;
				}
			}
		}
		$fields = array();
		if ( is_array( $variant['fields'] ?? null ) ) {
			foreach ( array_slice( $variant['fields'], 0, 24 ) as $field ) {
				$text = self::report_text( $field, 80 );
				if ( '' !== $text ) {
					$fields[] = $text;
				}
			}
		}
		$pages = array();
		if ( is_array( $variant['pages'] ?? null ) ) {
			foreach ( array_slice( $variant['pages'], 0, 12 ) as $page ) {
				$text = self::report_text( $page, 180 );
				if ( '' !== $text ) {
					$pages[] = $text;
				}
			}
		}
		$check = 'skipped' === ( $variant['protectionCheck'] ?? '' ) ? 'skipped' : 'checked';
		return array(
			'method'           => self::report_text( $variant['method'] ?? '', 40 ),
			'protections'      => $protections,
			'protectionCheck'  => $check,
			'protectionsKnown' => ! empty( $variant['protectionsKnown'] ),
			'fieldCount'       => self::report_count( $variant['fieldCount'] ?? 0 ),
			'fields'           => $fields,
			'pageCount'        => self::report_count( $variant['pageCount'] ?? 0 ),
			'pages'            => $pages,
		);
	}

	/**
	 * Brand requirements row.
	 *
	 * @param mixed $raw Slot detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_slot( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$label = self::report_text( $raw['label'] ?? '', 80 );
		if ( '' === $label ) {
			return null;
		}
		return array(
			'id'       => self::report_text( $raw['id'] ?? '', 40 ),
			'label'    => $label,
			'hint'     => self::report_text( $raw['hint'] ?? '', 180 ),
			'status'   => self::report_text( $raw['status'] ?? '', 40 ),
			'required' => self::report_text( $raw['required'] ?? '', 80 ),
			'observed' => self::report_text( $raw['observed'] ?? '', 80 ),
			'image'    => self::http_url( Site_Origin::field( $raw, array( 'image' ) ) ),
		);
	}

	/**
	 * Brand principal mark.
	 *
	 * @param mixed $raw Mark detail.
	 * @return array<string, mixed>|null
	 */
	private static function report_mark( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$role = 'long' === ( $raw['role'] ?? '' ) ? 'long' : 'short';
		return array(
			'present'      => ! empty( $raw['present'] ),
			'family'       => self::report_optional( $raw['family'] ?? '', 16 ),
			'sharedFamily' => ! empty( $raw['sharedFamily'] ),
			'role'         => $role,
		);
	}

	/**
	 * Non-negative count, capped.
	 *
	 * @param mixed $value Raw count.
	 */
	private static function report_count( $value ): int {
		if ( ! is_numeric( $value ) ) {
			return 0;
		}
		$count = (int) $value;
		if ( $count < 0 ) {
			return 0;
		}
		return min( $count, 100000 );
	}

	/**
	 * @param array<string, mixed> $cell Cell.
	 * @return array<string, mixed>
	 */
	private static function report_cell( array $cell ): array {
		$image = null;
		if ( is_array( $cell['image'] ?? null ) ) {
			$src = self::http_url( Site_Origin::field( $cell['image'], array( 'src' ) ) );
			if ( null !== $src ) {
				$image = array(
					'src' => $src,
					'alt' => self::report_text( $cell['image']['alt'] ?? '', 180 ),
				);
			}
		}
		return array(
			'text'     => self::report_text( $cell['text'] ?? '', 500 ),
			'href'     => self::http_url( Site_Origin::field( $cell, array( 'href' ) ) ),
			'image'    => $image,
			'mood'     => self::report_tone( $cell['mood'] ?? '' ),
			'caption'  => self::report_optional( $cell['caption'] ?? '', 240 ),
			'pill'     => self::report_optional( $cell['pill'] ?? '', 40 ),
			'pillTone' => self::report_accent( $cell['pillTone'] ?? '' ),
		);
	}

	/**
	 * Plain text, or null when empty.
	 *
	 * @param mixed $value Raw value.
	 */
	/**
	 * Issue anchors. Only `section::finding:checkId` shapes are kept.
	 *
	 * @param mixed $raw Target list.
	 * @return array<int, string>
	 */
	private static function report_targets( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$targets = array();
		foreach ( array_slice( $raw, 0, 8 ) as $target ) {
			$text = self::report_text( $target, 80 );
			if ( preg_match( '/^(system|environment|surfaces)::finding:[A-Za-z0-9._-]+$/', $text ) ) {
				$targets[] = $text;
			}
		}
		return $targets;
	}

	private static function report_optional( $value, int $max ): ?string {
		$text = self::report_text( $value, $max );
		return '' === $text ? null : $text;
	}

	/**
	 * Pill accent, or null.
	 *
	 * @param mixed $value Raw accent.
	 */
	private static function report_accent( $value ): ?string {
		$accent  = is_string( $value ) ? $value : '';
		$allowed = array( 'cyan', 'emerald', 'lime', 'amber', 'orange', 'coral', 'red', 'muted' );
		return in_array( $accent, $allowed, true ) ? $accent : null;
	}

	/**
	 * Plain text, tags removed, length capped.
	 *
	 * @param mixed $value Raw value.
	 */
	private static function report_text( $value, int $max ): string {
		if ( is_array( $value ) || null === $value ) {
			return '';
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- This file is unit-tested without WordPress.
		$text = trim( strip_tags( (string) $value ) );
		if ( strlen( $text ) > $max ) {
			$text = substr( $text, 0, $max );
		}
		return $text;
	}

	/**
	 * In-flight run status, or null.
	 *
	 * @param mixed $value Raw generation.
	 */
	private static function generation( $value ): ?string {
		$status = is_string( $value ) ? $value : '';
		return in_array( $status, array( 'queued', 'running' ), true ) ? $status : null;
	}

	/**
	 * Closed colour token, or null.
	 *
	 * @param mixed $value Raw tone.
	 */
	private static function report_tone( $value ): ?string {
		$tone    = is_string( $value ) ? $value : '';
		$allowed = array(
			'great',
			'good',
			'ok',
			'poor',
			'bad',
			'critical',
			'serious',
			'moderate',
			'minor',
			'warn',
			'muted',
		);
		return in_array( $tone, $allowed, true ) ? $tone : null;
	}

	/**
	 * Row filter kind, or null.
	 *
	 * @param mixed $value Raw kind.
	 */
	private static function report_kind( $value ): ?string {
		$kind    = is_string( $value ) ? $value : '';
		$allowed = array( 'profile', 'content', 'allow', 'disallow', 'inherited', 'unknown' );
		return in_array( $kind, $allowed, true ) ? $kind : null;
	}

	/**
	 * Absolute http(s) URL with no credentials, or null.
	 */
	private static function http_url( string $value ): ?string {
		$value = trim( $value );
		if ( '' === $value || ! preg_match( '#^https?://#i', $value ) ) {
			return null;
		}
		if ( strlen( $value ) > 2048 ) {
			return null;
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- Unit tests load this file without WordPress.
		$parts = parse_url( $value );
		if ( ! is_array( $parts ) || empty( $parts['host'] ) ) {
			return null;
		}
		if ( isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
			return null;
		}
		$scheme = strtolower( (string) ( $parts['scheme'] ?? '' ) );
		if ( 'http' !== $scheme && 'https' !== $scheme ) {
			return null;
		}
		return $value;
	}

	/**
	 * Newest in-flight status per service from a runs page.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @return array{busy: object}
	 */
	public static function in_flight_runs( array $json ): array {
		$busy = array();
		$seen = array();
		foreach ( self::rows( $json, array( 'runs' ) ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$service = Site_Origin::field( $row, array( 'service' ) );
			if ( ! in_array( $service, self::run_services(), true ) || isset( $seen[ $service ] ) ) {
				continue;
			}
			$seen[ $service ] = true;
			$status           = Site_Origin::field( $row, array( 'status' ) );
			if ( 'queued' === $status || 'running' === $status ) {
				$busy[ $service ] = $status;
			}
		}
		return array( 'busy' => (object) $busy );
	}

	/**
	 * Enqueue acknowledgement.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @return array{runId: string, service: string}
	 */
	public static function enqueued_run( array $json ): array {
		return array(
			'runId'   => Site_Origin::field( $json, array( 'runId', 'run_id' ) ),
			'service' => Site_Origin::field( $json, array( 'service' ) ),
		);
	}

	/**
	 * Reports queued by one run-all call.
	 *
	 * @param array<string, mixed> $json Response body.
	 * @return array{runs: array<int, array{runId: string, service: string}>}
	 */
	public static function enqueued_runs( array $json ): array {
		$runs = array();
		foreach ( self::rows( $json, array( 'runs' ) ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$service = Site_Origin::field( $row, array( 'service' ) );
			if ( ! in_array( $service, self::run_services(), true ) ) {
				continue;
			}
			$runs[] = array(
				'runId'   => Site_Origin::field( $row, array( 'runId', 'run_id' ) ),
				'service' => $service,
			);
		}
		return array( 'runs' => $runs );
	}

	/**
	 * Services the Generate menu can queue.
	 *
	 * @return array<int, string>
	 */
	public static function run_services(): array {
		return array( 'analytics', 'seo', 'a11y', 'ai', 'security', 'brand' );
	}
}
