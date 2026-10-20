<?php
/**
 * Lists administrators and invites them onto the paired project.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

// Exception text is JSON for the admin UI, which renders it as text.
// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Connect-screen invites. The browser sends user ids. Emails stay on the server.
 */
final class Invite_Service {

	/**
	 * @var Connection_Store
	 */
	private Connection_Store $store;

	/**
	 * @var Connect_Service
	 */
	private Connect_Service $connect;

	/**
	 * @var Arc_Client
	 */
	private Arc_Client $client;

	/**
	 * @param Connection_Store $store   Paired site.
	 * @param Connect_Service  $connect Bearer calls.
	 * @param Arc_Client       $client  Arc HTTP.
	 */
	public function __construct( Connection_Store $store, Connect_Service $connect, Arc_Client $client ) {
		$this->store   = $store;
		$this->connect = $connect;
		$this->client  = $client;
	}

	/**
	 * One page of administrators and whether each is on the Arc project.
	 *
	 * @param int    $page   1-based page of the filtered list.
	 * @param string $search Name or email fragment. Empty lists everyone.
	 * @return array<string, mixed>
	 */
	public function page( int $page, string $search = '' ): array {
		$search     = Invite_Rules::search( $search );
		$project_id = $this->project_id();
		$listed     = $this->administrators( $page, $search );
		$emails     = array();
		foreach ( $listed['users'] as $user ) {
			$email = Invite_Rules::email( (string) $user->user_email );
			if ( '' !== $email ) {
				$emails[ $email ] = $email;
			}
		}
		$membership = $this->membership( $project_id, array_values( $emails ) );
		if ( $membership['reconnect'] ) {
			return array(
				'reconnect' => true,
				'message'   => Invite_Rules::reconnect_message(),
				'page'      => $listed['page'],
				'pageSize'  => Invite_Rules::PAGE_SIZE,
				'total'     => $listed['total'],
				'search'    => $search,
				'users'     => array(),
			);
		}
		$users = array();
		foreach ( $listed['users'] as $user ) {
			$users[] = self::listed_user( $user, $membership['rows'] );
		}
		return array(
			'reconnect' => false,
			'page'      => $listed['page'],
			'pageSize'  => Invite_Rules::PAGE_SIZE,
			'total'     => $listed['total'],
			'search'    => $search,
			'users'     => $users,
		);
	}

