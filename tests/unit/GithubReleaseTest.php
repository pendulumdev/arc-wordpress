<?php
/**
 * GitHub release parsing for the plugin updater.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Github_Release;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Github_Release
 */
final class GithubReleaseTest extends TestCase {

	public function test_a_newer_release_zip_is_installable(): void {
		$release = Github_Release::from_api( $this->payload( 'v0.2.0' ) );

		self::assertNotNull( $release );
		self::assertSame( '0.2.0', $release->version() );
		self::assertTrue( $release->is_newer_than( '0.1.0' ) );
		self::assertFalse( $release->is_newer_than( '0.2.0' ) );
		self::assertFalse( $release->is_newer_than( '0.3.0' ) );
		self::assertSame(
			'https://github.com/pendulumdev/arc-wordpress/releases/download/v0.2.0/pendulum-arc.zip',
			$release->package_url()
		);
	}

	public function test_drafts_prereleases_and_foreign_zips_are_ignored(): void {
		$draft = $this->payload( 'v0.2.0' );
		$draft['draft'] = true;
		self::assertNull( Github_Release::from_api( $draft ) );

		$preview = $this->payload( 'v0.2.0' );
		$preview['prerelease'] = true;
		self::assertNull( Github_Release::from_api( $preview ) );

		$foreign = $this->payload( 'v0.2.0' );
		$foreign['assets'][0]['browser_download_url'] = 'https://example.com/pendulum-arc.zip';
		self::assertNull( Github_Release::from_api( $foreign ) );

		$missing = $this->payload( 'v0.2.0' );
		$missing['assets'] = array();
		self::assertNull( Github_Release::from_api( $missing ) );

		self::assertNull( Github_Release::from_api( $this->payload( '0.2.0' ) ) );
	}

	/**
	 * @param string $tag Release tag.
	 * @return array<string, mixed>
	 */
	private function payload( string $tag ): array {
		return array(
			'tag_name' => $tag,
			'body'     => 'Notes',
			'html_url' => 'https://github.com/pendulumdev/arc-wordpress/releases/tag/' . $tag,
			'assets'   => array(
				array(
					'name'                 => 'pendulum-arc.zip',
					'browser_download_url' => 'https://github.com/pendulumdev/arc-wordpress/releases/download/' . $tag . '/pendulum-arc.zip',
				),
			),
		);
	}
}
