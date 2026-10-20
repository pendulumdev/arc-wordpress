<?php
/**
 * Admin REST routes for connect, disconnect, and scores.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Routes under pendulum-arc/v1.
 */
final class Rest_Controller {

	/**
	 * @var Connect_Service
	 */
	private Connect_Service $connect;

	/**
	 * @var Keyphrase_Sync
	 */
	private Keyphrase_Sync $keyphrases;

	/**
	 * @param Connect_Service $connect    Connect flow.
	 * @param Keyphrase_Sync  $keyphrases Keyphrase list and Arc sync.
	 */
	public function __construct( Connect_Service $connect, Keyphrase_Sync $keyphrases ) {
		$this->connect    = $connect;
		$this->keyphrases = $keyphrases;
	}

	/**
	 * Registers the routes.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	/**
	 * Route table.
	 */
	public function routes(): void {
		register_rest_route(
			'pendulum-arc/v1',
			'/connect/api-key',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'api_key' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					'apiKey' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/connect/reconnect',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'reconnect' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/connect/oauth/start',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'oauth_start' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/connect/pair',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'pair' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					'siteId' => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/connect/site',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_site' ),
				'permission_callback' => array( $this, 'can_manage' ),
				'args'                => array(
					'name'      => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'baseUrl'   => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'esc_url_raw',
					),
					'projectId' => array(
						'type'              => 'string',
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/connection',
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'disconnect' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/scores',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'scores' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/analytics',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'analytics' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/reports/(?P<service>seo|a11y|ai|security|brand)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'report' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/runs',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'runs' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'enqueue_run' ),
					'permission_callback' => array( $this, 'can_manage' ),
					'args'                => array(
						'service' => array(
							'type'     => 'string',
							'required' => true,
							'enum'     => array( 'analytics', 'seo', 'a11y', 'ai', 'security', 'brand' ),
						),
					),
				),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/keyphrases',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'keyphrase_status' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'keyphrase_enabled' ),
					'permission_callback' => array( $this, 'can_manage' ),
					'args'                => array(
						'enabled' => array(
							'type'     => 'boolean',
							'required' => true,
						),
					),
				),
			)
		);

		register_rest_route(
			'pendulum-arc/v1',
			'/keyphrases/sync',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'keyphrase_sync' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
	}

	/**
	 * Site admins only.
	 */
	public function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * API-key connect.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function api_key( \WP_REST_Request $request ) {
		return $this->respond(
			function () use ( $request ) {
				return $this->connect->begin_api_key(
					(string) $request->get_param( 'apiKey' ),
					get_current_user_id()
				);
			}
		);
	}

	/**
	 * Authorize URL for the browser flow.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function oauth_start() {
		return $this->respond(
			function () {
				return $this->connect->oauth_start( get_current_user_id() );
			}
		);
	}

	/**
	 * Attaches this address again with the saved API key or Arc account.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function reconnect() {
		return $this->respond(
			function () {
				return $this->connect->reconnect( get_current_user_id() );
			}
		);
	}

	/**
	 * Pairs a matched site.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function pair( \WP_REST_Request $request ) {
		return $this->respond(
			function () use ( $request ) {
				return $this->connect->pair_match(
					get_current_user_id(),
					(string) $request->get_param( 'siteId' )
				);
			}
		);
	}

	/**
	 * Creates a site for an API-key attempt.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_site( \WP_REST_Request $request ) {
		try {
			$result = $this->connect->create_site(
				get_current_user_id(),
				(string) $request->get_param( 'name' ),
				(string) $request->get_param( 'baseUrl' ),
				(string) $request->get_param( 'projectId' )
			);
			return rest_ensure_response( $result );
		} catch ( Draft_Exception $error ) {
			return new \WP_Error(
				'arc_wordpress_invalid_site',
				__( 'Check the site details.', 'pendulum-arc' ),
				array(
					'status' => 400,
					'fields' => Field_Messages::map( $error->fields() ),
				)
			);
		} catch ( Arc_Api_Exception $error ) {
			return $this->api_error( $error );
		}
	}

	/**
	 * Clears the local connection.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function disconnect() {
		$this->connect->disconnect( get_current_user_id() );
		return rest_ensure_response( array( 'connected' => false ) );
	}

	/**
	 * Score summary for the paired site.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function scores() {
		return rest_ensure_response( $this->connect->scores() );
	}

	/**
	 * Visitor Analytics summary for the paired site.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function analytics() {
		return rest_ensure_response( $this->connect->analytics() );
	}

	/**
	 * Crawl report preview for the paired site.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function report( \WP_REST_Request $request ) {
		return rest_ensure_response( $this->connect->report( (string) $request->get_param( 'service' ) ) );
	}

	/**
	 * In-flight runs for the paired site.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function runs() {
		return rest_ensure_response( $this->connect->runs() );
	}

	/**
	 * Queues one report.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function enqueue_run( \WP_REST_Request $request ) {
		return $this->respond(
			function () use ( $request ) {
				return $this->connect->enqueue_run( (string) $request->get_param( 'service' ) );
			}
		);
	}

	/**
	 * Local keyphrase list status. This may read the Arc hash once the scan has finished.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function keyphrase_status() {
		return $this->respond(
			function () {
				return $this->keyphrases->status();
			}
		);
	}

	/**
	 * Turns Sync keyphrases on or off.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function keyphrase_enabled( \WP_REST_Request $request ) {
		return $this->respond(
			function () use ( $request ) {
				return $this->keyphrases->set_enabled( (bool) $request->get_param( 'enabled' ) );
			}
		);
	}

	/**
	 * Uploads the list, commits the SEO target, and queues the SEO report.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function keyphrase_sync() {
		return $this->respond(
			function () {
				return $this->keyphrases->push();
			}
		);
	}

	/**
	 * Runs a connect call and maps Arc errors.
	 *
	 * @param callable $callback Call.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private function respond( callable $callback ) {
		try {
			return rest_ensure_response( $callback() );
		} catch ( Arc_Api_Exception $error ) {
			return $this->api_error( $error );
		}
	}

	/**
	 * REST error from an Arc failure.
	 *
	 * @param Arc_Api_Exception $error Arc error.
	 */
	private function api_error( Arc_Api_Exception $error ): \WP_Error {
		$status = $error->status_code();
		if ( $status < 400 || $status > 599 ) {
			$status = 502;
		}
		return new \WP_Error(
			'arc_wordpress_api',
			$error->getMessage(),
			array( 'status' => $status )
		);
	}
}
