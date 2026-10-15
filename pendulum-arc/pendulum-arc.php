<?php
/**
 * Plugin Name:       Arc Analytics
 * Plugin URI:        https://github.com/pendulumdev/arc-wordpress
 * Description:       Connect this site to a Pendulum Arc account.
 * Version:           0.3.3
 * Requires at least: 6.7
 * Requires PHP:      8.1
 * Author:            Pendulum
 * Author URI:        https://pendulumdev.co.uk
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pendulum-arc
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ARC_WORDPRESS_VERSION', '0.3.3' );
define( 'ARC_WORDPRESS_FILE', __FILE__ );
define( 'ARC_WORDPRESS_DIR', plugin_dir_path( __FILE__ ) );

require_once ARC_WORDPRESS_DIR . 'includes/autoload.php';

// Git installs still need this. WordPress.org loads translations on its own.
add_action(
	'init',
	static function (): void {
		load_plugin_textdomain(
			'pendulum-arc',
			false,
			dirname( plugin_basename( ARC_WORDPRESS_FILE ) ) . '/languages'
		);
	}
);

add_action(
	'plugins_loaded',
	static function (): void {
		ArcWordpress\Plugin::instance()->register();
	}
);
