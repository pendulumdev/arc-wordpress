<?php
/**
 * HTTP calls to the Arc API and the portal token endpoint.
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
 * Bearer calls and the OAuth token exchange.
 */
final class Arc_Client {

	/**
	 * Proves a bearer and returns GET /v1/me.
	 *
	 * @param string $env   production or preview.
	 * @param string $token API key or access token.
	 * @return array<string, mixed>
	 */
	public function me( string $env, string $token ): array {
		return $this->json( 'GET', Arc_Config::api( $env ) . '/v1/me', $token );
	}

	/**
	 * Every project page on the allow-list.
	 *
	 * @param string $env   production or preview.
	 * @param string $token Bearer.
	 * @return array<int, array{id: string, name: string, slug: string}>
	 */
	public function projects( string $env, string $token ): array {
		$projects = array();
		foreach ( $this->pages( Arc_Config::api( $env ) . '/v1/projects', $token ) as $page ) {
			$projects = array_merge( $projects, Pairing::projects( $page ) );
		}
		return $projects;
	}

	/**
	 * One project, including its slug.
	 *
	 * @param string $env        production or preview.
	 * @param string $token      Bearer.
	 * @param string $project_id Project id.
	 * @return array{id: string, name: string, slug: string}
	 */
	public function project( string $env, string $token, string $project_id ): array {
		$this->assert_id( $project_id );
		$url = Arc_Config::api( $env ) . '/v1/projects/' . rawurlencode( $project_id );
		return Pairing::project( $this->json( 'GET', $url, $token ) );
	}

	/**
	 * Sites for one project.
	 *
	 * @param string $env        production or preview.
	 * @param string $token      Bearer.
	 * @param string $project_id Project id.
	 * @return array<int, array{id: string, projectId: string, name: string, baseUrl: string}>
	 */
	public function sites( string $env, string $token, string $project_id ): array {
		$this->assert_id( $project_id );
		$url   = Arc_Config::api( $env ) . '/v1/projects/' . rawurlencode( $project_id ) . '/sites';
		$sites = array();
		foreach ( $this->pages( $url, $token ) as $page ) {
			$sites = array_merge( $sites, Pairing::sites( $page, $project_id ) );
		}
		return $sites;
	}

	/**
	 * Creates a site. The same normalized URL returns the existing row.
	 *
	 * @param string               $env        production or preview.
	 * @param string               $token      Bearer.
	 * @param string               $project_id Project id.
	 * @param array<string, mixed> $body            name, baseUrl, auto_run, auto_schedule, auto_sitemap.
	 * @param string               $idempotency_key Replay key.
	 * @return array<string, mixed>
	 */
	public function create_site( string $env, string $token, string $project_id, array $body, string $idempotency_key ): array {
		$this->assert_id( $project_id );
		$url = Arc_Config::api( $env ) . '/v1/projects/' . rawurlencode( $project_id ) . '/sites';
		return $this->json(
			'POST',
			$url,
			$token,
			$body,
			array( 'Idempotency-Key' => $idempotency_key )
		);
	}

	/**
	 * Latest scores for a paired site.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @return array<string, mixed>
	 */
	public function scores( string $env, string $token, string $site_id ): array {
		$this->assert_id( $site_id );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/scores';
		return $this->json( 'GET', $url, $token );
	}

	/**
	 * Visitor Analytics summary for the latest succeeded analytics run.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @return array<string, mixed>
	 */
	public function analytics( string $env, string $token, string $site_id ): array {
		$this->assert_id( $site_id );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/analytics';
		return $this->json( 'GET', $url, $token );
	}

	/**
	 * Crawl report shell. Header and Issues first; page / social / forms
	 * windows load via report_table after paint (`tables=defer`).
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @param string $service seo, a11y, ai, security, or brand.
	 * @return array<string, mixed>
	 */
	public function report( string $env, string $token, string $site_id, string $service ): array {
		$this->assert_id( $site_id );
		if ( ! in_array( $service, array( 'seo', 'a11y', 'ai', 'security', 'brand' ), true ) ) {
			throw new Arc_Api_Exception( __( 'That report is not available.', 'pendulum-arc' ), 400 );
		}
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/reports/' . rawurlencode( $service ) . '?tables=defer';
		return $this->json( 'GET', $url, $token );
	}

