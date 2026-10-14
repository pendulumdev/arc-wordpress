<?php
/**
 * PKCE and admin page rules.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Admin_Access;
use ArcWordpress\Pkce;
use ArcWordpress\Secret_Box;
use ArcWordpress\Site_Draft;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Pkce
 * @covers \ArcWordpress\Admin_Access
 * @covers \ArcWordpress\Secret_Box
 * @covers \ArcWordpress\Site_Draft
 */
final class ConnectRulesTest extends TestCase {

	public function test_challenge_is_s256_without_padding(): void {
		$verifier  = Pkce::verifier();
		$challenge = Pkce::challenge( $verifier );
		self::assertGreaterThanOrEqual( 43, strlen( $verifier ) );
		self::assertStringNotContainsString( '=', $challenge );
		self::assertStringNotContainsString( '+', $challenge );
		self::assertStringNotContainsString( '/', $challenge );
		$again = rtrim( strtr( base64_encode( hash( 'sha256', $verifier, true ) ), '+/', '-_' ), '=' );
		self::assertSame( $again, $challenge );
	}

	public function test_only_the_connect_screen_is_open_without_a_connection(): void {
		self::assertFalse( Admin_Access::requires_connection( 'pendulum-arc-connect' ) );
		self::assertTrue( Admin_Access::requires_connection( 'pendulum-arc' ) );
		self::assertTrue( Admin_Access::requires_connection( 'pendulum-arc-reports' ) );
		self::assertFalse( Admin_Access::requires_connection( 'plugins' ) );
	}

	public function test_secret_box_round_trip(): void {
		$key    = random_bytes( SODIUM_CRYPTO_SECRETBOX_KEYBYTES );
		$sealed = Secret_Box::seal( 'arc_live_public_secret', $key );
		self::assertStringNotContainsString( 'arc_live_public_secret', $sealed );
		self::assertSame( 'arc_live_public_secret', Secret_Box::open( $sealed, $key ) );
	}

	public function test_draft_requires_a_project_when_there_are_several(): void {
		$projects = array(
			array(
				'id'   => 'client_a',
				'name' => 'A',
			),
			array(
				'id'   => 'client_b',
				'name' => 'B',
			),
		);
		$errors = Site_Draft::validate( 'Example', 'https://example.com', '', $projects );
		self::assertSame( Site_Draft::PROJECT, $errors['projectId'] );
		self::assertSame(
			'client_b',
			Site_Draft::resolve_project( 'client_b', $projects )
		);
	}
}
