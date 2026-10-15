<?php
/**
 * Plugin update cache registration.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace {
	if ( ! defined( 'ARC_WORDPRESS_VERSION' ) ) {
		define( 'ARC_WORDPRESS_VERSION', '0.3.6' );
	}
	if ( ! defined( 'ARC_WORDPRESS_FILE' ) ) {
		define( 'ARC_WORDPRESS_FILE', 'pendulum-arc/pendulum-arc.php' );
	}
	if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
		define( 'HOUR_IN_SECONDS', 3600 );
	}

	if ( ! function_exists( 'plugin_basename' ) ) {
		/**
		 * @param string $file Plugin file.
		 */
		function plugin_basename( string $file ): string {
			unset( $file );
			return 'pendulum-arc/pendulum-arc.php';
		}
	}

	if ( ! function_exists( 'get_site_option' ) ) {
		/**
		 * @param string $key     Option name.
		 * @param mixed  $default Default.
		 * @return mixed
		 */
		function get_site_option( string $key, $default = false ) {
			if ( array_key_exists( $key, $GLOBALS['arc_site_options'] ?? array() ) ) {
				return $GLOBALS['arc_site_options'][ $key ];
			}
			return $default;
		}
	}

	if ( ! function_exists( 'update_site_option' ) ) {
		/**
		 * @param string $key   Option name.
		 * @param mixed  $value Value.
		 */
		function update_site_option( string $key, $value ): bool {
			$GLOBALS['arc_site_options'][ $key ] = $value;
			return true;
		}
	}

	if ( ! function_exists( 'get_transient' ) ) {
		/**
		 * @param string $key Transient name.
		 * @return mixed
		 */
		function get_transient( string $key ) {
			return $GLOBALS['arc_transients'][ $key ] ?? false;
		}
	}

	if ( ! function_exists( 'set_transient' ) ) {
		/**
		 * @param string $key   Transient name.
		 * @param mixed  $value Value.
		 * @param int    $ttl   Lifetime.
		 */
		function set_transient( string $key, $value, int $ttl ): bool {
			$GLOBALS['arc_transients'][ $key ]    = $value;
			$GLOBALS['arc_transient_ttl'][ $key ] = $ttl;
			return true;
		}
	}

	if ( ! function_exists( 'delete_transient' ) ) {
		/**
		 * @param string $key Transient name.
		 */
		function delete_transient( string $key ): bool {
			unset( $GLOBALS['arc_transients'][ $key ] );
			return true;
		}
	}

	if ( ! function_exists( 'add_filter' ) ) {
		/**
		 * @param string   $hook     Hook.
		 * @param callable $callback Callback.
		 * @param int      $priority Priority.
		 * @param int      $args     Accepted arguments.
		 */
		function add_filter( string $hook, $callback, int $priority = 10, int $args = 1 ): bool {
			unset( $callback );
			$GLOBALS['arc_filters'][] = array( $hook, $priority, $args );
			return true;
		}
	}

	if ( ! function_exists( 'add_action' ) ) {
		/**
		 * @param string   $hook     Hook.
		 * @param callable $callback Callback.
		 * @param int      $priority Priority.
		 * @param int      $args     Accepted arguments.
		 */
		function add_action( string $hook, $callback, int $priority = 10, int $args = 1 ): bool {
			unset( $callback );
			$GLOBALS['arc_actions'][] = array( $hook, $priority, $args );
			return true;
		}
	}

	if ( ! function_exists( 'wp_remote_get' ) ) {
		/**
		 * @param string               $url  URL.
		 * @param array<string, mixed> $args Arguments.
		 * @return array<string, mixed>
		 */
		function wp_remote_get( string $url, array $args = array() ): array {
			unset( $url, $args );
			++$GLOBALS['arc_remote_calls'];
			return $GLOBALS['arc_remote'];
		}
	}

	if ( ! function_exists( 'is_wp_error' ) ) {
		/**
		 * @param mixed $thing Value.
		 */
		function is_wp_error( $thing ): bool {
			return is_object( $thing ) && isset( $thing->errors );
		}
	}

	if ( ! function_exists( 'wp_remote_retrieve_response_code' ) ) {
		/**
		 * @param array<string, mixed> $response Response.
		 */
		function wp_remote_retrieve_response_code( array $response ): int {
			return (int) $response['code'];
		}
	}

	if ( ! function_exists( 'wp_remote_retrieve_body' ) ) {
		/**
		 * @param array<string, mixed> $response Response.
		 */
		function wp_remote_retrieve_body( array $response ): string {
			return (string) $response['body'];
		}
	}

	if ( ! function_exists( 'is_admin' ) ) {
		/**
		 * Whether the stub is in wp-admin.
		 */
		function is_admin(): bool {
			return ! empty( $GLOBALS['arc_is_admin'] );
		}
	}

	if ( ! function_exists( 'current_user_can' ) ) {
		/**
		 * @param string $capability Capability.
		 */
		function current_user_can( string $capability ): bool {
			unset( $capability );
			return ! empty( $GLOBALS['arc_can_update'] );
		}
	}

	require dirname( __DIR__, 2 ) . '/pendulum-arc/includes/class-plugin-updater.php';
}