	/**
	 * One 50-row window of page analysis, social platforms, or forms.
	 *
	 * @param string $env      production or preview.
	 * @param string $token    Bearer.
	 * @param string $site_id  Site id.
	 * @param string $service  seo, a11y, or ai.
	 * @param string $table    pages, socials, or forms.
	 * @param int    $page     0-based window.
	 * @param string $query    Search, at most 200 characters.
	 * @param string $viewport Exact accessibility viewport.
	 * @return array<string, mixed>
	 */
	public function report_table( string $env, string $token, string $site_id, string $service, string $table, int $page, string $query, string $viewport ): array {
		$this->assert_id( $site_id );
		if ( ! in_array( $service, array( 'seo', 'a11y', 'ai' ), true ) ) {
			throw new Arc_Api_Exception( __( 'That report is not available.', 'pendulum-arc' ), 400 );
		}
		if ( ! in_array( $table, array( 'pages', 'socials', 'forms' ), true ) ) {
			throw new Arc_Api_Exception( __( 'That report is not available.', 'pendulum-arc' ), 400 );
		}
		$url   = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/reports/' . rawurlencode( $service ) . '/tables/' . rawurlencode( $table );
		$args  = array(
			'page' => max( 0, $page ),
		);
		$query = trim( $query );
		if ( strlen( $query ) > 200 ) {
			$query = substr( $query, 0, 200 );
		}
		if ( '' !== $query ) {
			$args['q'] = $query;
		}
		$viewport = trim( $viewport );
		if ( strlen( $viewport ) > 40 ) {
			$viewport = substr( $viewport, 0, 40 );
		}
		if ( '' !== $viewport ) {
			$args['viewport'] = $viewport;
		}
		return $this->json( 'GET', $url . '?' . http_build_query( $args, '', '&', PHP_QUERY_RFC3986 ), $token );
	}

	/**
	 * One stored screenshot. Bytes stay out of the JSON report.
	 *
	 * @param string $env    production or preview.
	 * @param string $token  Bearer.
	 * @param string $run_id Run id.
	 * @param string $file   Screenshot file name.
	 * @return array{bytes: string, type: string}
	 */
	public function report_media( string $env, string $token, string $run_id, string $file ): array {
		$this->assert_id( $run_id );
		$this->assert_file( $file );
		$url = Arc_Config::api( $env ) . '/v1/runs/' . rawurlencode( $run_id ) . '/media/' . rawurlencode( $file );
		return $this->binary( 'GET', $url, $token );
	}

	/**
	 * Many stored screenshots. One rate-limit token for the list.
	 *
	 * @param string             $env     production or preview.
	 * @param string             $token   Bearer.
	 * @param string             $run_id  Run id.
	 * @param array<int, string> $files   Screenshot file names.
	 * @return array<string, mixed>
	 */
	public function report_media_batch( string $env, string $token, string $run_id, array $files ): array {
		$this->assert_id( $run_id );
		$url = Arc_Config::api( $env ) . '/v1/runs/' . rawurlencode( $run_id ) . '/media';
		return $this->json(
			'POST',
			$url,
			$token,
			array(
				'files' => array_values( $files ),
			)
		);
	}

	/**
	 * Newest runs for the site, used to label queued and running services.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @return array<string, mixed>
	 */
	public function runs( string $env, string $token, string $site_id ): array {
		$this->assert_id( $site_id );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/runs';
		return $this->json( 'GET', $url, $token );
	}

