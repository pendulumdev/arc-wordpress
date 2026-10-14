<?php
/**
 * Stores the connection and short-lived connect attempts.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Options and transients. Tokens are sealed before they are stored.
 */
final class Connection_Store {

	private const OPTION = 'arc_wordpress_connection';

	/**
	 * Whether a site is paired.
	 */
	public function is_connected(): bool {
		$view = $this->public_view();
		return ! empty( $view['connected'] );
	}

	/**
	 * Connection fields safe to send to the browser.
	 *
	 * @return array<string, mixed>
	 */
	public function public_view(): array {
		$stored = get_option( self::OPTION, null );
		if ( ! is_array( $stored ) || empty( $stored['site_id'] ) ) {
			return array( 'connected' => false );
		}
		return array(
			'connected'    => true,
			'method'       => (string) ( $stored['method'] ?? '' ),
			'env'          => (string) ( $stored['env'] ?? 'production' ),
			'accountLabel' => (string) ( $stored['account_label'] ?? '' ),
			'siteId'       => (string) $stored['site_id'],
			'projectId'    => (string) ( $stored['project_id'] ?? '' ),
			'projectSlug'  => (string) ( $stored['project_slug'] ?? '' ),
			'siteName'     => (string) ( $stored['site_name'] ?? '' ),
			'siteUrl'      => (string) ( $stored['site_url'] ?? '' ),
			'connectedAt'  => (string) ( $stored['connected_at'] ?? '' ),
			'portalUrl'    => Pairing::site_portal_url(
				Arc_Config::portal( (string) ( $stored['env'] ?? 'production' ) ),
				(string) ( $stored['project_slug'] ?? '' ),
				(string) $stored['site_id']
			),
		);
	}

	/**
	 * Decrypted credential, or null when it cannot be read.
	 *
	 * @return array<string, mixed>|null
	 */
	public function credentials(): ?array {
		$stored = get_option( self::OPTION, null );
		if ( ! is_array( $stored ) || empty( $stored['site_id'] ) ) {
			return null;
		}
		try {
			$access = Secret_Box::open( (string) $stored['access_token'], $this->key() );
		} catch ( \RuntimeException $error ) {
			unset( $error );
			return null;
		}
		$refresh = '';
		if ( ! empty( $stored['refresh_token'] ) ) {
			try {
				$refresh = Secret_Box::open( (string) $stored['refresh_token'], $this->key() );
			} catch ( \RuntimeException $error ) {
				unset( $error );
				$refresh = '';
			}
		}
		return array(
			'method'       => (string) ( $stored['method'] ?? '' ),
			'env'          => (string) ( $stored['env'] ?? 'production' ),
			'accessToken'  => $access,
			'refreshToken' => $refresh,
			'expiresAt'    => (int) ( $stored['expires_at'] ?? 0 ),
			'siteId'       => (string) $stored['site_id'],
		);
	}

	/**
	 * Replaces the stored connection.
	 *
	 * @param array<string, mixed> $record Plain credential and site.
	 */
	public function save( array $record ): void {
		$refresh = (string) ( $record['refreshToken'] ?? '' );
		$stored  = array(
			'method'        => (string) $record['method'],
			'env'           => (string) $record['env'],
			'access_token'  => Secret_Box::seal( (string) $record['accessToken'], $this->key() ),
			'refresh_token' => '' === $refresh ? '' : Secret_Box::seal( $refresh, $this->key() ),
			'expires_at'    => (int) ( $record['expiresAt'] ?? 0 ),
			'account_label' => (string) ( $record['accountLabel'] ?? '' ),
			'site_id'       => (string) $record['siteId'],
			'project_id'    => (string) ( $record['projectId'] ?? '' ),
			'project_slug'  => (string) ( $record['projectSlug'] ?? '' ),
			'site_name'     => (string) ( $record['siteName'] ?? '' ),
			'site_url'      => (string) ( $record['siteUrl'] ?? '' ),
			'connected_at'  => (string) ( $record['connectedAt'] ?? gmdate( 'c' ) ),
		);
		update_option( self::OPTION, $stored, false );
	}

	/**
	 * Remembers the project slug used in the portal site URL.
	 *
	 * @param string $slug Project slug.
	 */
	public function set_project_slug( string $slug ): void {
		$stored = get_option( self::OPTION, null );
		if ( ! is_array( $stored ) ) {
			return;
		}
		$stored['project_slug'] = $slug;
		update_option( self::OPTION, $stored, false );
	}

	/**
	 * Replaces tokens after a refresh. An empty refresh keeps the previous one.
	 *
	 * @param string $access     New access token.
	 * @param string $refresh    New refresh token, or empty to keep the old one.
	 * @param int    $expires_at Unix expiry.
	 */
	public function update_tokens( string $access, string $refresh, int $expires_at ): void {
		$stored = get_option( self::OPTION, null );
		if ( ! is_array( $stored ) ) {
			return;
		}
		$stored['access_token'] = Secret_Box::seal( $access, $this->key() );
		if ( '' !== $refresh ) {
			$stored['refresh_token'] = Secret_Box::seal( $refresh, $this->key() );
		}
		$stored['expires_at'] = $expires_at;
		update_option( self::OPTION, $stored, false );
	}

	/**
	 * Removes the paired site from this install.
	 */
	public function clear(): void {
		delete_option( self::OPTION );
	}

