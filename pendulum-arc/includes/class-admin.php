<?php
/**
 * Arc menu, asset loading, and the OAuth return.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WordPress admin screens.
 */
final class Admin {

	/**
	 * @var Connection_Store
	 */
	private Connection_Store $store;

	/**
	 * @var Connect_Service
	 */
	private Connect_Service $connect;

	/**
	 * @param Connection_Store $store   Credential store.
	 * @param Connect_Service  $connect Connect flow.
	 */
	public function __construct( Connection_Store $store, Connect_Service $connect ) {
		$this->store   = $store;
		$this->connect = $connect;
	}

	/**
	 * Hooks.
	 */
	public function register(): void {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'wp_dashboard_setup', array( $this, 'dashboard_widget' ) );
		add_action( 'admin_init', array( $this, 'finish_oauth' ), 1 );
		add_action( 'admin_init', array( $this, 'guard' ), 20 );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
	}

	/**
	 * Top-level Arc menu.
	 */
	public function menu(): void {
		add_menu_page(
			__( 'Arc • Dashboard', 'pendulum-arc' ),
			__( 'Arc', 'pendulum-arc' ),
			'manage_options',
			'pendulum-arc',
			array( $this, 'render_dashboard' ),
			'none',
			58
		);
		add_submenu_page(
			'pendulum-arc',
			__( 'Arc • Dashboard', 'pendulum-arc' ),
			__( 'Dashboard', 'pendulum-arc' ),
			'manage_options',
			'pendulum-arc',
			array( $this, 'render_dashboard' )
		);
		add_submenu_page(
			'pendulum-arc',
			__( 'Arc • Connect', 'pendulum-arc' ),
			__( 'Connect', 'pendulum-arc' ),
			'manage_options',
			'pendulum-arc-connect',
			array( $this, 'render_connect' )
		);
	}

	/**
	 * Dashboard screen.
	 */
	public function render_dashboard(): void {
		$this->render( 'dashboard' );
	}

	/**
	 * Connect screen.
	 */
	public function render_connect(): void {
		$this->render( 'connect' );
	}

	/**
	 * Sends other plugin screens to Connect until a site is paired.
	 */
	public function guard(): void {
		if ( wp_doing_ajax() || wp_doing_cron() ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$page = self::current_page();
		if ( ! Admin_Access::requires_connection( $page ) || $this->store->is_connected() ) {
			return;
		}
		wp_safe_redirect( admin_url( 'admin.php?page=pendulum-arc-connect' ) );
		exit;
	}

	/**
	 * Completes the browser flow before the connect screen renders.
	 */
	public function finish_oauth(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( 'pendulum-arc-connect' !== self::current_page() ) {
			return;
		}

		// OAuth state is the CSRF check. A WordPress nonce is not part of the Arc redirect.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$code = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( $_GET['code'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$state = isset( $_GET['state'] ) ? sanitize_text_field( wp_unslash( $_GET['state'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$issuer = isset( $_GET['iss'] ) ? esc_url_raw( wp_unslash( $_GET['iss'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$error = isset( $_GET['error'] ) ? sanitize_key( wp_unslash( $_GET['error'] ) ) : '';

		if ( '' === $code && '' === $error ) {
			return;
		}

		$user_id = get_current_user_id();
		if ( '' !== $error || '' === $code || '' === $state ) {
			$message = 'access_denied' === $error
				? __( 'Arc sign-in was cancelled.', 'pendulum-arc' )
				: __( 'Arc did not complete sign-in. Try again.', 'pendulum-arc' );
			$this->store->put_notice( $user_id, 'error', $message );
			wp_safe_redirect( admin_url( 'admin.php?page=pendulum-arc-connect' ) );
			exit;
		}

		try {
			$this->connect->complete_oauth( $user_id, $code, $state, $issuer );
		} catch ( Arc_Api_Exception $failure ) {
			$this->store->put_notice( $user_id, 'error', $failure->getMessage() );
			wp_safe_redirect( admin_url( 'admin.php?page=pendulum-arc-connect' ) );
			exit;
		}

		wp_safe_redirect( admin_url( 'admin.php?page=pendulum-arc' ) );
		exit;
	}

	/**
	 * WordPress Dashboard box with the score cards.
	 */
	public function dashboard_widget(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		wp_add_dashboard_widget(
			'pendulum_arc_scores',
			__( 'Arc Website Scores', 'pendulum-arc' ),
			array( $this, 'render_dashboard_widget' )
		);
	}

	/**
	 * Dashboard box body. The script mounts the score cards here.
	 */
	public function render_dashboard_widget(): void {
		$url     = admin_url( 'admin.php?page=pendulum-arc' );
		$connect = admin_url( 'admin.php?page=pendulum-arc-connect' );
		echo '<div id="pendulum-arc-dashboard-widget" class="pendulum-arc-dashboard-widget"';
		echo ' data-dashboard-url="' . esc_url( $url ) . '"';
		echo ' data-connect-url="' . esc_url( $connect ) . '"';
		echo ' data-connected="' . ( $this->store->is_connected() ? '1' : '0' ) . '"';
		echo '></div>';
	}

	/**
	 * Loads the admin script on Arc screens and the Dashboard box.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function assets( string $hook ): void {
		if ( current_user_can( 'manage_options' ) ) {
			$this->enqueue_menu_icon();
		}
		$widget = 'index.php' === $hook && current_user_can( 'manage_options' );
		if ( ! $widget && ! self::is_screen( $hook ) ) {
			return;
		}
		$asset = ARC_WORDPRESS_DIR . 'build/index.asset.php';
		if ( ! is_readable( $asset ) ) {
			add_action( 'admin_notices', array( $this, 'missing_build_notice' ) );
			return;
		}

		$meta = require $asset;
		wp_enqueue_style( 'wp-components' );
		wp_enqueue_script(
			'pendulum-arc-admin',
			plugins_url( 'build/index.js', ARC_WORDPRESS_FILE ),
			$meta['dependencies'],
			$meta['version'],
			true
		);
		$style = ARC_WORDPRESS_DIR . 'build/style-index.css';
		if ( is_readable( $style ) ) {
			wp_enqueue_style(
				'pendulum-arc-admin',
				plugins_url( 'build/style-index.css', ARC_WORDPRESS_FILE ),
				array( 'wp-components' ),
				$meta['version']
			);
			wp_style_add_data( 'pendulum-arc-admin', 'rtl', 'replace' );
		}
		wp_set_script_translations( 'pendulum-arc-admin', 'pendulum-arc', ARC_WORDPRESS_DIR . 'languages' );
	}

	/**
	 * Menu mark. A mask, so it uses the same color as the dashicons.
	 */
	private function enqueue_menu_icon(): void {
		wp_enqueue_style(
			'pendulum-arc-menu',
			plugins_url( 'assets/menu.css', ARC_WORDPRESS_FILE ),
			array(),
			ARC_WORDPRESS_VERSION
		);
	}

	/**
	 * Shown when npm run build has not been run.
	 */
	public function missing_build_notice(): void {
		echo '<div class="notice notice-error"><p>';
		echo esc_html__( 'Pendulum Arc assets are missing. From the repository root, run npm install and npm run build.', 'pendulum-arc' );
		echo '</p></div>';
	}

	/**
	 * Prints the screen root. The script reads data-bootstrap.
	 *
	 * @param string $page dashboard or connect.
	 */
	private function render( string $page ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to connect Arc.', 'pendulum-arc' ) );
		}
		$user_id = get_current_user_id();
		$this->connect->ensure_project_slug();
		$bootstrap = array(
			'page'       => $page,
			'notice'     => $this->store->take_notice( $user_id ),
			'connection' => $this->store->public_view(),
			'pending'    => $this->store->pending_public( $user_id ),
			'urls'       => array(
				'dashboard' => admin_url( 'admin.php?page=pendulum-arc' ),
				'connect'   => admin_url( 'admin.php?page=pendulum-arc-connect' ),
				'portal'    => Arc_Config::portal( Arc_Config::env() ),
			),
		);
		$json      = wp_json_encode( $bootstrap );
		$mark      = plugins_url( 'assets/arc-mark-color.svg', ARC_WORDPRESS_FILE );
		echo '<div class="wrap">';
		echo '<div class="arc-page-head">';
		echo '<h1 class="arc-page-title">';
		echo '<img class="arc-page-title__mark" src="' . esc_url( $mark ) . '" alt="" width="28" height="28" />';
		echo esc_html( get_admin_page_title() );
		echo '</h1>';
		echo '<div id="pendulum-arc-title-actions" class="arc-page-head__actions"></div>';
		echo '</div>';
		echo '<div id="pendulum-arc-root" data-bootstrap="' . esc_attr( (string) $json ) . '"></div>';
		echo '</div>';
	}

	/**
	 * Sanitized page query argument.
	 */
	public static function current_page(): string {
		// Reading the page slug is routing, not a form submission.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! isset( $_GET['page'] ) ) {
			return '';
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return sanitize_key( wp_unslash( $_GET['page'] ) );
	}

	/**
	 * Whether the current admin hook is one of ours.
	 *
	 * @param string $hook Admin enqueue hook.
	 */
	private static function is_screen( string $hook ): bool {
		if ( in_array( $hook, array( 'toplevel_page_pendulum-arc', 'pendulum-arc_page_pendulum-arc-connect' ), true ) ) {
			return true;
		}
		return Admin_Access::is_plugin_page( self::current_page() );
	}
}