	/**
	 * Queues several reports in one call. SEO, accessibility, AI, and security
	 * share a crawl. Analytics and brand stay separate jobs. The idempotency
	 * key is required.
	 *
	 * @param string             $env      production or preview.
	 * @param string             $token    Bearer.
	 * @param string             $site_id  Site id.
	 * @param array<int, string> $services Service keys.
	 * @param string             $key      Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function enqueue_runs( string $env, string $token, string $site_id, array $services, string $key ): array {
		$this->assert_id( $site_id );
		$clean = array();
		foreach ( $services as $service ) {
			if ( ! in_array( $service, Pairing::run_services(), true ) || in_array( $service, $clean, true ) ) {
				continue;
			}
			$clean[] = $service;
		}
		if ( count( $clean ) < 2 ) {
			throw new Arc_Api_Exception( __( 'That report is not available.', 'pendulum-arc' ), 400 );
		}
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{8,200}$/', $key ) ) {
			throw new Arc_Api_Exception( __( 'Arc refused the request. Try again in a moment.', 'pendulum-arc' ), 400 );
		}
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/runs';
		return $this->json(
			'POST',
			$url,
			$token,
			array( 'services' => array_values( $clean ) ),
			array( 'Idempotency-Key' => $key )
		);
	}

	/**
	 * Queues one service. The idempotency key is required by the public API.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @param string $service Service key.
	 * @param string $key     Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function enqueue_run( string $env, string $token, string $site_id, string $service, string $key ): array {
		$this->assert_id( $site_id );
		if ( ! in_array( $service, Pairing::run_services(), true ) ) {
			throw new Arc_Api_Exception( __( 'That report is not available.', 'pendulum-arc' ), 400 );
		}
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{8,200}$/', $key ) ) {
			throw new Arc_Api_Exception( __( 'Arc refused the request. Try again in a moment.', 'pendulum-arc' ), 400 );
		}
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/runs';
		return $this->json(
			'POST',
			$url,
			$token,
			array( 'service' => $service ),
			array( 'Idempotency-Key' => $key )
		);
	}

	/**
	 * Starts a Google connect handoff. The response is a portal URL.
	 *
	 * @param string $env        production or preview.
	 * @param string $token      Bearer.
	 * @param string $site_id    Site id.
	 * @param string $return_uri WordPress admin URL Arc may send the browser back to.
	 * @param string $state      Round-trip state.
	 * @return array<string, mixed>
	 */
	public function google_connect_handoff( string $env, string $token, string $site_id, string $return_uri, string $state ): array {
		$this->assert_id( $site_id );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/google-connect-handoffs';
		return $this->json(
			'POST',
			$url,
			$token,
			array(
				'return_uri' => $return_uri,
				'state'      => $state,
			)
		);
	}

	/**
	 * Project membership and whether each email has an Arc account.
	 *
	 * @param string             $env        production or preview.
	 * @param string             $token      Bearer.
	 * @param string             $project_id Project id.
	 * @param array<int, string> $emails     Normalized emails.
	 * @return array<string, mixed>
	 */
	public function invite_status( string $env, string $token, string $project_id, array $emails ): array {
		$this->assert_id( $project_id );
		$url = Arc_Config::api( $env ) . '/v1/projects/' . rawurlencode( $project_id ) . '/invite-status';
		return $this->json( 'POST', $url, $token, array( 'emails' => array_values( $emails ) ) );
	}

	/**
	 * Invites one project member. continue is the portal path after accept.
	 *
	 * An empty continue is omitted. Connect Google passes a ticket path.
	 * The Connect invite list does not.
	 *
	 * @param string $env           production or preview.
	 * @param string $token         Bearer.
	 * @param string $project_id    Project id.
	 * @param string $email         Invitee.
	 * @param string $continue_path Allowlisted portal path, or empty.
	 * @param string $key           Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function create_invite( string $env, string $token, string $project_id, string $email, string $continue_path, string $key ): array {
		$this->assert_id( $project_id );
		$this->assert_key( $key );
		$url  = Arc_Config::api( $env ) . '/v1/projects/' . rawurlencode( $project_id ) . '/invites';
		$body = array( 'email' => $email );
		if ( '' !== $continue_path ) {
			$body['continue'] = $continue_path;
		}
		return $this->json(
			'POST',
			$url,
			$token,
			$body,
			array( 'Idempotency-Key' => $key )
		);
	}

	/**
	 * Invites many project members in one call. No continue path.
	 *
	 * @param string             $env        production or preview.
	 * @param string             $token      Bearer.
	 * @param string             $project_id Project id.
	 * @param array<int, string> $emails     Normalized emails.
	 * @param string             $key        Idempotency-Key for the whole list.
	 * @return array<string, mixed>
	 */
	public function create_invites( string $env, string $token, string $project_id, array $emails, string $key ): array {
		$this->assert_id( $project_id );
		$this->assert_key( $key );
		$url = Arc_Config::api( $env ) . '/v1/projects/' . rawurlencode( $project_id ) . '/invites';
		return $this->json(
			'POST',
			$url,
			$token,
			array( 'emails' => array_values( $emails ) ),
			array( 'Idempotency-Key' => $key )
		);
	}

