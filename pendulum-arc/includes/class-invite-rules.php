<?php
/**
 * Checkbox and page rules for inviting administrators.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pure decisions for the Connect invite list. Arc is not called here.
 */
final class Invite_Rules {

	/**
	 * Administrators on one modal page. Matches the invite-status email cap.
	 */
	public const PAGE_SIZE = 100;

	/**
	 * Longest name or email fragment the list will match.
	 */
	public const SEARCH_MAX = 80;

	/**
	 * Name or email fragment for the administrator list. Asterisks are
	 * removed because WordPress treats them as wildcards.
	 *
	 * @param string $raw Text from the search field.
	 */
	public static function search( string $raw ): string {
		$term = trim( $raw );
		$term = str_replace( '*', '', $term );
		$term = preg_replace( '/\s+/', ' ', $term );
		if ( ! is_string( $term ) ) {
			return '';
		}
		$term = trim( $term );
		if ( function_exists( 'mb_substr' ) ) {
			return mb_substr( $term, 0, self::SEARCH_MAX );
		}
		return substr( $term, 0, self::SEARCH_MAX );
	}

	/**
	 * Email Arc will accept, or an empty string.
	 *
	 * @param string $raw WordPress user email.
	 */
	public static function email( string $raw ): string {
		$email = strtolower( trim( $raw ) );
		if ( strlen( $email ) < 3 || strlen( $email ) > 254 ) {
			return '';
		}
		if ( 1 !== preg_match( '/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email ) ) {
			return '';
		}
		return $email;
	}

	/**
	 * Checkbox for one administrator.
	 *
	 * A missing status is disabled. Someone already on the project, or with
	 * an invite already sent, cannot be selected. Anyone not on this project
	 * starts checked, whether or not they already have an Arc account.
	 *
	 * @param string $email   Normalized email, or empty.
	 * @param string $status  member, pending, none, or empty.
	 * @param string $account active, absent, or empty.
	 * @return array{checked: bool, disabled: bool, label: string}
	 */
	public static function checkbox( string $email, string $status, string $account ): array {
		if ( '' === self::email( $email ) ) {
			return array(
				'checked'  => false,
				'disabled' => true,
				'label'    => __( 'No email address', 'pendulum-arc' ),
			);
		}
		if ( 'member' === $status ) {
			return array(
				'checked'  => false,
				'disabled' => true,
				'label'    => __( 'On this project', 'pendulum-arc' ),
			);
		}
		if ( 'pending' === $status ) {
			return array(
				'checked'  => false,
				'disabled' => true,
				'label'    => __( 'Invite already sent', 'pendulum-arc' ),
			);
		}
		if ( 'none' === $status && 'absent' === $account ) {
			return array(
				'checked'  => true,
				'disabled' => false,
				'label'    => __( 'No Arc account', 'pendulum-arc' ),
			);
		}
		if ( 'none' === $status && 'active' === $account ) {
			return array(
				'checked'  => true,
				'disabled' => false,
				'label'    => __( 'Has an Arc account', 'pendulum-arc' ),
			);
		}
		return array(
			'checked'  => false,
			'disabled' => true,
			'label'    => __( 'Arc did not return a status for this user.', 'pendulum-arc' ),
		);
	}

	/**
	 * Invite-status rows keyed by email. A row with an unknown status is dropped.
	 *
	 * @param array<string, mixed> $payload Arc body.
	 * @return array<string, array{status: string, account: string}>
	 */
	public static function status_index( array $payload ): array {
		$results = $payload['results'] ?? null;
		$out     = array();
		if ( ! is_array( $results ) ) {
			return $out;
		}
		foreach ( $results as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$email   = self::email( (string) ( $row['email'] ?? '' ) );
			$status  = (string) ( $row['status'] ?? '' );
			$account = (string) ( $row['account'] ?? '' );
			if ( '' === $email ) {
				continue;
			}
			if ( ! in_array( $status, array( 'member', 'pending', 'none' ), true ) ) {
				continue;
			}
			if ( ! in_array( $account, array( 'active', 'absent' ), true ) ) {
				continue;
			}
			$out[ $email ] = array(
				'status'  => $status,
				'account' => $account,
			);
		}
		return $out;
	}

	/**
	 * Positive user ids, in order, without duplicates.
	 *
	 * @param array<int, mixed> $raw Request ids.
	 * @return array{ok: true, ids: array<int, int>}|array{ok: false, message: string}
	 */
	public static function user_ids( array $raw ): array {
		$ids  = array();
		$seen = array();
		foreach ( $raw as $item ) {
			if ( is_bool( $item ) || is_array( $item ) || is_object( $item ) || ! is_scalar( $item ) ) {
				continue;
			}
			if ( 1 !== preg_match( '/^[0-9]+$/', (string) $item ) ) {
				continue;
			}
			$id = (int) $item;
			if ( $id <= 0 || isset( $seen[ $id ] ) ) {
				continue;
			}
			$seen[ $id ] = true;
			$ids[]       = $id;
		}
		if ( array() === $ids ) {
			return array(
				'ok'      => false,
				'message' => __( 'Choose at least one administrator.', 'pendulum-arc' ),
			);
		}
		if ( count( $ids ) > self::PAGE_SIZE ) {
			return array(
				'ok'      => false,
				'message' => __( 'Invite one page of administrators at a time.', 'pendulum-arc' ),
			);
		}
		return array(
			'ok'  => true,
			'ids' => $ids,
		);
	}

	/**
	 * Outcome for one address in a list invite response.
	 *
	 * @param array<string, mixed> $row Arc result row.
	 * @return array{outcome: string, message: string}
	 */
	public static function list_result( array $row ): array {
		if ( ! empty( $row['invited'] ) ) {
			return array(
				'outcome' => 'sent',
				'message' => __( 'Invite sent.', 'pendulum-arc' ),
			);
		}
		$code    = isset( $row['code'] ) && is_string( $row['code'] ) ? $row['code'] : '';
		$message = self::refusal_message( $code );
		if ( '' === $message ) {
			$message = __( 'Arc could not invite this person.', 'pendulum-arc' );
		}
		return array(
			'outcome' => 'refused',
			'message' => $message,
		);
	}

	/**
	 * Sentence for a known Arc refusal. Empty when the code is not one of these.
	 *
	 * @param string $code Arc error code.
	 */
	public static function refusal_message( string $code ): string {
		if ( 'SEAT_EXHAUSTED' === $code ) {
			return __( 'No user seats remaining in this studio. Upgrade the plan or add a seat pack.', 'pendulum-arc' );
		}
		if ( 'PENDING_INVITE_CAP' === $code ) {
			return __( 'Too many open invites for this project. Remove one in Arc first.', 'pendulum-arc' );
		}
		if ( 'ALREADY_MEMBER' === $code ) {
			return __( 'Already on this project.', 'pendulum-arc' );
		}
		if ( 'OPEN_INVITE' === $code ) {
			return __( 'An invite is already pending for that email.', 'pendulum-arc' );
		}
		if ( 'INSUFFICIENT_SCOPE' === $code ) {
			return self::reconnect_message();
		}
		if ( 'PREVIEW_EMAIL_DENIED' === $code ) {
			return __( 'Preview access is limited to approved email domains.', 'pendulum-arc' );
		}
		if ( 'INVITE_DELIVERY_FAILED' === $code ) {
			return __( 'The invite could not be sent. Try again.', 'pendulum-arc' );
		}
		return '';
	}

	/**
	 * Shown when the saved grant cannot invite. Same sentence as Connect Google.
	 */
	public static function reconnect_message(): string {
		return __( 'Disconnect and Connect with Arc again before inviting someone who has no Arc account. If you already have an Arc account, continue.', 'pendulum-arc' );
	}
}
