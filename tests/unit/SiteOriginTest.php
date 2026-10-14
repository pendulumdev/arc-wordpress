<?php
/**
 * Site URL pairing.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Site_Origin;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Site_Origin
 */
final class SiteOriginTest extends TestCase {

	public function test_adds_a_trailing_slash(): void {
		self::assertSame( 'https://example.com/', Site_Origin::normalize( 'https://example.com' ) );
		self::assertSame( 'https://example.com/blog/', Site_Origin::normalize( 'https://example.com/blog' ) );
	}

	public function test_www_and_apex_are_different_sites(): void {
		$sites = array(
			array(
				'id'        => 'site_apex',
				'projectId' => 'client_a',
				'name'      => 'Apex',
				'baseUrl'   => 'https://example.com/',
			),
			array(
				'id'        => 'site_www',
				'projectId' => 'client_a',
				'name'      => 'WWW',
				'baseUrl'   => 'https://www.example.com/',
			),
		);
		$matched = Site_Origin::matching( $sites, 'https://example.com' );
		self::assertCount( 1, $matched );
		self::assertSame( 'site_apex', $matched[0]['id'] );
	}

	public function test_rejects_a_non_http_scheme(): void {
		self::assertNull( Site_Origin::normalize( 'ftp://example.com' ) );
	}
}
