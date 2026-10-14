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
			'scope'                 => 'arc:read arc:enqueue',
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
	 * Visitor Analytics for the dashboard. A failed read still returns the four charts.
	 *
	 * @return array<string, mixed>
	 */
	public function analytics(): array {
		$empty = Pairing::analytics( array() );
		$creds = $this->store->credentials();
		if ( null === $creds ) {
			$empty['error'] = __( 'Connect this site to Arc first.', 'pendulum-arc' );
			return $empty;
		}
		try {
			$payload = $this->bearer_call(
				$creds,
				function ( string $token ) use ( $creds ) {
					return $this->client->analytics( (string) $creds['env'], $token, (string) $creds['siteId'] );
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			$empty['error'] = $error->getMessage();
			return $empty;
		}
		$view                 = Pairing::analytics( $payload );
		$view['landingPages'] = $this->landing_pages( $view['landingPages'] );
		$view['error']        = null;
		return $view;
	}

	/**
	 * Header and first section for one crawl report.
	 *
	 * @param string $service seo, a11y, ai, security, or brand.
	 * @return array<string, mixed>
	 */
	public function report( string $service ): array {
		$allowed = array( 'seo', 'a11y', 'ai', 'security', 'brand' );
		if ( ! in_array( $service, $allowed, true ) ) {
			$service = '';
		}
		$empty = Pairing::report( array( 'service' => $service ) );
		if ( '' === $service ) {
			$empty['error'] = __( 'That report is not available.', 'pendulum-arc' );
			return $empty;
		}
		$creds = $this->store->credentials();
		if ( null === $creds ) {
			$empty['error'] = __( 'Connect this site to Arc first.', 'pendulum-arc' );
			return $empty;
		}
		try {
			$payload = $this->bearer_call(
				$creds,
				function ( string $token ) use ( $creds, $service ) {
					return $this->client->report( (string) $creds['env'], $token, (string) $creds['siteId'], $service );
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			$empty['error'] = $error->getMessage();
			return $empty;
		}
		$view            = Pairing::report( $payload );
		$view['service'] = $service;
		$view['blocks']  = $this->link_report_blocks( $view['blocks'] );
		$view['error']   = null;
		return $view;
	}

	/**
	 * In-flight run status for the Generate menu. A failed read still returns
	 * an empty map so the menu can open.
	 *
	 * @return array{busy: object, error: string|null}
	 */
	public function runs(): array {
		$empty = array(
			'busy'  => (object) array(),
			'error' => null,
		);
		$creds = $this->store->credentials();
		if ( null === $creds ) {
			$empty['error'] = __( 'Connect this site to Arc first.', 'pendulum-arc' );
			return $empty;
		}
		try {
			$payload = $this->bearer_call(
				$creds,
				function ( string $token ) use ( $creds ) {
					return $this->client->runs( (string) $creds['env'], $token, (string) $creds['siteId'] );
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			$empty['error'] = $error->getMessage();
			return $empty;
		}
		$view          = Pairing::in_flight_runs( $payload );
		$view['error'] = null;
		return $view;
	}

	/**
	 * Queues one report for the paired site.
	 *
	 * @param string $service Service key.
	 * @return array{runId: string, service: string}
	 */
	public function enqueue_run( string $service ): array {
		if ( ! in_array( $service, Pairing::run_services(), true ) ) {
			throw new Arc_Api_Exception( __( 'That report is not available.', 'pendulum-arc' ), 400 );
		}
		$creds = $this->store->credentials();
		if ( null === $creds ) {
			throw new Arc_Api_Exception( __( 'Connect this site to Arc first.', 'pendulum-arc' ), 401 );
		}
		try {
			$payload = $this->bearer_call(
				$creds,
				function ( string $token ) use ( $creds, $service ) {
					return $this->client->enqueue_run(
						(string) $creds['env'],
						$token,
						(string) $creds['siteId'],
						$service,
						wp_generate_uuid4()
					);
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			if ( 403 === $error->status_code() ) {
				throw new Arc_Api_Exception(
					__( 'Reconnect this site in Arc to allow generating reports.', 'pendulum-arc' ),
					403
				);
			}
			throw $error;
		}
		return Pairing::enqueued_run( $payload );
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
		$fresh = $this->refreshed_credentials( $creds );
		return $this->client->project( (string) $fresh['env'], (string) $fresh['accessToken'], $project_id );
	}

	/**
	 * Calls scores, refreshing an OAuth token once after a 401.
	 *
	 * @param array<string, mixed> $creds Opened credential.
	 * @return array<string, mixed>
	 */
	private function authorized( array $creds ): array {
		return $this->bearer_call(
			$creds,
			function ( string $token ) use ( $creds ) {
				return $this->client->scores( (string) $creds['env'], $token, (string) $creds['siteId'] );
			}
		);
	}

	/**
	 * Calls Arc, refreshing an OAuth token once after a 401.
	 *
	 * @param array<string, mixed>    $creds Opened credential.
	 * @param callable(string): array $call  Request using the bearer.
	 * @return array<string, mixed>
	 */
	private function bearer_call( array $creds, callable $call ): array {
		try {
			return $call( (string) $creds['accessToken'] );
		} catch ( Arc_Api_Exception $error ) {
			if ( 401 !== $error->status_code() || 'oauth' !== $creds['method'] || '' === (string) $creds['refreshToken'] ) {
				throw $error;
			}
		}
		$fresh = $this->refreshed_credentials( $creds );
		return $call( (string) $fresh['accessToken'] );
	}

	/**
	 * Rotates the OAuth refresh token once. A second caller waits for that
	 * rotation. Presenting the same refresh token twice revokes the grant.
	 *
	 * @param array<string, mixed> $creds Opened credential.
	 * @return array<string, mixed>
	 */
	private function refreshed_credentials( array $creds ): array {
		$claimed = $this->claim_refresh_lock();
		if ( ! $claimed ) {
			$waited = $this->wait_for_new_access_token( $creds );
			if ( null !== $waited ) {
				return array_merge( $creds, $waited );
			}
			$claimed = $this->claim_refresh_lock();
		}
		if ( ! $claimed ) {
			throw new Arc_Api_Exception( __( 'Arc did not accept those credentials.', 'pendulum-arc' ), 401 );
		}
		try {
			$current = $this->store->credentials();
			if ( is_array( $current ) && $this->access_token_changed( $creds, $current ) ) {
				return array_merge( $creds, $current );
			}
			$refresh = is_array( $current ) && '' !== (string) $current['refreshToken']
				? (string) $current['refreshToken']
				: (string) $creds['refreshToken'];
			$parsed  = Pairing::token( $this->client->refresh( (string) $creds['env'], $refresh ) );
			if ( '' === $parsed['accessToken'] ) {
				throw new Arc_Api_Exception( __( 'Arc did not accept those credentials.', 'pendulum-arc' ), 401 );
			}
			$this->store->update_tokens(
				$parsed['accessToken'],
				$parsed['refreshToken'],
				$this->expires_at( $parsed['expiresIn'] )
			);
			$creds['accessToken'] = $parsed['accessToken'];
			if ( '' !== $parsed['refreshToken'] ) {
				$creds['refreshToken'] = $parsed['refreshToken'];
			}
			return $creds;
		} finally {
			delete_option( 'arc_wordpress_oauth_refresh' );
		}
	}

	/**
	 * @param array<string, mixed> $creds   Credential that received the 401.
	 * @param array<string, mixed> $current Credential read after another refresh.
	 */
	private function access_token_changed( array $creds, array $current ): bool {
		return '' !== (string) $current['accessToken']
			&& (string) $current['accessToken'] !== (string) $creds['accessToken'];
	}

	private function claim_refresh_lock(): bool {
		$key = 'arc_wordpress_oauth_refresh';
		if ( add_option( $key, (string) time(), '', false ) ) {
			return true;
		}
		$held = get_option( $key );
		if ( is_string( $held ) && ( time() - (int) $held ) > 15 ) {
			delete_option( $key );
			return add_option( $key, (string) time(), '', false );
		}
		return false;
	}

	/**
	 * @param array<string, mixed> $creds Credential that received the 401.
	 * @return array<string, mixed>|null
	 */
	private function wait_for_new_access_token( array $creds ): ?array {
		for ( $attempt = 0; $attempt < 15; $attempt++ ) {
			usleep( 200000 );
			$current = $this->store->credentials();
			if ( is_array( $current ) && $this->access_token_changed( $creds, $current ) ) {
				return $current;
			}
			if ( ! get_option( 'arc_wordpress_oauth_refresh' ) ) {
				return null;
			}
		}
		return null;
	}

	/**
	 * Adds the WordPress edit and view URLs for each landing path.
	 *
	 * @param array<int, mixed> $pages Landing rows.
	 * @return array<int, array<string, mixed>>
	 */
	/**
	 * Adds an edit link when a table cell URL is a page on this site.
	 *
	 * @param array<int, array<string, mixed>> $blocks Report blocks.
	 * @return array<int, array<string, mixed>>
	 */
	private function link_report_blocks( array $blocks ): array {
		$home      = wp_parse_url( home_url( '/' ) );
		$home_host = is_array( $home ) ? strtolower( (string) ( $home['host'] ?? '' ) ) : '';
		foreach ( $blocks as &$block ) {
			if ( ! is_array( $block ) || 'table' !== ( $block['kind'] ?? '' ) || ! is_array( $block['rows'] ?? null ) ) {
				continue;
			}
			foreach ( $block['rows'] as &$row ) {
				if ( ! is_array( $row ) || ! is_array( $row['cells'] ?? null ) ) {
					continue;
				}
				foreach ( $row['cells'] as &$cell ) {
					if ( is_array( $cell ) ) {
						$cell = $this->link_report_cell( $cell, $home_host );
					}
				}
			}
		}
		return $blocks;
	}

	/**
	 * @param array<string, mixed> $cell      Table cell.
	 * @param string               $home_host This site's host.
	 * @return array<string, mixed>
	 */
	private function link_report_cell( array $cell, string $home_host ): array {
		$href = (string) ( $cell['href'] ?? '' );
		if ( '' === $href || '' === $home_host ) {
			return $cell;
		}
		$parts = wp_parse_url( $href );
		$host  = is_array( $parts ) ? strtolower( (string) ( $parts['host'] ?? '' ) ) : '';
		if ( $host !== $home_host ) {
			return $cell;
		}
		$path = Pairing::landing_path( $href );
		$view = home_url( $path );
		$id   = url_to_postid( $view );
		if ( 0 === $id && '/' === $path ) {
			$front = (int) get_option( 'page_on_front' );
			if ( $front > 0 ) {
				$id = $front;
			}
		}
		$edit = $id > 0 ? get_edit_post_link( $id, 'raw' ) : '';
		if ( is_string( $edit ) && '' !== $edit ) {
			$cell['editHref'] = $edit;
		}
		return $cell;
	}

	private function landing_pages( array $pages ): array {
		$out = array();
		foreach ( $pages as $page ) {
			if ( ! is_array( $page ) ) {
				continue;
			}
			$path = (string) ( $page['path'] ?? '/' );
			$view = home_url( $path );
			$id   = url_to_postid( $view );
			if ( 0 === $id && '/' === $path ) {
				$front = (int) get_option( 'page_on_front' );
				if ( $front > 0 ) {
					$id = $front;
				}
			}
			$edit            = $id > 0 ? get_edit_post_link( $id, 'raw' ) : '';
			$page['viewUrl'] = $view;
			$page['editUrl'] = is_string( $edit ) && '' !== $edit ? $edit : null;
			$out[]           = $page;
		}
		return $out;
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
