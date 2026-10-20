<?php
/**
 * Invite checkbox and page rules.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Invite_Rules;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Invite_Rules
 */
final class InviteRulesTest extends TestCase {

	public function test_checkbox_starts_checked_when_the_person_is_not_on_this_project(): void {
		$absent = Invite_Rules::checkbox( 'a@example.com', 'none', 'absent' );
		self::assertTrue( $absent['checked'] );
		self::assertFalse( $absent['disabled'] );
		self::assertSame( 'No Arc account', $absent['label'] );

		$active = Invite_Rules::checkbox( 'a@example.com', 'none', 'active' );
		self::assertTrue( $active['checked'] );
		self::assertFalse( $active['disabled'] );
		self::assertSame( 'Has an Arc account', $active['label'] );

		$member = Invite_Rules::checkbox( 'a@example.com', 'member', 'active' );
		self::assertFalse( $member['checked'] );
		self::assertTrue( $member['disabled'] );
		self::assertSame( 'On this project', $member['label'] );

		$pending = Invite_Rules::checkbox( 'a@example.com', 'pending', 'absent' );
		self::assertFalse( $pending['checked'] );
		self::assertTrue( $pending['disabled'] );
		self::assertSame( 'Invite already sent', $pending['label'] );

		$missing = Invite_Rules::checkbox( '', 'none', 'absent' );
		self::assertFalse( $missing['checked'] );
		self::assertTrue( $missing['disabled'] );
		self::assertSame( 'No email address', $missing['label'] );

		$unknown = Invite_Rules::checkbox( 'a@example.com', '', '' );
		self::assertFalse( $unknown['checked'] );
		self::assertTrue( $unknown['disabled'] );
	}

	public function test_one_page_of_ids_drops_duplicates_and_rejects_a_second_page(): void {
		self::assertSame( 100, Invite_Rules::PAGE_SIZE );
		$none = Invite_Rules::user_ids( array( 0, -3, 'nope' ) );
		self::assertFalse( $none['ok'] );

		$page = Invite_Rules::user_ids( array( 2, '2', 4 ) );
		self::assertTrue( $page['ok'] );
		self::assertSame( array( 2, 4 ), $page['ids'] );

		$too_many = Invite_Rules::user_ids( range( 1, Invite_Rules::PAGE_SIZE + 1 ) );
		self::assertFalse( $too_many['ok'] );
	}

	public function test_status_index_keeps_known_rows_only(): void {
		$index = Invite_Rules::status_index(
			array(
				'results' => array(
					array(
						'email'   => 'A@Example.com',
						'status'  => 'member',
						'account' => 'active',
					),
					array(
						'email'   => 'not-an-email',
						'status'  => 'none',
						'account' => 'absent',
					),
					array(
						'email'   => 'b@example.com',
						'status'  => 'other',
						'account' => 'active',
					),
				),
			)
		);
		self::assertSame(
			array(
				'a@example.com' => array(
					'status'  => 'member',
					'account' => 'active',
				),
			),
			$index
		);
	}

	public function test_search_matches_a_name_or_email_fragment(): void {
		self::assertSame( 'Jane Doe', Invite_Rules::search( '  Jane   Doe  ' ) );
		self::assertSame( 'a@example.com', Invite_Rules::search( '*a@example.com*' ) );
		self::assertSame( '', Invite_Rules::search( ' * * ' ) );
		self::assertSame( 80, strlen( Invite_Rules::search( str_repeat( 'a', 120 ) ) ) );
	}

	public function test_pending_cap_refusal_is_a_sentence(): void {
		self::assertStringContainsString(
			'open invites',
			Invite_Rules::refusal_message( 'PENDING_INVITE_CAP' )
		);
		self::assertSame( '', Invite_Rules::refusal_message( 'NO_SUCH_CODE' ) );
	}

	public function test_list_result_maps_a_sent_row_and_a_refusal(): void {
		$sent = Invite_Rules::list_result(
			array(
				'email'   => 'a@example.com',
				'invited' => true,
			)
		);
		self::assertSame( 'sent', $sent['outcome'] );
		self::assertSame( 'Invite sent.', $sent['message'] );

		$capped = Invite_Rules::list_result(
			array(
				'email'   => 'b@example.com',
				'invited' => false,
				'code'    => 'PENDING_INVITE_CAP',
			)
		);
		self::assertSame( 'refused', $capped['outcome'] );
		self::assertStringContainsString( 'open invites', $capped['message'] );

		$unknown = Invite_Rules::list_result( array( 'invited' => false ) );
		self::assertSame( 'refused', $unknown['outcome'] );
		self::assertSame( 'Arc could not invite this person.', $unknown['message'] );
	}
}
