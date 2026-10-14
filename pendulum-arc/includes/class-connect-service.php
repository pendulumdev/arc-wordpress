<?php
/**
 * API-key pairing and the OAuth browser round trip.
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
 * Turns a credential into a stored site connection.
 */
final class Connect_Service {

	/**
	 * @var Connection_Store
	 */
	private Connection_Store $store;

	/**
	 * @var Arc_Client
	 */
	private Arc_Client $client;

	/**
	 * @param Connection_Store $store  Credential store.
	 * @param Arc_Client       $client Arc HTTP.
	 */
	public function __construct( Connection_Store $store, Arc_Client $client ) {
		$this->store  = $store;
		$this->client = $client;
	}

	/**
	 * Starts an API-key connect. May pair, ask for a site, or ask for a project.
	 *
	 * @param string $api_key Pasted key.
	 * @param int    $user_id Admin user id.
	 * @return array<string, mixed>
	 */
	public function begin_api_key( string $api_key, int $user_id ): array {
		$api_key = trim( $api_key );
		if ( ! Pairing::is_api_key( $api_key ) ) {
			throw new Arc_Api_Exception(
				__( 'Enter an Arc API key. It starts with arc_live_ or arc_test_.', 'pendulum-arc' ),
				400
			);
		}

		$env      = Pairing::env_for_key( $api_key );
		$profile  = Arc_Config::install_profile();
		$account  = Pairing::account_label( $this->client->me( $env, $api_key ) );
		$projects = $this->client->projects( $env, $api_key );
		$portal   = Arc_Config::portal( $env );

		if ( array() === $projects ) {
			$this->store->clear_pending( $user_id );
			return array(
				'status'    => 'needs_project',
				'portalUrl' => $portal,
			);
		}

		$sites = array();
		foreach ( $projects as $project ) {
			$sites = array_merge( $sites, $this->client->sites( $env, $api_key, $project['id'] ) );
		}
		$matches = Site_Origin::matching( $sites, $profile['origin'] );

		if ( 1 === count( $matches ) ) {
			$this->save_connection( 'api_key', $env, $api_key, '', 0, $account, $matches[0] );
			$this->store->clear_pending( $user_id );
			return array(
				'status'     => 'connected',
				'connection' => $this->store->public_view(),
			);
		}

		$draft  = array(
			'name'      => $profile['name'],
			'baseUrl'   => (string) ( Site_Origin::normalize( $profile['origin'] ) ?? $profile['origin'] ),
			'projectId' => 1 === count( $projects ) ? $projects[0]['id'] : '',
		);
		$status = count( $matches ) > 1 ? 'choose_site' : 'needs_site';
		$this->store->put_pending(
			$user_id,
			array(
				'status'       => $status,
				'env'          => $env,
				'accessToken'  => $api_key,
				'accountLabel' => $account,
				'projects'     => $projects,
				'matches'      => $matches,
				'draft'        => $draft,
				'portalUrl'    => $portal,
			)
		);

		return array(
			'status'    => $status,
			'projects'  => $projects,
			'matches'   => $matches,
			'draft'     => $draft,
			'portalUrl' => $portal,
		);
	}

	/**
	 * Pairs one of the sites already matched for this attempt.
	 *
	 * @param int    $user_id Admin user id.
	 * @param string $site_id Chosen site.
	 * @return array<string, mixed>
	 */
	public function pair_match( int $user_id, string $site_id ): array {
		$pending = $this->require_pending( $user_id );
		$chosen  = null;
		foreach ( $pending['matches'] as $match ) {
			if ( is_array( $match ) && (string) ( $match['id'] ?? '' ) === $site_id ) {
				$chosen = $match;
				break;
			}
		}
		if ( ! is_array( $chosen ) ) {
			throw new Arc_Api_Exception( __( 'Choose one of the matching sites.', 'pendulum-arc' ), 400 );
		}
		$this->save_connection(
			'api_key',
			(string) $pending['env'],
			(string) $pending['accessToken'],
			'',
			0,
			(string) ( $pending['accountLabel'] ?? '' ),
			$chosen
		);
		$this->store->clear_pending( $user_id );
		return array(
			'status'     => 'connected',
			'connection' => $this->store->public_view(),
		);
	}