	/**
	 * Remembers an API-key attempt that still needs a choice.
	 *
	 * @param int                  $user_id Admin user id.
	 * @param array<string, mixed> $pending Plain tokens and choices.
	 */
	public function put_pending( int $user_id, array $pending ): void {
		$pending['accessToken'] = Secret_Box::seal( (string) $pending['accessToken'], $this->key() );
		set_transient( $this->pending_key( $user_id ), $pending, 30 * MINUTE_IN_SECONDS );
	}

	/**
	 * Pending attempt with the token opened.
	 *
	 * @param int $user_id Admin user id.
	 * @return array<string, mixed>|null
	 */
	public function get_pending( int $user_id ): ?array {
		$stored = get_transient( $this->pending_key( $user_id ) );
		if ( ! is_array( $stored ) ) {
			return null;
		}
		try {
			$stored['accessToken'] = Secret_Box::open( (string) $stored['accessToken'], $this->key() );
		} catch ( \RuntimeException $error ) {
			unset( $error );
			return null;
		}
		return $stored;
	}

	/**
	 * Pending fields safe for the connect page.
	 *
	 * @param int $user_id Admin user id.
	 * @return array<string, mixed>|null
	 */
	public function pending_public( int $user_id ): ?array {
		$pending = $this->get_pending( $user_id );
		if ( null === $pending ) {
			return null;
		}
		return array(
			'status'    => (string) ( $pending['status'] ?? '' ),
			'projects'  => $pending['projects'] ?? array(),
			'matches'   => $pending['matches'] ?? array(),
			'draft'     => $pending['draft'] ?? null,
			'portalUrl' => (string) ( $pending['portalUrl'] ?? '' ),
		);
	}

	/**
	 * Drops the pending attempt.
	 *
	 * @param int $user_id Admin user id.
	 */
	public function clear_pending( int $user_id ): void {
		delete_transient( $this->pending_key( $user_id ) );
	}

	/**
	 * Stores PKCE material until Arc redirects back.
	 *
	 * @param int                  $user_id Admin user id.
	 * @param array<string, mixed> $oauth   State, verifier, and hosts.
	 */
	public function put_oauth( int $user_id, array $oauth ): void {
		$oauth['verifier'] = Secret_Box::seal( (string) $oauth['verifier'], $this->key() );
		set_transient( $this->oauth_key( $user_id ), $oauth, 30 * MINUTE_IN_SECONDS );
	}

	/**
	 * Returns the OAuth attempt when the state matches, and always deletes it.
	 *
	 * @param int    $user_id Admin user id.
	 * @param string $state   State from the redirect.
	 * @return array<string, mixed>|null
	 */
	public function take_oauth( int $user_id, string $state ): ?array {
		$key    = $this->oauth_key( $user_id );
		$stored = get_transient( $key );
		delete_transient( $key );
		if ( ! is_array( $stored ) ) {
			return null;
		}
		$expected = (string) ( $stored['state'] ?? '' );
		if ( '' === $expected || ! hash_equals( $expected, $state ) ) {
			return null;
		}
		try {
			$stored['verifier'] = Secret_Box::open( (string) $stored['verifier'], $this->key() );
		} catch ( \RuntimeException $error ) {
			unset( $error );
			return null;
		}
		return $stored;
	}

	/**
	 * One-shot admin notice after a redirect.
	 *
	 * @param int    $user_id Admin user id.
	 * @param string $status  error or success.
	 * @param string $message Sentence.
	 */
	public function put_notice( int $user_id, string $status, string $message ): void {
		set_transient(
			$this->notice_key( $user_id ),
			array(
				'status'  => $status,
				'message' => $message,
			),
			2 * MINUTE_IN_SECONDS
		);
	}

	/**
	 * Reads and deletes the notice.
	 *
	 * @param int $user_id Admin user id.
	 * @return array{status: string, message: string}|null
	 */
	public function take_notice( int $user_id ): ?array {
		$key    = $this->notice_key( $user_id );
		$stored = get_transient( $key );
		delete_transient( $key );
		if ( ! is_array( $stored ) || empty( $stored['message'] ) ) {
			return null;
		}
		return array(
			'status'  => (string) ( $stored['status'] ?? 'error' ),
			'message' => (string) $stored['message'],
		);
	}

	/**
	 * Key derived from the WordPress auth salt.
	 */
	private function key(): string {
		return sodium_crypto_generichash(
			wp_salt( 'auth' ) . '|pendulum-arc-v1',
			'',
			SODIUM_CRYPTO_SECRETBOX_KEYBYTES
		);
	}

	/**
	 * Transient name for a pending API-key attempt.
	 *
	 * @param int $user_id Admin user id.
	 */
	private function pending_key( int $user_id ): string {
		return 'arc_wordpress_pending_' . $user_id;
	}

	/**
	 * Transient name for an OAuth attempt.
	 *
	 * @param int $user_id Admin user id.
	 */
	private function oauth_key( int $user_id ): string {
		return 'arc_wordpress_oauth_' . $user_id;
	}

	/**
	 * Transient name for a flash notice.
	 *
	 * @param int $user_id Admin user id.
	 */
	private function notice_key( int $user_id ): string {
		return 'arc_wordpress_notice_' . $user_id;
	}
}