	/**
	 * Current SEO target hash for the paired site.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @return array<string, mixed>
	 */
	public function seo_targets( string $env, string $token, string $site_id ): array {
		$this->assert_id( $site_id );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/seo-targets';
		return $this->json( 'GET', $url, $token );
	}

	/**
	 * Opens one SEO target sync. A new start replaces any open session.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @param string $key     Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function start_seo_target_sync( string $env, string $token, string $site_id, string $key ): array {
		$this->assert_id( $site_id );
		$this->assert_key( $key );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/seo-target-syncs';
		return $this->json( 'POST', $url, $token, array(), array( 'Idempotency-Key' => $key ) );
	}

	/**
	 * Appends one batch of upserts and deletes.
	 *
	 * @param string                                              $env     production or preview.
	 * @param string                                              $token   Bearer.
	 * @param string                                              $site_id Site id.
	 * @param string                                              $sync_id Sync id.
	 * @param array{upserts: array<int, array<string, string>>, deletes: array<int, string>} $batch Batch.
	 * @param string                                              $key     Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function append_seo_target_batch( string $env, string $token, string $site_id, string $sync_id, array $batch, string $key ): array {
		$this->assert_id( $site_id );
		$this->assert_id( $sync_id );
		$this->assert_key( $key );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/seo-target-syncs/' . rawurlencode( $sync_id ) . '/batches';
		return $this->json( 'POST', $url, $token, $batch, array( 'Idempotency-Key' => $key ) );
	}

	/**
	 * Commits the open sync and optionally queues the SEO report.
	 *
	 * @param string               $env     production or preview.
	 * @param string               $token   Bearer.
	 * @param string               $site_id Site id.
	 * @param string               $sync_id Sync id.
	 * @param array<string, mixed> $body    Commit body.
	 * @param string               $key     Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function commit_seo_target_sync( string $env, string $token, string $site_id, string $sync_id, array $body, string $key ): array {
		$this->assert_id( $site_id );
		$this->assert_id( $sync_id );
		$this->assert_key( $key );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/seo-target-syncs/' . rawurlencode( $sync_id ) . '/commit';
		return $this->json( 'POST', $url, $token, $body, array( 'Idempotency-Key' => $key ) );
	}

	/**
	 * Drops an open sync. The SEO contract is unchanged.
	 *
	 * @param string $env     production or preview.
	 * @param string $token   Bearer.
	 * @param string $site_id Site id.
	 * @param string $sync_id Sync id.
	 * @param string $key     Idempotency-Key.
	 * @return array<string, mixed>
	 */
	public function abandon_seo_target_sync( string $env, string $token, string $site_id, string $sync_id, string $key ): array {
		$this->assert_id( $site_id );
		$this->assert_id( $sync_id );
		$this->assert_key( $key );
		$url = Arc_Config::api( $env ) . '/v1/sites/' . rawurlencode( $site_id ) . '/seo-target-syncs/' . rawurlencode( $sync_id );
		return $this->json( 'DELETE', $url, $token, null, array( 'Idempotency-Key' => $key ) );
	}

	/**
	 * Exchanges an authorization code.
	 *
	 * @param string $env          production or preview.
	 * @param string $code         Authorization code.
	 * @param string $verifier     PKCE verifier.
	 * @param string $redirect_uri Redirect used at authorize time.
	 * @return array<string, mixed>
	 */
	public function exchange_code( string $env, string $code, string $verifier, string $redirect_uri ): array {
		$body = array(
			'grant_type'    => 'authorization_code',
			'code'          => $code,
			'redirect_uri'  => $redirect_uri,
			'client_id'     => Arc_Config::client_id(),
			'code_verifier' => $verifier,
			'resource'      => Arc_Config::resource( $env ),
		);
		return $this->form( Arc_Config::portal( $env ) . '/oauth/token', $body );
	}

	/**
	 * Rotates a refresh token.
	 *
	 * @param string $env     production or preview.
	 * @param string $refresh Refresh token.
	 * @return array<string, mixed>
	 */
	public function refresh( string $env, string $refresh ): array {
		$body = array(
			'grant_type'    => 'refresh_token',
			'refresh_token' => $refresh,
			'client_id'     => Arc_Config::client_id(),
			'resource'      => Arc_Config::resource( $env ),
		);
		return $this->form( Arc_Config::portal( $env ) . '/oauth/token', $body );
	}

