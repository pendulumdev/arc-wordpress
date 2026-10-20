<?php
/**
 * Keyphrase list, hash, and delta plan.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Keyphrase_Collect;
use ArcWordpress\Page_Alerts;
use ArcWordpress\Keyphrase_Cursor;
use ArcWordpress\Keyphrase_Hash;
use ArcWordpress\Keyphrase_Phrase;
use ArcWordpress\Keyphrase_Push;
use ArcWordpress\Keyphrase_Sources;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Keyphrase_Hash
 * @covers \ArcWordpress\Keyphrase_Push
 * @covers \ArcWordpress\Page_Alerts
 */
final class KeyphraseTest extends TestCase {

	public function test_hash_matches_the_arc_fixture(): void {
		$hash = Keyphrase_Hash::of(
			'widgets',
			array(
				array(
					'path'   => '/about',
					'phrase' => 'about widgets',
				),
			)
		);
		self::assertSame( Keyphrase_Hash::FIXTURE, $hash );
	}

	public function test_hash_ignores_page_order(): void {
		$first  = array(
			array(
				'path'   => '/b',
				'phrase' => 'bee',
			),
			array(
				'path'   => '/a',
				'phrase' => 'aye',
			),
		);
		$second = array( $first[1], $first[0] );
		self::assertSame( Keyphrase_Hash::of( '', $first ), Keyphrase_Hash::of( null, $second ) );
	}

	public function test_phrase_keeps_five_and_drops_duplicates(): void {
		self::assertSame(
			'one, two, three, four, five',
			Keyphrase_Phrase::list( 'one, two, one, three, four, five, six' )
		);
	}

	public function test_yoast_reads_the_premium_keyword_list(): void {
		$json = '[{"keyword":"second"},{"keyword":"third"}]';
		self::assertSame( 'primary, second, third', Keyphrase_Phrase::yoast( 'primary', $json ) );
	}

	public function test_aioseo_reads_focus_then_additional(): void {
		$json = '{"focus":{"keyphrase":"home"},"additional":[{"keyphrase":"shop"}]}';
		self::assertSame( 'home, shop', Keyphrase_Phrase::aioseo( $json ) );
	}

	public function test_first_plugin_with_a_phrase_wins(): void {
		self::assertSame(
			'yoast',
			Keyphrase_Sources::phrase(
				array(
					'yoast'     => 'yoast',
					'rank_math' => 'rank',
				)
			)
		);
		self::assertSame(
			'rank',
			Keyphrase_Sources::phrase(
				array(
					'rank_math' => 'rank',
					'aioseo'    => '{"focus":{"keyphrase":"aio"}}',
				)
			)
		);
	}

	public function test_front_page_is_focus_and_query_urls_are_skipped(): void {
		$front = Keyphrase_Collect::row(
			'https://example.com/home',
			'https://example.com',
			true,
			array( 'welcome' )
		);
		self::assertSame( 'focus', $front['role'] );
		self::assertSame( 'welcome', $front['phrase'] );

		$skipped = Keyphrase_Collect::row(
			'https://example.com/?p=1',
			'https://example.com',
			false,
			array( 'plain' )
		);
		self::assertSame( 'skip', $skipped['role'] );
	}

	public function test_cursor_moves_through_posts_then_taxonomies(): void {
		$cursor = Keyphrase_Cursor::start( array( 'category', 'post_tag' ) );
		$cursor = Keyphrase_Cursor::advance( $cursor, 200, 200, 200, 2 );
		self::assertSame( 'posts', $cursor['phase'] );
		self::assertFalse( $cursor['done'] );

		$cursor = Keyphrase_Cursor::advance( $cursor, 3, 200, 203, 2 );
		self::assertSame( 'terms', $cursor['phase'] );
		self::assertSame( 0, $cursor['taxonomy'] );

		$cursor = Keyphrase_Cursor::advance( $cursor, 1, 200, 0, 2 );
		self::assertSame( 1, $cursor['taxonomy'] );
		self::assertFalse( $cursor['done'] );

		$cursor = Keyphrase_Cursor::advance( $cursor, 0, 200, 0, 2 );
		self::assertTrue( $cursor['done'] );
	}