	/**
	 * Invites the checked administrators. Other pages are not included.
	 *
	 * @param array<int, mixed> $raw_ids User ids from the modal.
	 * @return array<string, mixed>
	 */
	public function send( array $raw_ids ): array {
		$parsed = Invite_Rules::user_ids( $raw_ids );
		if ( ! $parsed['ok'] ) {
			throw new Arc_Api_Exception( $parsed['message'], 400 );
		}
		$project_id = $this->project_id();
		$results    = array();
		$pending    = array();
		$emails     = array();
		foreach ( $parsed['ids'] as $user_id ) {
			$user = get_userdata( $user_id );
			if ( ! ( $user instanceof \WP_User ) || ! user_can( $user, 'manage_options' ) ) {
				$results[ $user_id ] = self::result(
					$user_id,
					'',
					'',
					'skipped',
					__( 'This user cannot use Arc.', 'pendulum-arc' )
				);
				continue;
			}
			$name  = self::display_name( $user );
			$email = Invite_Rules::email( (string) $user->user_email );
			if ( '' === $email ) {
				$results[ $user_id ] = self::result(
					$user_id,
					$name,
					'',
					'skipped',
					Invite_Rules::checkbox( '', '', '' )['label']
				);
				continue;
			}
			$pending[ $user_id ] = array(
				'name'  => $name,
				'email' => $email,
			);
			$emails[ $email ]    = $email;
		}
		if ( array() === $pending ) {
			return array(
				'reconnect' => false,
				'results'   => self::ordered( $parsed['ids'], $results ),
			);
		}
		$membership = $this->membership( $project_id, array_values( $emails ) );
		if ( $membership['reconnect'] ) {
			return array(
				'reconnect' => true,
				'message'   => Invite_Rules::reconnect_message(),
				'results'   => self::ordered( $parsed['ids'], $results ),
			);
		}
		$to_send = array();
		foreach ( $pending as $user_id => $person ) {
			$known   = $membership['rows'][ $person['email'] ] ?? null;
			$status  = is_array( $known ) ? $known['status'] : '';
			$account = is_array( $known ) ? $known['account'] : '';
			$box     = Invite_Rules::checkbox( $person['email'], $status, $account );
			if ( $box['disabled'] ) {
				$results[ $user_id ] = self::result(
					$user_id,
					$person['name'],
					$person['email'],
					'skipped',
					$box['label']
				);
				continue;
			}
			$to_send[ $user_id ] = $person;
		}
		if ( array() === $to_send ) {
			return array(
				'reconnect' => false,
				'results'   => self::ordered( $parsed['ids'], $results ),
			);
		}
		$addresses = array();
		foreach ( $to_send as $person ) {
			$addresses[ $person['email'] ] = $person['email'];
		}
		try {
			$created = $this->connect->with_arc(
				function ( string $env, string $token, string $site_id ) use ( $project_id, $addresses ) {
					unset( $site_id );
					return $this->client->create_invites(
						$env,
						$token,
						$project_id,
						array_values( $addresses ),
						wp_generate_uuid4()
					);
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			if ( 'INSUFFICIENT_SCOPE' === $error->error_code() ) {
				return array(
					'reconnect' => true,
					'message'   => Invite_Rules::reconnect_message(),
					'results'   => self::ordered( $parsed['ids'], $results ),
				);
			}
			throw $error;
		}
		$by_email = array();
		$rows     = isset( $created['results'] ) && is_array( $created['results'] ) ? $created['results'] : array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$email = Invite_Rules::email( (string) ( $row['email'] ?? '' ) );
			if ( '' === $email ) {
				continue;
			}
			$by_email[ $email ] = $row;
		}
		foreach ( $to_send as $user_id => $person ) {
			$row = $by_email[ $person['email'] ] ?? null;
			if ( ! is_array( $row ) ) {
				$results[ $user_id ] = self::result(
					$user_id,
					$person['name'],
					$person['email'],
					'refused',
					__( 'Arc did not return a result for this person.', 'pendulum-arc' )
				);
				continue;
			}
			$outcome             = Invite_Rules::list_result( $row );
			$results[ $user_id ] = self::result(
				$user_id,
				$person['name'],
				$person['email'],
				$outcome['outcome'],
				$outcome['message']
			);
		}
		return array(
			'reconnect' => false,
			'results'   => self::ordered( $parsed['ids'], $results ),
		);
	}

	/**
	 * Paired project, or an error when this install cannot invite yet.
	 */
	private function project_id(): string {
		$creds = $this->store->credentials();
		if ( null === $creds ) {
			throw new Arc_Api_Exception( __( 'Connect this site to Arc first.', 'pendulum-arc' ), 401 );
		}
		$project_id = (string) ( $creds['projectId'] ?? '' );
		if ( '' === $project_id ) {
			throw new Arc_Api_Exception( __( 'Reconnect this site in Arc before inviting administrators.', 'pendulum-arc' ), 400 );
		}
		return $project_id;
	}

	/**
	 * Membership for these emails. Reconnect is true when the grant cannot invite.
	 *
	 * @param string             $project_id Paired project.
	 * @param array<int, string> $emails     Normalized emails.
	 * @return array{reconnect: bool, rows: array<string, array{status: string, account: string}>}
	 */
	private function membership( string $project_id, array $emails ): array {
		if ( array() === $emails ) {
			return array(
				'reconnect' => false,
				'rows'      => array(),
			);
		}
		try {
			$payload = $this->connect->with_arc(
				function ( string $env, string $token, string $site_id ) use ( $project_id, $emails ) {
					unset( $site_id );
					return $this->client->invite_status( $env, $token, $project_id, $emails );
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			if ( 'INSUFFICIENT_SCOPE' === $error->error_code() ) {
				return array(
					'reconnect' => true,
					'rows'      => array(),
				);
			}
			throw $error;
		}
		return array(
			'reconnect' => false,
			'rows'      => Invite_Rules::status_index( $payload ),
		);
	}

	/**
	 * One page of users who can manage this site.
	 *
	 * @param int    $page   1-based page.
	 * @param string $search Name or email fragment. Empty lists everyone.
	 * @return array{users: array<int, \WP_User>, total: int, page: int}
	 */
	private function administrators( int $page, string $search ): array {
		$page = max( 1, $page );
		$args = array(
			'capability'  => 'manage_options',
			'number'      => Invite_Rules::PAGE_SIZE,
			'paged'       => $page,
			'orderby'     => 'display_name',
			'order'       => 'ASC',
			'count_total' => true,
		);
		if ( '' !== $search ) {
			$args['search']         = '*' . $search . '*';
			$args['search_columns'] = array( 'display_name', 'user_email', 'user_login' );
		}
		$query = new \WP_User_Query( $args );
		$users = array();
		foreach ( $query->get_results() as $user ) {
			if ( $user instanceof \WP_User ) {
				$users[] = $user;
			}
		}
		return array(
			'users' => $users,
			'total' => (int) $query->get_total(),
			'page'  => $page,
		);
	}

	/**
	 * Modal row for one administrator.
	 *
	 * @param \WP_User                                              $user Administrator.
	 * @param array<string, array{status: string, account: string}> $rows Status keyed by email.
	 * @return array<string, mixed>
	 */
	private static function listed_user( \WP_User $user, array $rows ): array {
		$email   = Invite_Rules::email( (string) $user->user_email );
		$status  = '';
		$account = '';
		if ( '' !== $email && isset( $rows[ $email ] ) ) {
			$status  = $rows[ $email ]['status'];
			$account = $rows[ $email ]['account'];
		}
		$box = Invite_Rules::checkbox( $email, $status, $account );
		return array(
			'id'       => (int) $user->ID,
			'name'     => self::display_name( $user ),
			'email'    => $email,
			'status'   => $status,
			'account'  => $account,
			'checked'  => $box['checked'],
			'disabled' => $box['disabled'],
			'label'    => $box['label'],
		);
	}

	/**
	 * Name shown in the modal.
	 *
	 * @param \WP_User $user Administrator.
	 */
	private static function display_name( \WP_User $user ): string {
		$name = sanitize_text_field( (string) $user->display_name );
		if ( '' === $name ) {
			$name = sanitize_text_field( (string) $user->user_login );
		}
		return $name;
	}

	/**
	 * One send result.
	 *
	 * @param int    $id       User id.
	 * @param string $name     Display name.
	 * @param string $email    Normalized email.
	 * @param string $outcome  sent, skipped, or refused.
	 * @param string $message  Sentence for the modal.
	 * @return array{id: int, name: string, email: string, outcome: string, message: string}
	 */
	private static function result( int $id, string $name, string $email, string $outcome, string $message ): array {
		return array(
			'id'      => $id,
			'name'    => $name,
			'email'   => $email,
			'outcome' => $outcome,
			'message' => $message,
		);
	}

	/**
	 * Results in the same order as the submitted ids.
	 *
	 * @param array<int, int>                                      $ids     Submitted ids.
	 * @param array<int, array{id: int, name: string, email: string, outcome: string, message: string}> $results Keyed by id.
	 * @return array<int, array{id: int, name: string, email: string, outcome: string, message: string}>
	 */
	private static function ordered( array $ids, array $results ): array {
		$out = array();
		foreach ( $ids as $id ) {
			if ( isset( $results[ $id ] ) ) {
				$out[] = $results[ $id ];
			}
		}
		return $out;
	}
}
