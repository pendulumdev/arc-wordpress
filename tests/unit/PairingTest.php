<?php
/**
 * Arc response reading.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Pairing;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Pairing
 */
final class PairingTest extends TestCase {

	public function test_api_key_prefix_selects_the_host(): void {
		self::assertTrue( Pairing::is_api_key( 'arc_live_public_secret' ) );
		self::assertSame( 'production', Pairing::env_for_key( 'arc_live_public_secret' ) );
		self::assertSame( 'preview', Pairing::env_for_key( 'arc_test_public_secret' ) );
		self::assertFalse( Pairing::is_api_key( 'secret' ) );
	}

	public function test_token_site_is_not_the_token_id(): void {
		$parsed = Pairing::token(
			array(
				'access_token' => 'arc_at_example',
				'expires_in'   => 3600,
				'site'         => array(
					'id'        => 'site_abc',
					'projectId' => 'client_abc',
					'name'      => 'Example',
					'baseUrl'   => 'https://example.com/',
				),
			)
		);
		self::assertSame( 'arc_at_example', $parsed['accessToken'] );
		self::assertSame( 'site_abc', $parsed['site']['id'] );
	}

	public function test_create_response_without_a_nested_site(): void {
		$site = Pairing::site(
			array(
				'siteId'    => 'site_new',
				'projectId' => 'client_abc',
				'name'      => 'Example',
				'baseUrl'   => 'https://example.com/',
				'created'   => true,
			)
		);
		self::assertSame( 'site_new', $site['id'] );
	}

	public function test_scores_fill_every_service(): void {
		$scores = Pairing::scores(
			array(
				'scores' => array(
					array(
						'service'   => 'seo',
						'score'     => 82,
						'scoreBand' => 'Good',
					),
				),
			)
		);
		self::assertCount( 6, $scores );
		$seo = null;
		foreach ( $scores as $row ) {
			if ( 'seo' === $row['service'] ) {
				$seo = $row;
			}
		}
		self::assertSame( 82, $seo['score'] );
		self::assertSame( 'Good', $seo['band'] );
		self::assertSame( 0, $seo['issueCount'] );
		self::assertSame( 0, $seo['manualCount'] );
		self::assertNull( $seo['issueSeverity'] );
		self::assertNull( $seo['keyphraseScore'] );
		self::assertNull( $seo['keyphraseBand'] );
		$brand = null;
		foreach ( $scores as $row ) {
			if ( 'brand' === $row['service'] ) {
				$brand = $row;
			}
		}
		self::assertNull( $brand['score'] );
		self::assertSame( 0, $brand['issueCount'] );
	}

	public function test_scores_keep_issue_counts_and_the_seo_keyphrase(): void {
		$scores = Pairing::scores(
			array(
				'scores' => array(
					array(
						'service'        => 'seo',
						'score'          => 30,
						'band'           => 'Critical gaps',
						'issueCount'     => 19,
						'manualCount'    => 3,
						'issueSeverity'  => 'high',
						'keyphraseScore' => 44.2,
						'keyphraseBand'  => 'Critical gaps',
					),
					array(
						'service'       => 'brand',
						'score'         => 74,
						'issueCount'    => -4,
						'issueSeverity' => 'nope',
					),
				),
			)
		);
		$seo = null;
		$brand = null;
		foreach ( $scores as $row ) {
			if ( 'seo' === $row['service'] ) {
				$seo = $row;
			}
			if ( 'brand' === $row['service'] ) {
				$brand = $row;
			}
		}
		self::assertSame( 19, $seo['issueCount'] );
		self::assertSame( 3, $seo['manualCount'] );
		self::assertSame( 'high', $seo['issueSeverity'] );
		self::assertSame( 44.2, $seo['keyphraseScore'] );
		self::assertSame( 'Critical gaps', $seo['keyphraseBand'] );
		self::assertSame( 0, $brand['issueCount'] );
		self::assertNull( $brand['issueSeverity'] );
		self::assertNull( $brand['keyphraseScore'] );
	}

	public function test_analytics_visitors_fill_the_score_card(): void {
		$scores = Pairing::scores(
			array(
				'scores' => array(
					array(
						'service'  => 'analytics',
						'score'    => null,
						'visitors' => array(
							'newUsers'       => 334,
							'returningUsers' => 4,
							'series'         => array( 20, 30 ),
						),
					),
				),
			)
		);
		$analytics = null;
		foreach ( $scores as $row ) {
			if ( 'analytics' === $row['service'] ) {
				$analytics = $row;
			}
		}
		self::assertNull( $analytics['score'] );
		self::assertSame( 334, $analytics['visitors']['newUsers'] );
		self::assertSame( 4, $analytics['visitors']['returningUsers'] );
		self::assertSame( array( 20, 30 ), $analytics['visitors']['series'] );
		self::assertNull( $analytics['visitors']['previousNewUsers'] );
	}

