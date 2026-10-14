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
}
