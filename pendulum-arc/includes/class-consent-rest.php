<?php
/**
 * Consent settings routes and the public log route.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin saves require manage_options. The log route is public and rate limited.
 */
final class Consent_Rest {

	/**
	 * @var Consent_Store
	 */
	private Consent_Store $store;

	/**
	 * @var Consent_Log
	 */
	private Consent_Log $log;

	public function __construct() {
		$this->store = new Consent_Store();
		$this->log   = new Consent_Log();
	}

	/**
	 * Hooks.
	 */
	public function register(): void {
		add_action( 'init', array( $this->log, 'install' ), 5 );
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	/**
	 * Route table.
	 */
	public function routes(): void {
		register_rest_route(
			'pendulum-arc/v1',
			'/consent',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
		register_rest_route(
			'pendulum-arc/v1',
			'/consent/renew',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'renew' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
		register_rest_route(
			'pendulum-arc/v1',
			'/consent/reset',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'reset' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
		register_rest_route(
			'pendulum-arc/v1',
			'/consent/styles/reset',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'reset_styles' ),
				'permission_callback' => array( $this, 'can_manage' ),
			)
		);
		register_rest_route(
			'pendulum-arc/v1',
			'/consent/log',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'log_visit' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * Administrators only.
	 */
	public function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function save( \WP_REST_Request $request ) {
		return rest_ensure_response(
			array(
				'settings' => $this->store->save( $this->payload( $request ) ),
			)
		);
	}

	/**
	 * @return \WP_REST_Response
	 */
	public function renew() {
		return rest_ensure_response(
			array(
				'settings' => $this->store->renew(),
			)
		);
	}

	/**
	 * @return \WP_REST_Response
	 */
	public function reset() {
		return rest_ensure_response(
			array(
				'settings' => $this->store->reset(),
			)
		);
	}

	/**
	 * @return \WP_REST_Response
	 */
	public function reset_styles() {
		return rest_ensure_response(
			array(
				'settings' => $this->store->reset_styles(),
			)
		);
	}

	/**
	 * Records one visitor choice. A cached page cannot carry a fresh nonce,
	 * so the route checks the payload and the hourly limit instead.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function log_visit( \WP_REST_Request $request ) {
		$settings = $this->store->settings();
		if ( empty( $settings['logging_enabled'] ) ) {
			return new \WP_REST_Response( null, 204 );
		}
		$ip = self::remote_addr();
		if ( $this->log->limited( $ip ) ) {
			return new \WP_REST_Response( null, 429 );
		}
		$body    = $request->get_json_params();
		$action  = is_array( $body ) && isset( $body['action'] ) ? (string) $body['action'] : '';
		$allowed = is_array( $body ) && isset( $body['allowed'] ) && is_array( $body['allowed'] ) ? $body['allowed'] : array();
		$payload = Consent_Log_Payload::build(
			true,
			! empty( $settings['disable_identifiable'] ),
			$action,
			$allowed,
			$settings['cookies'],
			$ip,
			self::user_agent()
		);
		if ( null === $payload ) {
			return new \WP_Error(
				'arc_cookie_consent_log',
				__( 'Consent could not be logged.', 'pendulum-arc' ),
				array( 'status' => 400 )
			);
		}
		$this->log->insert( $payload, (int) $settings['consent_version'] );
		return new \WP_REST_Response( null, 204 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return array<string, mixed>
	 */
	private function payload( \WP_REST_Request $request ): array {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return array();
		}
		if ( isset( $body['settings'] ) && is_array( $body['settings'] ) ) {
			return $body['settings'];
		}
		return $body;
	}

	/**
	 * Direct remote address. Forwarded headers are not trusted.
	 */
	private static function remote_addr(): string {
		if ( ! isset( $_SERVER['REMOTE_ADDR'] ) ) {
			return '';
		}
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- validated as an IP below.
		$ip = sanitize_text_field( wp_unslash( (string) $_SERVER['REMOTE_ADDR'] ) );
		return false === filter_var( $ip, FILTER_VALIDATE_IP ) ? '' : $ip;
	}

	/**
	 * Browser user agent, trimmed.
	 */
	private static function user_agent(): string {
		if ( ! isset( $_SERVER['HTTP_USER_AGENT'] ) ) {
			return '';
		}
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- plain text, clipped by the payload.
		return sanitize_text_field( wp_unslash( (string) $_SERVER['HTTP_USER_AGENT'] ) );
	}
}
