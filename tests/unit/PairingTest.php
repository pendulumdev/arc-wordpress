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
		self::assertSame( 82.0, $seo['score'] );
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
		self::assertNull( $brand['setup'] );
	}

	public function test_scores_keep_a_tenth(): void {
		$scores = Pairing::scores(
			array(
				'scores' => array(
					array(
						'service' => 'seo',
						'score'   => 63.4,
					),
				),
			)
		);
		$seo = null;
		foreach ( $scores as $row ) {
			if ( 'seo' === $row['service'] ) {
				$seo = $row;
			}
		}
		self::assertSame( 63.4, $seo['score'] );
	}

	public function test_scores_keep_an_analytics_google_gap(): void {
		$scores = Pairing::scores(
			array(
				'analyticsSetup' => 'connect_google',
				'scores'         => array(),
			)
		);
		$analytics = null;
		foreach ( $scores as $row ) {
			if ( 'analytics' === $row['service'] ) {
				$analytics = $row;
			}
		}
		self::assertSame( 'connect_google', $analytics['setup'] );
		self::assertNull( $scores[1]['setup'] );
	}

	public function test_scores_keep_analytics_when_it_is_not_enabled(): void {
		$scores = Pairing::scores(
			array(
				'analyticsSetup' => 'not_enabled',
				'scores'         => array(),
			)
		);
		$analytics = null;
		foreach ( $scores as $row ) {
			if ( 'analytics' === $row['service'] ) {
				$analytics = $row;
			}
		}
		self::assertSame( 'not_enabled', $analytics['setup'] );
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
								'page'  => array(
									'title'           => 'About<script>',
									'path'            => '/about',
									'url'             => 'javascript:alert(1)',
									'viewport'        => 'desktop',
									'keyphrases'       => array( 'widgets', '<b>sale</b>' ),
									'keyphraseScore'   => '70',
									'hasTitle'         => true,
									'hasDescription'   => false,
									'keyphraseRatings' => array(
										'green'  => 1,
										'orange' => 2,
										'red'    => 0,
									),
									'score'           => '88',
									'siteName'        => 'Example',
									'brokenLinkCount' => 0,
									'issueCount'      => 2,
									'issues'          => array(
										array(
											'key'       => 'S-title',
											'title'     => 'Short title<script>',
											'severity'  => 'high',
											'dimension' => 'meta<script>',
											'summary'   => 'Too short<script>',
											'fix'       => 'Write more<script>',
										),
										array(
											'title'    => 'Dropped',
											'severity' => 'nope',
										),
									),
								),
								'social' => array(
									'url'      => 'https://user:secret@example.com/acme',
									'platform' => 'x',
								),
								'form'   => array(
									'label'    => 'contact<script>',
									'presence' => 'sitewide',
									'variants' => array(
										array(
											'method'           => 'POST',
											'protections'      => array( 'recaptcha' ),
											'protectionCheck'  => 'checked',
											'protectionsKnown' => true,
											'fieldCount'       => 1,
											'fields'           => array( 'Email' ),
											'pageCount'        => 1,
											'pages'            => array( '/contact' ),
										),
									),
								),
								'slot'   => array(
									'id'       => 'favicon',
									'label'    => 'Favicon',
									'hint'     => 'Tab icon',
									'status'   => 'Found',
									'required' => '-',
									'observed' => '32 x 32',
									'image'    => 'javascript:alert(1)',
								),
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
						'kind'    => 'card',
						'id'      => 'short-mark',
						'heading' => 'Short mark',
						'mark'    => array(
							'present'      => true,
							'family'       => 'F2',
							'sharedFamily' => true,
							'role'         => 'short',
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
								'pages' => array(
									array(
										'url'   => 'https://example.com/about',
										'label' => 'About',
									),
									array(
										'url'   => 'javascript:alert(1)',
										'label' => 'Bad',
									),
								),
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
		self::assertCount( 2, $view['blocks'] );
		self::assertTrue( $view['blocks'][1]['mark']['present'] );
		self::assertSame( 'F2', $view['blocks'][1]['mark']['family'] );
		self::assertSame( 'short', $view['blocks'][1]['mark']['role'] );
		self::assertNull( $view['blocks'][0]['rows'][0]['cells'][0]['image'] );
		self::assertNull( $view['blocks'][0]['rows'][0]['cells'][1]['href'] );
		self::assertSame( 'https://cdn.example.com/og.png', $view['blocks'][0]['rows'][0]['cells'][1]['image']['src'] );
		self::assertSame( 'About', $view['blocks'][0]['rows'][0]['page']['title'] );
		self::assertSame( '', $view['blocks'][0]['rows'][0]['page']['url'] );
		self::assertSame( array( 'widgets', 'sale' ), $view['blocks'][0]['rows'][0]['page']['keyphrases'] );
		self::assertTrue( $view['blocks'][0]['rows'][0]['page']['hasTitle'] );
		self::assertFalse( $view['blocks'][0]['rows'][0]['page']['hasDescription'] );
		self::assertSame(
			array(
				'green'  => 1,
				'orange' => 2,
				'red'    => 0,
			),
			$view['blocks'][0]['rows'][0]['page']['keyphraseRatings']
		);
		self::assertArrayNotHasKey( 'social', $view['blocks'][0]['rows'][0] );
		self::assertSame( 'contact', $view['blocks'][0]['rows'][0]['form']['label'] );
		self::assertSame( 'sitewide', $view['blocks'][0]['rows'][0]['form']['presence'] );
		self::assertNull( $view['blocks'][0]['rows'][0]['slot']['image'] );
		self::assertSame( 'Short title', $view['blocks'][0]['rows'][0]['page']['issues'][0]['title'] );
		self::assertSame( 'high', $view['blocks'][0]['rows'][0]['page']['issues'][0]['severity'] );
		self::assertSame( 'meta', $view['blocks'][0]['rows'][0]['page']['issues'][0]['dimension'] );
		self::assertSame( 'Too short', $view['blocks'][0]['rows'][0]['page']['issues'][0]['summary'] );
		self::assertSame( 'Write more', $view['blocks'][0]['rows'][0]['page']['issues'][0]['fix'] );
		self::assertSame( '', $view['blocks'][0]['rows'][0]['page']['issues'][1]['severity'] );
		self::assertSame( 'Short title', $view['issues'][0]['items'][0]['title'] );
		self::assertSame( 'https://example.com/about', $view['issues'][0]['items'][0]['pages'][0]['url'] );
		self::assertCount( 1, $view['issues'][0]['items'][0]['pages'] );
	}

	public function test_report_keeps_an_accessibility_screenshot_name(): void {
		$view = Pairing::report(
			array(
				'service' => 'a11y',
				'blocks'  => array(
					array(
						'kind'    => 'table',
						'id'      => 'pages',
						'heading' => 'Page analysis',
						'columns' => array(
							array(
								'id'    => 'url',
								'label' => 'URL',
							),
						),
						'rows'    => array(
							array(
								'id'    => 'page-1',
								'cells' => array(
									array( 'text' => '/about' ),
								),
								'page'  => array(
									'title'      => 'About',
									'titleKnown' => true,
									'shot'       => 'about__desktop__dark.webp',
								),
							),
							array(
								'id'    => 'page-2',
								'cells' => array(
									array( 'text' => '/' ),
								),
								'page'  => array(
									'titleKnown' => false,
									'shot'       => '../secret.webp',
								),
							),
						),
					),
				),
			)
		);
		self::assertTrue( $view['blocks'][0]['rows'][0]['page']['titleKnown'] );
		self::assertSame( 'about__desktop__dark.webp', $view['blocks'][0]['rows'][0]['page']['shot'] );
		self::assertFalse( $view['blocks'][0]['rows'][1]['page']['titleKnown'] );
		self::assertArrayNotHasKey( 'shot', $view['blocks'][0]['rows'][1]['page'] );
	}

	public function test_report_keeps_ai_bot_and_llms_detail(): void {
		$view = Pairing::report(
			array(
				'service' => 'ai',
				'blocks'  => array(
					array(
						'kind'         => 'table',
						'id'           => 'llms',
						'heading'      => 'llms.txt',
						'fileHref'     => 'https://example.com/llms.txt',
						'formatIssues' => array( 'Missing title', '<script>' ),
						'columns'      => array(
							array(
								'id'    => 'link',
								'label' => 'Link',
							),
						),
						'rows'         => array(
							array(
								'id'    => 'docs',
								'cells' => array(
									array( 'text' => 'Docs' ),
								),
								'llms'  => array(
									'title'    => 'Docs',
									'url'      => 'https://example.com/docs',
									'notes'    => 'Main guide',
									'section'  => 'Docs',
									'optional' => true,
									'broken'   => false,
								),
							),
						),
					),
					array(
						'kind'    => 'table',
						'id'      => 'bots',
						'heading' => 'Bot access',
						'columns' => array(
							array(
								'id'    => 'bot',
								'label' => 'Bot',
							),
						),
						'rows'    => array(
							array(
								'id'    => 'GPTBot',
								'kind'  => 'disallow',
								'cells' => array(
									array( 'text' => 'GPTBot' ),
								),
								'bot'   => array(
									'ua'     => 'GPTBot',
									'status' => 'disallow',
									'rule'   => 'Disallow: /',
									'source' => 'robots',
								),
							),
						),
					),
				),
			)
		);
		self::assertSame( 'https://example.com/llms.txt', $view['blocks'][0]['fileHref'] );
		self::assertSame( 'Missing title', $view['blocks'][0]['formatIssues'][0] );
		self::assertSame( 'Main guide', $view['blocks'][0]['rows'][0]['llms']['notes'] );
		self::assertTrue( $view['blocks'][0]['rows'][0]['llms']['optional'] );
		self::assertSame( 'Disallow: /', $view['blocks'][1]['rows'][0]['bot']['rule'] );
		self::assertSame( 'disallow', $view['blocks'][1]['rows'][0]['bot']['status'] );
	}

	public function test_run_all_keeps_known_services_and_drops_the_rest(): void {
		$parsed = Pairing::enqueued_runs(
			array(
				'siteId' => 'site_abc',
				'runs'   => array(
					array(
						'runId'   => 'run_seo',
						'service' => 'seo',
						'siteId'  => 'site_abc',
					),
					array(
						'runId'   => 'run_a11y',
						'service' => 'a11y',
					),
					array(
						'run_id'  => 'run_brand',
						'service' => 'brand',
					),
					array(
						'runId'   => 'run_nope',
						'service' => 'billing',
					),
					'skip',
				),
			)
		);
		self::assertSame(
			array(
				array(
					'runId'   => 'run_seo',
					'service' => 'seo',
				),
				array(
					'runId'   => 'run_a11y',
					'service' => 'a11y',
				),
				array(
					'runId'   => 'run_brand',
					'service' => 'brand',
				),
			),
			$parsed['runs']
		);
	}

	public function test_recrawl_keeps_http_urls_and_drops_the_rest(): void {
		$parsed = Pairing::recrawled_pages(
			array(
				'runId'         => 'run_seo',
				'siteId'        => 'site_abc',
				'service'       => 'seo',
				'reservedPages' => 2,
				'urls'          => array(
					'https://example.com/about',
					'javascript:alert(1)',
					'https://example.com/about',
					'https://example.com/contact',
				),
			)
		);
		self::assertSame(
			array(
				'runId'         => 'run_seo',
				'service'       => 'seo',
				'reservedPages' => 2,
				'urls'          => array(
					'https://example.com/about',
					'https://example.com/contact',
				),
			),
			$parsed
		);
	}

	public function test_report_keeps_security_surfaces(): void {
		$view = Pairing::report(
			array(
				'service' => 'security',
				'blocks'  => array(
					array(
						'kind'    => 'table',
						'id'      => 'surfaces',
						'heading' => 'Surfaces',
						'empty'   => 'No public login, admin, junk, social, or form surfaces were listed.',
						'notes'   => array( 'Forms were capped.', '<b>skip</b>' ),
						'columns' => array(
							array(
								'id'    => 'surface',
								'label' => 'Surface',
							),
						),
						'rows'    => array(
							array(
								'id'      => 'junk',
								'cells'   => array(
									array(
										'text'     => '/.env',
										'pill'     => 'Critical',
										'pillTone' => 'red',
									),
								),
								'targets' => array(
									'surfaces::finding:X-surface-secrets',
									'javascript:alert(1)',
								),
								'surface' => array(
									'kind'        => 'junk',
									'url'         => 'https://ex.test/.env',
									'display'     => '/.env',
									'status'      => 200,
									'statusLabel' => 'open',
									'statusTone'  => 'bad',
									'note'        => 'Env leak probe',
									'junkGroup'   => 'environment',
								),
							),
							array(
								'id'      => 'bad',
								'cells'   => array(
									array( 'text' => 'nope' ),
								),
								'surface' => array(
									'kind' => 'login',
									'url'  => 'javascript:alert(1)',
								),
							),
							array(
								'id'    => 'contact',
								'cells' => array(
									array( 'text' => 'contact' ),
								),
								'form'  => array(
									'label'    => 'contact',
									'presence' => 'single',
									'variants' => array(),
								),
							),
						),
					),
				),
			)
		);
		$block = $view['blocks'][0];
		self::assertSame( 'Forms were capped.', $block['notes'][0] );
		self::assertSame( 'skip', $block['notes'][1] );
		self::assertSame( 'junk', $block['rows'][0]['surface']['kind'] );
		self::assertSame( 'https://ex.test/.env', $block['rows'][0]['surface']['url'] );
		self::assertSame( 200, $block['rows'][0]['surface']['status'] );
		self::assertSame( 'environment', $block['rows'][0]['surface']['junkGroup'] );
		self::assertSame(
			array( 'surfaces::finding:X-surface-secrets' ),
			$block['rows'][0]['targets']
		);
		self::assertArrayNotHasKey( 'surface', $block['rows'][1] );
		self::assertSame( 'contact', $block['rows'][2]['form']['label'] );
	}

	public function test_report_keeps_table_paging_fields(): void {
		$view = Pairing::report(
			array(
				'service' => 'a11y',
				'blocks'  => array(
					array(
						'kind'      => 'table',
						'id'        => 'pages',
						'heading'   => 'Page analysis',
						'pageIndex' => 1,
						'pageCount' => 4,
						'total'     => 180,
						'viewports' => array( 'desktop', 'mobile<script>', '' ),
						'columns'   => array(
							array(
								'id'    => 'url',
								'label' => 'URL',
							),
						),
						'rows'      => array(
							array(
								'id'    => 'page-1',
								'cells' => array(
									array( 'text' => '/about' ),
								),
							),
						),
					),
				),
			)
		);
		$block = $view['blocks'][0];
		self::assertSame( 1, $block['pageIndex'] );
		self::assertSame( 4, $block['pageCount'] );
		self::assertSame( 180, $block['total'] );
		self::assertSame( array( 'desktop', 'mobile' ), $block['viewports'] );
	}
}
