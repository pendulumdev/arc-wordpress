<?php
/**
 * Offers a GitHub release through the WordPress plugin updater.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugins-screen update, and the same action on the Arc screens.
 */
final class Plugin_Updater {

	/**
	 * Hooks.
	 */
	public function register(): void {
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'offer' ) );
		add_filter( 'plugins_api', array( $this, 'info' ), 20, 3 );
		add_filter( 'upgrader_source_selection', array( $this, 'source' ), 10, 4 );
		add_action( 'admin_notices', array( $this, 'notice' ) );
	}

	/**
	 * Adds this plugin to the update list when GitHub has a newer release.
	 *
	 * @param mixed $transient Update transient.
	 * @return mixed
	 */
	public function offer( $transient ) {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}

		$release = $this->release();
		if ( null === $release ) {
			return $transient;
		}

		$file = $this->plugin_file();
		if ( $release->is_newer_than( ARC_WORDPRESS_VERSION ) ) {
			if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
				$transient->response = array();
			}
			$transient->response[ $file ] = $this->update_object( $release );
			return $transient;
		}

		if ( isset( $transient->response[ $file ] ) ) {
			unset( $transient->response[ $file ] );
		}
		if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) {
			$transient->no_update = array();
		}
		$transient->no_update[ $file ] = $this->update_object( $release );

		return $transient;
	}

	/**
	 * Details modal on the Plugins screen.
	 *
	 * @param mixed  $result Existing answer.
	 * @param string $action Requested action.
	 * @param mixed  $args   Request arguments.
	 * @return mixed
	 */
	public function info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || ! is_object( $args ) || ( $args->slug ?? '' ) !== $this->slug() ) {
			return $result;
		}

		$release = $this->release();
		if ( null === $release ) {
			return $result;
		}

		$notes = $release->notes();
		if ( '' === $notes ) {
			$notes = __( 'See the release on GitHub.', 'pendulum-arc' );
		}

		return (object) array(
			'name'          => 'Pendulum Arc',
			'slug'          => $this->slug(),
			'version'       => $release->version(),
			'author'        => '<a href="https://pendulumdev.co.uk">Pendulum</a>',
			'homepage'      => $release->page_url(),
			'requires'      => '6.7',
			'tested'        => '7.1',
			'requires_php'  => '8.1',
			'download_link' => $release->package_url(),
			'sections'      => array(
				'description' => esc_html__( 'Connect this site to a Pendulum Arc account.', 'pendulum-arc' ),
				'changelog'   => wpautop( esc_html( $notes ) ),
			),
		);
	}

	/**
	 * Puts the extracted folder in the installed plugin directory.
	 *
	 * @param string       $source        Extracted path.
	 * @param string       $remote_source Remote source directory.
	 * @param \WP_Upgrader $upgrader      Upgrader.
	 * @param array        $hook_extra    Upgrade context.
	 * @return string|\WP_Error
	 */
	public function source( $source, $remote_source, $upgrader, $hook_extra ) {
		unset( $upgrader );
		if ( ! is_array( $hook_extra ) || ( $hook_extra['plugin'] ?? '' ) !== $this->plugin_file() ) {
			return $source;
		}
		if ( ! is_string( $source ) || ! is_string( $remote_source ) ) {
			return $source;
		}
		if ( 'pendulum-arc' === basename( untrailingslashit( $source ) ) ) {
			return $source;
		}

		global $wp_filesystem;
		if ( ! $wp_filesystem ) {
			return $source;
		}

		$fixed = trailingslashit( $remote_source ) . 'pendulum-arc';
		if ( $wp_filesystem->move( $source, $fixed, true ) ) {
			return trailingslashit( $fixed );
		}

		return $source;
	}

	/**
	 * Update notice on the Arc screens. The Plugins list uses the same release.
	 */
	public function notice(): void {
		if ( ! current_user_can( 'update_plugins' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->id, array( 'toplevel_page_pendulum-arc', 'pendulum-arc_page_pendulum-arc-connect' ), true ) ) {
			return;
		}

		$updates = get_site_transient( 'update_plugins' );
		$file    = $this->plugin_file();
		if ( ! is_object( $updates ) || empty( $updates->response[ $file ]->new_version ) ) {
			return;
		}

		$version = (string) $updates->response[ $file ]->new_version;
		$url     = wp_nonce_url(
			self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . rawurlencode( $file ) ),
			'upgrade-plugin_' . $file
		);

		echo '<div class="notice notice-warning"><p>';
		echo esc_html(
			sprintf(
				/* translators: %s: version number */
				__( 'Pendulum Arc %s is available.', 'pendulum-arc' ),
				$version
			)
		);
		echo ' <a href="' . esc_url( $url ) . '">';
		echo esc_html__( 'Update now', 'pendulum-arc' );
		echo '</a></p></div>';
	}

	/**
	 * Latest release, or null when GitHub has nothing we can install.
	 */
	private function release(): ?Github_Release {
		$response = wp_remote_get(
			Github_Release::api_url(),
			array(
				'timeout' => 5,
				'headers' => array(
					'Accept'     => 'application/vnd.github+json',
					'User-Agent' => 'pendulum-arc/' . ARC_WORDPRESS_VERSION,
				),
			)
		);
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$json = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $json ) ) {
			return null;
		}

		return Github_Release::from_api( $json );
	}

	/**
	 * Update row WordPress stores on the transient.
	 *
	 * @param Github_Release $release Release to install.
	 */
	private function update_object( Github_Release $release ): object {
		return (object) array(
			'id'           => $release->page_url(),
			'slug'         => $this->slug(),
			'plugin'       => $this->plugin_file(),
			'new_version'  => $release->version(),
			'url'          => $release->page_url(),
			'package'      => $release->package_url(),
			'tested'       => '7.1',
			'requires'     => '6.7',
			'requires_php' => '8.1',
		);
	}

	/**
	 * Plugin basename, for example pendulum-arc/pendulum-arc.php.
	 */
	private function plugin_file(): string {
		return plugin_basename( ARC_WORDPRESS_FILE );
	}

	/**
	 * Directory slug.
	 */
	private function slug(): string {
		$slug = dirname( $this->plugin_file() );
		return '.' === $slug ? 'pendulum-arc' : $slug;
	}
}