	/**
	 * Creates a site with the API key from the pending attempt.
	 *
	 * @param int    $user_id    Admin user id.
	 * @param string $name       Site name.
	 * @param string $base_url   Site URL.
	 * @param string $project_id Project id.
	 * @return array<string, mixed>
	 */
	public function create_site( int $user_id, string $name, string $base_url, string $project_id ): array {
		$pending  = $this->require_pending( $user_id );
		$projects = is_array( $pending['projects'] ?? null ) ? $pending['projects'] : array();
		if ( array() === $projects ) {
			throw new Arc_Api_Exception(
				__( 'Add a project in Arc, then connect again.', 'pendulum-arc' ),
				400
			);
		}
		$errors = Site_Draft::validate( $name, $base_url, $project_id, $projects );
		if ( array() !== $errors ) {
			throw new Draft_Exception( $errors );
		}
		$project_id = Site_Draft::resolve_project( $project_id, $projects );
		$normalized = Site_Origin::normalize( $base_url );
		$created    = $this->client->create_site(
			(string) $pending['env'],
			(string) $pending['accessToken'],
			$project_id,
			array(
				'name'    => trim( $name ),
				'baseUrl' => (string) $normalized,
			),
			wp_generate_uuid4()
		);
		$site       = Pairing::site( $created );
		if ( null === $site ) {
			throw new Arc_Api_Exception( __( 'Arc did not return the site.', 'pendulum-arc' ), 502 );
		}
		$this->save_connection(
			'api_key',
			(string) $pending['env'],
			(string) $pending['accessToken'],
			'',
			0,
			(string) ( $pending['accountLabel'] ?? '' ),
			$site
		);
		$this->store->clear_pending( $user_id );
		return array(
			'status'     => 'connected',
			'connection' => $this->store->public_view(),
		);
	}

	/**
	 * Builds the authorize URL and stores PKCE material.
	 *
	 * @param int $user_id Admin user id.
	 * @return array{authorizeUrl: string}
	 */
	public function oauth_start( int $user_id ): array {
		$env      = Arc_Config::env();
		$profile  = Arc_Config::install_profile();
		$state    = Pkce::state();
		$verifier = Pkce::verifier();
		$redirect = Arc_Config::redirect_uri();
		$portal   = Arc_Config::portal( $env );
		$this->store->put_oauth(
			$user_id,
			array(
				'state'       => $state,
				'verifier'    => $verifier,
				'redirectUri' => $redirect,
				'env'         => $env,
				'portal'      => $portal,
			)
		);
		$query = array(
			'response_type'         => 'code',
			'client_id'             => Arc_Config::client_id(),
			'redirect_uri'          => $redirect,
			'scope'                 => 'arc:read',
			'state'                 => $state,
			'code_challenge'        => Pkce::challenge( $verifier ),
			'code_challenge_method' => 'S256',
			'resource'              => Arc_Config::resource( $env ),
			'site_origin'           => $profile['origin'],
			'site_name'             => $profile['name'],
		);
		return array(
			'authorizeUrl' => $portal . '/oauth/authorize?' . http_build_query( $query, '', '&', PHP_QUERY_RFC3986 ),
		);
	}

	/**
	 * Exchanges the code and stores the site Arc paired.
	 *
	 * @param int    $user_id Admin user id.
	 * @param string $code    Authorization code.
	 * @param string $state   State from the redirect.
	 * @param string $issuer  iss from the redirect.
	 * @return array<string, mixed>
	 */
	public function complete_oauth( int $user_id, string $code, string $state, string $issuer ): array {
		$oauth = $this->store->take_oauth( $user_id, $state );
		if ( null === $oauth ) {
			throw new Arc_Api_Exception(
				__( 'The sign-in attempt expired or did not match this browser. Start again.', 'pendulum-arc' ),
				400
			);
		}
		if ( '' === $issuer || ! hash_equals( (string) $oauth['portal'], rtrim( $issuer, '/' ) ) ) {
			throw new Arc_Api_Exception(
				__( 'Arc did not confirm the sign-in issuer. Start again.', 'pendulum-arc' ),
				400
			);
		}
		$parsed = Pairing::token(
			$this->client->exchange_code(
				(string) $oauth['env'],
				$code,
				(string) $oauth['verifier'],
				(string) $oauth['redirectUri']
			)
		);
		if ( '' === $parsed['accessToken'] || null === $parsed['site'] ) {
			throw new Arc_Api_Exception(
				__( 'Arc did not return a connected site. Approve the connection again.', 'pendulum-arc' ),
				502
			);
		}
		$this->save_connection(
			'oauth',
			(string) $oauth['env'],
			$parsed['accessToken'],
			$parsed['refreshToken'],
			$this->expires_at( $parsed['expiresIn'] ),
			'',
			$parsed['site']
		);
		$this->store->clear_pending( $user_id );
		return array(
			'status'     => 'connected',
			'connection' => $this->store->public_view(),
		);
	}

	/**
	 * Loads the project slug once so Open in Arc can open this site.
	 */
	public function ensure_project_slug(): void {
		$view = $this->store->public_view();
		if ( empty( $view['connected'] ) || '' !== (string) ( $view['projectSlug'] ?? '' ) ) {
			return;
		}
		$project_id = (string) ( $view['projectId'] ?? '' );
		$creds      = $this->store->credentials();
		if ( '' === $project_id || null === $creds ) {
			return;
		}
		try {
			$project = $this->project_row( $creds, $project_id );
		} catch ( Arc_Api_Exception $error ) {
			unset( $error );
			return;
		}
		if ( '' !== $project['slug'] ) {
			$this->store->set_project_slug( $project['slug'] );
		}
	}