	public function test_landing_path_keeps_the_path_and_drops_traversal(): void {
		self::assertSame( '/pricing/', Pairing::landing_path( 'https://shop.example/pricing/?utm=1' ) );
		self::assertSame( '/pricing/', Pairing::landing_path( '/pricing/' ) );
		self::assertSame( '/', Pairing::landing_path( '' ) );
		self::assertSame( '/', Pairing::landing_path( '/../wp-admin' ) );
	}

	public function test_analytics_keeps_charts_and_landing_paths(): void {
		$view = Pairing::analytics(
			array(
				'runId'        => 'run-1',
				'overline'     => 'Whos Visiting?',
				'charts'       => array(
					array(
						'id'     => 'organic-sessions',
						'labels' => array( '2026-09-01' ),
						'series' => array(),
					),
				),
				'landingPages' => array(
					array(
						'path'           => 'https://shop.example/pricing/',
						'sessions'       => 6,
						'engagementRate' => 0.5,
					),
				),
			)
		);
		self::assertSame( 'run-1', $view['runId'] );
		self::assertSame( 'Whos Visiting?', $view['overline'] );
		self::assertCount( 1, $view['charts'] );
		self::assertSame( '/pricing/', $view['landingPages'][0]['path'] );
		self::assertSame( 6, $view['landingPages'][0]['sessions'] );
		self::assertSame( 0.5, $view['landingPages'][0]['engagementRate'] );
	}

	public function test_site_portal_url_uses_the_project_slug_and_site_id(): void {
		self::assertSame(
			'http://localhost:3001/app/projects/shop/sites/site_abc',
			Pairing::site_portal_url( 'http://localhost:3001/', 'shop', 'site_abc' )
		);
		self::assertSame(
			'http://localhost:3001',
			Pairing::site_portal_url( 'http://localhost:3001', '../shop', 'site_abc' )
		);
		$project = Pairing::project(
			array(
				'project' => array(
					'id'   => 'client_abc',
					'name' => 'Shop',
					'slug' => 'shop',
				),
			)
		);
		self::assertSame( 'shop', $project['slug'] );
	}

	public function test_report_keeps_the_header_and_drops_unsafe_images(): void {
		$view = Pairing::report(
			array(
				'service' => 'seo',
				'runId'   => 'run-1',
				'hero'    => array(
					'title' => 'SEO score',
					'score' => '72',
					'mood'  => 'ok',
					'band'  => 'Needs work<script>',
				),
				'blocks'  => array(
					array(
						'kind'    => 'table',
						'id'      => 'pages',
						'heading' => 'Page analysis',
						'empty'   => 'No pages in this run.',
						'span'    => 'full',
						'columns' => array(
							array(
								'id'    => 'preview',
								'label' => 'Preview',
								'align' => 'start',
							),
						),
						'rows'    => array(
							array(
								'id'    => 'page-1',
								'cells' => array(
									array(
										'text'  => 'About',
										'href'  => 'https://example.com/about',
										'image' => array(
											'src' => 'javascript:alert(1)',
											'alt' => 'Bad',
										),
									),
									array(
										'text'  => 'Home',
										'href'  => 'https://user:secret@example.com/',
										'image' => array(
											'src' => 'https://cdn.example.com/og.png',
											'alt' => 'Home',
										),
									),
								),
							),
						),
					),
					array(
						'kind'    => 'note',
						'heading' => 'Ignored',
					),
				),
				'issues'  => array(
					array(
						'label' => 'Score',
						'items' => array(
							array(
								'title' => 'Short title',
							),
						),
					),
				),
			)
		);
		self::assertSame( 'seo', $view['service'] );
		self::assertSame( '72', $view['hero']['score'] );
		self::assertSame( 'ok', $view['hero']['mood'] );
		self::assertSame( 'Needs work', $view['hero']['band'] );
		self::assertCount( 1, $view['blocks'] );
		self::assertNull( $view['blocks'][0]['rows'][0]['cells'][0]['image'] );
		self::assertNull( $view['blocks'][0]['rows'][0]['cells'][1]['href'] );
		self::assertSame( 'https://cdn.example.com/og.png', $view['blocks'][0]['rows'][0]['cells'][1]['image']['src'] );
		self::assertSame( 'Short title', $view['issues'][0]['items'][0]['title'] );
	}
}