	/**
	 * Follows cursor pages, capped so a connect cannot loop.
	 *
	 * @param string $url   First page URL.
	 * @param string $token Bearer.
	 * @return array<int, array<string, mixed>>
	 */
	private function pages( string $url, string $token ): array {
		$pages  = array();
		$cursor = '';
		for ( $i = 0; $i < 20; $i++ ) {
			$next = $url;
			if ( '' !== $cursor ) {
				$next .= ( str_contains( $url, '?' ) ? '&' : '?' ) . 'cursor=' . rawurlencode( $cursor );
			}
			$page    = $this->json( 'GET', $next, $token );
			$pages[] = $page;
			$cursor  = Pairing::next_cursor( $page );
			if ( '' === $cursor ) {
				break;
			}
		}
		return $pages;
	}

	/**
	 * JSON request with a bearer.
	 *
	 * @param string                    $method Extra headers method.
	 * @param string                    $url    Absolute URL.
	 * @param string                    $token  Bearer.
	 * @param array<string, mixed>|null $body   JSON body.
	 * @param array<string, string>     $extra  Extra headers.
	 * @return array<string, mixed>
	 */
	private function json( string $method, string $url, string $token, ?array $body = null, array $extra = array() ): array {
		$headers = array_merge(
			array(
				'Accept'        => 'application/json',
				'Authorization' => 'Bearer ' . $token,
				'User-Agent'    => $this->user_agent(),
			),
			$extra
		);
		$payload = null;
		if ( null !== $body ) {
			$headers['Content-Type'] = 'application/json';
			$payload                 = wp_json_encode( $body );
		}
		return $this->request( $method, $url, $headers, $payload );
	}

	/**
	 * Form token request. The bearer is not used.
	 *
	 * @param string               $url  Token URL.
	 * @param array<string, string> $body Form fields.
	 * @return array<string, mixed>
	 */
	private function form( string $url, array $body ): array {
		$headers = array(
			'Accept'       => 'application/json',
			'Content-Type' => 'application/x-www-form-urlencoded',
			'User-Agent'   => $this->user_agent(),
		);
		$payload = http_build_query( $body, '', '&', PHP_QUERY_RFC3986 );
		return $this->request( 'POST', $url, $headers, $payload );
	}

	/**
	 * Image bytes. Refuses anything that is not a small bitmap.
	 *
	 * @param string $method HTTP method.
	 * @param string $url    Absolute URL.
	 * @param string $token  Bearer.
	 * @return array{bytes: string, type: string}
	 */
	private function binary( string $method, string $url, string $token ): array {
		$args = array(
			'method'      => $method,
			'timeout'     => 20,
			'redirection' => 0,
			'headers'     => array(
				'Accept'        => 'image/webp,image/png,image/jpeg,image/gif',
				'Authorization' => 'Bearer ' . $token,
				'User-Agent'    => $this->user_agent(),
			),
		);
		/**
		 * Last chance to adjust an Arc request. Do not log the bearer.
		 *
		 * @param array<string, mixed> $args Request args.
		 * @param string               $url  URL.
		 */
		$args     = apply_filters( 'arc_wordpress_http_args', $args, $url );
		$response = wp_remote_request( $url, $args );
		if ( is_wp_error( $response ) ) {
			throw new Arc_Api_Exception(
				__( 'Arc could not be reached. Try again in a moment.', 'pendulum-arc' ),
				0
			);
		}
		$status = (int) wp_remote_retrieve_response_code( $response );
		$raw    = (string) wp_remote_retrieve_body( $response );
		$type   = (string) wp_remote_retrieve_header( $response, 'content-type' );
		$type   = strtolower( trim( explode( ';', $type )[0] ) );
		$images = array( 'image/webp', 'image/png', 'image/jpeg', 'image/gif' );
		if ( $status < 200 || $status >= 300 || ! in_array( $type, $images, true ) || strlen( $raw ) > 2000000 ) {
			throw new Arc_Api_Exception( __( 'That screenshot is not available.', 'pendulum-arc' ), $status );
		}
		return array(
			'bytes' => $raw,
			'type'  => $type,
		);
	}