	public function test_matching_hash_sends_only_dirty_rows(): void {
		$acked = 'abc';
		$plan  = Keyphrase_Push::plan(
			$acked,
			$acked,
			'home',
			'home',
			array(
				array(
					'path'          => '/about',
					'phrase'        => 'about widgets',
					'synced_phrase' => 'about',
					'deleted'       => false,
				),
				array(
					'path'          => '/old',
					'phrase'        => '',
					'synced_phrase' => 'old',
					'deleted'       => true,
				),
				array(
					'path'          => '/same',
					'phrase'        => 'same',
					'synced_phrase' => 'same',
					'deleted'       => false,
				),
			)
		);
		self::assertSame( 'patch', $plan['mode'] );
		self::assertFalse( $plan['send_focus'] );
		self::assertSame( array( '/old' ), $plan['deletes'] );
		self::assertCount( 1, $plan['upserts'] );
		self::assertSame( '/about', $plan['upserts'][0]['path'] );
	}

	public function test_a_different_arc_hash_replaces_the_whole_list(): void {
		$plan = Keyphrase_Push::plan(
			'acked',
			'moved',
			'',
			'old focus',
			array(
				array(
					'path'          => '/about',
					'phrase'        => 'about',
					'synced_phrase' => 'about',
					'deleted'       => false,
				),
				array(
					'path'          => '/gone',
					'phrase'        => '',
					'synced_phrase' => 'gone',
					'deleted'       => true,
				),
			)
		);
		self::assertSame( 'replace', $plan['mode'] );
		self::assertTrue( $plan['send_focus'] );
		self::assertNull( $plan['focus'] );
		self::assertSame( array(), $plan['deletes'] );
		self::assertCount( 1, $plan['upserts'] );
	}

	public function test_only_the_keyphrase_alert_counts(): void {
		self::assertFalse( Page_Alerts::keyphrase_pending( true, false, true, 'home', '', true, false ) );
		self::assertFalse( Page_Alerts::keyphrase_pending( true, true, false, 'home', '', true, false ) );
		self::assertTrue( Page_Alerts::keyphrase_pending( true, true, true, 'home', 'home', true, false ) );
		self::assertTrue( Page_Alerts::keyphrase_pending( true, true, true, 'home', '', false, false ) );
		self::assertTrue( Page_Alerts::keyphrase_pending( true, true, true, 'home', 'home', false, true ) );
		self::assertFalse( Page_Alerts::keyphrase_pending( true, true, true, 'home', 'home', false, false ) );

		$alerts = Page_Alerts::collect(
			array(
				'status'  => 'error',
				'message' => 'Arc sign-in was cancelled.',
			),
			true,
			'https://example.com/wp-admin/admin.php?page=pendulum-arc-connect',
			false
		);
		self::assertCount( 2, $alerts );
		self::assertSame( 1, Page_Alerts::count( $alerts ) );
		self::assertFalse( $alerts[0]['count'] );
		self::assertTrue( $alerts[1]['count'] );
		self::assertSame( 'Sync with Arc', $alerts[1]['hrefLabel'] );

		$on_connect = Page_Alerts::collect( null, true, 'https://example.com/connect', true );
		self::assertArrayNotHasKey( 'href', $on_connect[0] );

		$with_google = Page_Alerts::collect( null, true, 'https://example.com/connect', true, true );
		self::assertSame( 'google', $with_google[1]['id'] );
		self::assertFalse( $with_google[1]['count'] );
		self::assertSame( 1, Page_Alerts::count( $with_google ) );

		$unconnected = Page_Alerts::collect( null, true, 'https://example.com/connect', false, false, true );
		self::assertSame( 'arc', $unconnected[0]['id'] );
		self::assertFalse( $unconnected[0]['count'] );
		self::assertSame( 'Connect with Arc', $unconnected[0]['hrefLabel'] );
		self::assertSame( 1, Page_Alerts::count( $unconnected ) );

		$on_connect_only = Page_Alerts::collect( null, false, 'https://example.com/connect', true, false, true );
		self::assertArrayNotHasKey( 'href', $on_connect_only[0] );
		self::assertSame( 0, Page_Alerts::count( $on_connect_only ) );
	}

	public function test_batches_stay_within_five_hundred(): void {
		$upserts = array();
		for ( $i = 0; $i < 600; $i++ ) {
			$upserts[] = array(
				'path'           => '/p' . $i,
				'focusKeyphrase' => 'phrase',
			);
		}
		$batches = Keyphrase_Push::batches( $upserts, array( '/old' ) );
		self::assertCount( 2, $batches );
		self::assertCount( 500, array_merge( $batches[0]['upserts'], $batches[0]['deletes'] ) );
		self::assertSame( array( '/old' ), $batches[0]['deletes'] );
	}
}
