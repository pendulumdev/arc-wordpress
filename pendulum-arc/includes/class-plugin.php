<?php
/**
 * Boots admin pages and the REST API.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin entry.
 */
final class Plugin {

	/**
	 * Shared instance.
	 *
	 * @var self|null
	 */
	private static ?self $instance = null;

	/**
	 * Whether hooks are registered.
	 *
	 * @var bool
	 */
	private bool $registered = false;

	/**
	 * Returns the shared instance.
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Registers hooks once sodium is available.
	 */
	public function register(): void {
		if ( $this->registered ) {
			return;
		}
		$this->registered = true;

		if ( ! function_exists( 'sodium_crypto_secretbox' ) ) {
			add_action( 'admin_notices', array( $this, 'sodium_notice' ) );
			return;
		}

		$store   = new Connection_Store();
		$connect = new Connect_Service( $store, new Arc_Client() );
		( new Admin( $store, $connect ) )->register();
		( new Rest_Controller( $connect ) )->register();
	}

	/**
	 * Tells an admin that credentials cannot be stored.
	 */
	public function sodium_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		echo '<div class="notice notice-error"><p>';
		echo esc_html__( 'Pendulum Arc needs the PHP sodium extension before it can store a connection.', 'pendulum-arc' );
		echo '</p></div>';
	}
}
