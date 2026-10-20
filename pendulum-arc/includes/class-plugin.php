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
	 * Registers the updater and cookie consent, then the admin when sodium is available.
	 * Consent does not call Arc, so it still runs without the sodium extension.
	 */
	public function register(): void {
		if ( $this->registered ) {
			return;
		}
		$this->registered = true;

		( new Plugin_Updater() )->register();
		( new Consent_Front() )->register();
		( new Consent_Rest() )->register();

		if ( ! function_exists( 'sodium_crypto_secretbox' ) ) {
			add_action( 'admin_notices', array( $this, 'sodium_notice' ) );
			return;
		}

		$store      = new Connection_Store();
		$client     = new Arc_Client();
		$connect    = new Connect_Service( $store, $client );
		$list       = new Keyphrase_List();
		$keyphrases = new Keyphrase_Sync( $store, $connect, $client, $list, new Keyphrase_Scan( $list, new Keyphrase_Read() ) );
		$keyphrases->register();
		( new Admin( $store, $connect, new Alerts( $store, $list ) ) )->register();
		( new Rest_Controller( $connect, $keyphrases ) )->register();
	}

	/**
	 * Tells an admin that credentials cannot be stored.
	 */
	public function sodium_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		echo '<div class="notice notice-error"><p>';
		echo esc_html__( 'Arc Analytics needs the PHP sodium extension before it can store a connection.', 'pendulum-arc' );
		echo '</p></div>';
	}
}