	/**
	 * Performs the request and decodes a JSON object.
	 *
	 * @param string                $method  HTTP method.
	 * @param string                $url     Absolute URL.
	 * @param array<string, string> $headers Headers.
	 * @param string|null           $body    Raw body.
	 * @return array<string, mixed>
	 */
	private function request( string $method, string $url, array $headers, ?string $body ): array {
		$args = array(
			'method'      => $method,
			'timeout'     => 20,
			'redirection' => 0,
			'headers'     => $headers,
		);
		if ( null !== $body ) {
			$args['body'] = $body;
		}
		/**
		 * Last chance to adjust an Arc request. Do not log the bearer.
		 *
		 * @param array<string, mixed> $args Request args.
		 * @param string               $url  URL.
		 */
		$args     = apply_filters( 'arc_wordpress_http_args', $args, $url );
		$response = wp_remote_request( $url, $args );
		if ( is_wp_error( $response ) ) {
			throw new Arc_Api_Exception(
				__( 'Arc could not be reached. Try again in a moment.', 'pendulum-arc' ),
				0
			);
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$raw    = (string) wp_remote_retrieve_body( $response );
		$json   = json_decode( $raw, true );
		if ( $status < 200 || $status >= 300 ) {
			throw new Arc_Api_Exception( self::safe_message( $json, $status ), $status, self::error_code( $json ) );
		}
		return is_array( $json ) ? $json : array();
	}

	/**
	 * Admin-facing sentence that does not echo a credential.
	 *
	 * @param mixed $json   Decoded body.
	 * @param int   $status HTTP status.
	 */
	private static function safe_message( $json, int $status ): string {
		if ( 401 === $status ) {
			return __( 'Arc did not accept those credentials.', 'pendulum-arc' );
		}
		$detail = self::public_sentence( $json );
		if ( null !== $detail ) {
			return $detail;
		}
		if ( 403 === $status ) {
			return __( 'This Arc account cannot do that.', 'pendulum-arc' );
		}
		return __( 'Arc refused the request. Try again in a moment.', 'pendulum-arc' );
	}

	/**
	 * Arc error code when it is a short token of capitals and underscores.
	 *
	 * @param mixed $json Decoded body.
	 */
	private static function error_code( $json ): string {
		if ( ! is_array( $json ) || ! isset( $json['error'] ) || ! is_array( $json['error'] ) ) {
			return '';
		}
		$code = $json['error']['code'] ?? '';
		if ( ! is_string( $code ) || 1 !== preg_match( '/^[A-Z0-9_]{1,64}$/', $code ) ) {
			return '';
		}
		return $code;
	}

	/**
	 * A short Arc sentence that does not mention a credential.
	 *
	 * @param mixed $json Decoded body.
	 */
	private static function public_sentence( $json ): ?string {
		if ( ! is_array( $json ) || ! isset( $json['error'] ) || ! is_array( $json['error'] ) ) {
			return null;
		}
		$message = $json['error']['message'] ?? '';
		if ( ! is_string( $message ) ) {
			return null;
		}
		$message = trim( wp_strip_all_tags( $message ) );
		if ( '' === $message || strlen( $message ) > 180 || preg_match( '/bearer|token|api[_ ]?key/i', $message ) ) {
			return null;
		}
		return $message;
	}

	/**
	 * Rejects an id that must not be placed in a path.
	 *
	 * @param string $id Arc id.
	 */
	private function assert_id( string $id ): void {
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{1,128}$/', $id ) ) {
			throw new Arc_Api_Exception(
				__( 'That Arc id is not valid.', 'pendulum-arc' ),
				400
			);
		}
	}

	/**
	 * Rejects a screenshot name that is not one path segment.
	 *
	 * @param string $file File name.
	 */
	private function assert_file( string $file ): void {
		if ( str_contains( $file, '..' ) || 1 !== preg_match( '/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/', $file ) ) {
			throw new Arc_Api_Exception( __( 'That screenshot is not available.', 'pendulum-arc' ), 404 );
		}
	}

	/**
	 * Rejects an idempotency key the public API would refuse.
	 *
	 * @param string $key Idempotency-Key.
	 */
	private function assert_key( string $key ): void {
		if ( 1 !== preg_match( '/^[A-Za-z0-9_-]{8,200}$/', $key ) ) {
			throw new Arc_Api_Exception( __( 'Arc refused the request. Try again in a moment.', 'pendulum-arc' ), 400 );
		}
	}

	/**
	 * Identifies this plugin on Arc requests.
	 */
	private function user_agent(): string {
		return 'PendulumArc/' . ARC_WORDPRESS_VERSION . '; ' . home_url();
	}
}