namespace ArcWordpress\Tests {

use ArcWordpress\Plugin_Updater;
use PHPUnit\Framework\TestCase;


/**
 * @covers \ArcWordpress\Plugin_Updater
 */
final class PluginUpdaterTest extends TestCase {

	private const FILE = 'pendulum-arc/pendulum-arc.php';

	protected function setUp(): void {
		parent::setUp();
		$GLOBALS['arc_site_options']  = array();
		$GLOBALS['arc_transients']    = array();
		$GLOBALS['arc_transient_ttl'] = array();
		$GLOBALS['arc_filters']       = array();
		$GLOBALS['arc_actions']       = array();
		$GLOBALS['arc_remote_calls']  = 0;
		$GLOBALS['arc_remote']        = array(
			'code' => 500,
			'body' => '',
		);
		$GLOBALS['arc_is_admin']      = false;
		$GLOBALS['arc_can_update']    = false;
		unset( $_GET['force-check'] );
	}

	public function test_a_newer_release_is_offered_as_an_update(): void {
		$GLOBALS['arc_remote'] = $this->release_response( 'v0.3.7' );

		$transient = $this->updater()->offer( $this->cache() );

		self::assertArrayHasKey( self::FILE, $transient->response );
		self::assertArrayNotHasKey( self::FILE, $transient->no_update );
		self::assertSame( '0.3.7', $transient->response[ self::FILE ]->new_version );
		self::assertSame(
			'https://github.com/pendulumdev/arc-wordpress/releases/download/v0.3.7/pendulum-arc.zip',
			$transient->response[ self::FILE ]->package
		);
	}

	public function test_the_current_release_is_listed_so_auto_updates_can_be_enabled(): void {
		$GLOBALS['arc_remote'] = $this->release_response( 'v0.3.6' );

		$transient = $this->updater()->offer( $this->cache() );

		self::assertArrayNotHasKey( self::FILE, $transient->response );
		self::assertArrayHasKey( self::FILE, $transient->no_update );
		self::assertSame( '0.3.6', $transient->no_update[ self::FILE ]->new_version );
		self::assertNotSame( '', $transient->no_update[ self::FILE ]->package );
	}

	public function test_a_failed_check_still_lists_the_installed_plugin(): void {
		$transient = $this->updater()->offer( $this->cache() );

		self::assertArrayNotHasKey( self::FILE, $transient->response );
		self::assertSame( '0.3.6', $transient->no_update[ self::FILE ]->new_version );
		self::assertSame( '', $transient->no_update[ self::FILE ]->package );
	}

	public function test_a_failed_check_keeps_an_update_already_in_the_cache(): void {
		$transient           = $this->cache();
		$transient->response[ self::FILE ] = (object) array(
			'new_version' => '0.3.7',
			'package'     => 'https://github.com/pendulumdev/arc-wordpress/releases/download/v0.3.7/pendulum-arc.zip',
		);

		$checked = $this->updater()->offer( $transient );

		self::assertSame( '0.3.7', $checked->response[ self::FILE ]->new_version );
		self::assertArrayNotHasKey( self::FILE, $checked->no_update );
	}

