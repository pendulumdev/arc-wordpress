<?php
/**
 * Loads pure classes for PHPUnit without WordPress.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$root = dirname( __DIR__, 2 ) . '/pendulum-arc';
require $root . '/includes/class-site-origin.php';
require $root . '/includes/class-pairing.php';
require $root . '/includes/class-site-draft.php';
require $root . '/includes/class-pkce.php';
require $root . '/includes/class-secret-box.php';
require $root . '/includes/class-admin-access.php';