	/**
	 * Scores for the dashboard. A failed read still returns the six rows.
	 *
	 * @return array{scores: array<int, array<string, mixed>>, error: string|null}
	 */
	public function scores(): array {
		$creds = $this->store->credentials();
		if ( null === $creds ) {
			return array(
				'scores' => Pairing::scores( array() ),
				'error'  => __( 'Connect this site to Arc first.', 'pendulum-arc' ),
			);
		}
		try {
			$payload = $this->authorized( $creds );
		} catch ( Arc_Api_Exception $error ) {
			return array(
				'scores' => Pairing::scores( array() ),
				'error'  => $error->getMessage(),
			);
		}
		return array(
			'scores' => Pairing::scores( $payload ),
			'error'  => null,
		);
	}

	/**
	 * Forgets the local connection. The site and its reports stay in Arc.
	 *
	 * @param int $user_id Admin user id.
	 */
	public function disconnect( int $user_id ): void {
		$this->store->clear();
		$this->store->clear_pending( $user_id );
	}

	/**
	 * One project, refreshing an OAuth token once after a 401.
	 *
	 * @param array<string, mixed> $creds      Opened credential.
	 * @param string               $project_id Project id.
	 * @return array{id: string, name: string, slug: string}
	 */
	private function project_row( array $creds, string $project_id ): array {
		try {
			return $this->client->project( (string) $creds['env'], (string) $creds['accessToken'], $project_id );
		} catch ( Arc_Api_Exception $error ) {
			if ( 401 !== $error->status_code() || 'oauth' !== $creds['method'] || '' === (string) $creds['refreshToken'] ) {
				throw $error;
			}
		}
		$parsed = Pairing::token( $this->client->refresh( (string) $creds['env'], (string) $creds['refreshToken'] ) );
		if ( '' === $parsed['accessToken'] ) {
			throw new Arc_Api_Exception( __( 'Arc did not accept those credentials.', 'pendulum-arc' ), 401 );
		}
		$this->store->update_tokens(
			$parsed['accessToken'],
			$parsed['refreshToken'],
			$this->expires_at( $parsed['expiresIn'] )
		);
		return $this->client->project( (string) $creds['env'], $parsed['accessToken'], $project_id );
	}

	/**
	 * Calls scores, refreshing an OAuth token once after a 401.
	 *
	 * @param array<string, mixed> $creds Opened credential.
	 * @return array<string, mixed>
	 */
	private function authorized( array $creds ): array {
		try {
			return $this->client->scores( (string) $creds['env'], (string) $creds['accessToken'], (string) $creds['siteId'] );
		} catch ( Arc_Api_Exception $error ) {
			if ( 401 !== $error->status_code() || 'oauth' !== $creds['method'] || '' === $creds['refreshToken'] ) {
				throw $error;
			}
		}
		$parsed = Pairing::token( $this->client->refresh( (string) $creds['env'], (string) $creds['refreshToken'] ) );
		if ( '' === $parsed['accessToken'] ) {
			throw new Arc_Api_Exception( __( 'Arc did not accept those credentials.', 'pendulum-arc' ), 401 );
		}
		$this->store->update_tokens(
			$parsed['accessToken'],
			$parsed['refreshToken'],
			$this->expires_at( $parsed['expiresIn'] )
		);
		return $this->client->scores( (string) $creds['env'], $parsed['accessToken'], (string) $creds['siteId'] );
	}

	/**
	 * Pending API-key attempt, or an error when it has expired.
	 *
	 * @param int $user_id Admin user id.
	 * @return array<string, mixed>
	 */
	private function require_pending( int $user_id ): array {
		$pending = $this->store->get_pending( $user_id );
		if ( null === $pending ) {
			throw new Arc_Api_Exception(
				__( 'The connection attempt expired. Start again.', 'pendulum-arc' ),
				400
			);
		}
		return $pending;
	}

	/**
	 * Writes the paired site.
	 *
	 * @param string               $method  api_key or oauth.
	 * @param string               $env     production or preview.
	 * @param string               $access  Bearer.
	 * @param string               $refresh Refresh token.
	 * @param int                  $expires Unix expiry.
	 * @param string               $account Credential label.
	 * @param array<string, mixed> $site    Paired site.
	 */
	private function save_connection( string $method, string $env, string $access, string $refresh, int $expires, string $account, array $site ): void {
		$this->store->save(
			array(
				'method'       => $method,
				'env'          => $env,
				'accessToken'  => $access,
				'refreshToken' => $refresh,
				'expiresAt'    => $expires,
				'accountLabel' => $account,
				'siteId'       => (string) ( $site['id'] ?? '' ),
				'projectId'    => (string) ( $site['projectId'] ?? '' ),
				'siteName'     => (string) ( $site['name'] ?? '' ),
				'siteUrl'      => (string) ( $site['baseUrl'] ?? '' ),
				'connectedAt'  => gmdate( 'c' ),
			)
		);
	}

	/**
	 * Access-token expiry, with a small skew. Zero means unknown.
	 *
	 * @param int $expires_in Seconds from Arc.
	 */
	private function expires_at( int $expires_in ): int {
		if ( $expires_in <= 0 ) {
			return 0;
		}
		return time() + max( 0, $expires_in - 30 );
	}
}