	public function test_a_failed_check_is_reused_until_wordpress_asks_again(): void {
		$this->updater()->offer( $this->cache() );
		$GLOBALS['arc_remote'] = $this->release_response( 'v0.3.7' );

		$again = $this->updater()->offer( $this->cache() );

		self::assertSame( 1, $GLOBALS['arc_remote_calls'] );
		self::assertArrayNotHasKey( self::FILE, $again->response );
		self::assertSame( HOUR_IN_SECONDS, $GLOBALS['arc_transient_ttl']['arc_wordpress_release'] );

		delete_transient( 'arc_wordpress_release' );
		$fresh = $this->updater()->offer( $this->cache() );

		self::assertSame( 2, $GLOBALS['arc_remote_calls'] );
		self::assertSame( '0.3.7', $fresh->response[ self::FILE ]->new_version );
	}

	public function test_check_again_ignores_the_cached_release(): void {
		$GLOBALS['arc_remote']     = $this->release_response( 'v0.3.6' );
		$GLOBALS['arc_is_admin']   = true;
		$GLOBALS['arc_can_update'] = true;
		$this->updater()->offer( $this->cache() );

		$GLOBALS['arc_remote']    = $this->release_response( 'v0.3.7' );
		$_GET['force-check']      = '1';
		$fresh                    = $this->updater()->offer( $this->cache() );

		self::assertSame( 2, $GLOBALS['arc_remote_calls'] );
		self::assertSame( '0.3.7', $fresh->response[ self::FILE ]->new_version );
	}

	public function test_a_missing_update_cache_is_left_alone(): void {
		self::assertFalse( $this->updater()->offer( false ) );
		self::assertSame( 0, $GLOBALS['arc_remote_calls'] );
	}

	public function test_automatic_updates_are_enabled_once(): void {
		$updater = $this->updater();
		$updater->enable_auto_update();
		$updater->enable_auto_update();

		self::assertSame( array( self::FILE ), $GLOBALS['arc_site_options']['auto_update_plugins'] );
		self::assertSame( '1', $GLOBALS['arc_site_options']['arc_wordpress_auto_update_set'] );

		$GLOBALS['arc_site_options']['auto_update_plugins'] = array();
		$updater->enable_auto_update();

		self::assertSame( array(), $GLOBALS['arc_site_options']['auto_update_plugins'] );
	}

	public function test_the_update_cache_is_filtered_when_it_is_read(): void {
		$GLOBALS['arc_transients']['arc_wordpress_release'] = array( 'json' => null );
		$updater = $this->updater();
		$updater->register();

		$hooks = array_column( $GLOBALS['arc_filters'], 0 );
		self::assertContains( 'site_transient_update_plugins', $hooks );
		self::assertNotContains( 'pre_set_site_transient_update_plugins', $hooks );
		self::assertArrayNotHasKey( 'arc_wordpress_release', $GLOBALS['arc_transients'] );
		self::assertSame( '0.3.6', $GLOBALS['arc_site_options']['arc_wordpress_release_version'] );
		self::assertContains( self::FILE, $GLOBALS['arc_site_options']['auto_update_plugins'] );
	}

	private function updater(): Plugin_Updater {
		return new Plugin_Updater();
	}

	private function cache(): object {
		return (object) array(
			'response'  => array(),
			'no_update' => array(),
		);
	}

	/**
	 * @return array{code: int, body: string}
	 */
	private function release_response( string $tag ): array {
		return array(
			'code' => 200,
			'body' => (string) json_encode(
				array(
					'tag_name' => $tag,
					'body'     => 'Notes',
					'html_url' => 'https://github.com/pendulumdev/arc-wordpress/releases/tag/' . $tag,
					'assets'   => array(
						array(
							'name'                 => 'pendulum-arc.zip',
							'browser_download_url' => 'https://github.com/pendulumdev/arc-wordpress/releases/download/' . $tag . '/pendulum-arc.zip',
						),
					),
				)
			),
		);
	}
}
}
