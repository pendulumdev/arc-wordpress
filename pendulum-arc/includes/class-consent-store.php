<?php
/**
 * Reads and writes the cookie consent option.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Settings option. Ordinary saves keep the current consent version.
 */
final class Consent_Store {

	/**
	 * Request cache.
	 *
	 * @var array<string, mixed>|null
	 */
	private ?array $cache = null;

	/**
	 * Default stylesheet from the plugin file.
	 */
	public static function default_css(): string {
		$path = ARC_WORDPRESS_DIR . 'assets/cookie-consent.css';
		if ( ! is_readable( $path ) ) {
			return '';
		}
		// Local plugin file, not a remote request.
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$css = file_get_contents( $path );
		return is_string( $css ) ? $css : '';
	}

	/**
	 * Cookie names on this request. Names that are not a simple token are dropped.
	 *
	 * @return list<string>
	 */
	public static function request_cookie_names(): array {
		if ( ! isset( $_COOKIE ) || ! is_array( $_COOKIE ) ) {
			return array();
		}
		$names = array();
		foreach ( array_keys( $_COOKIE ) as $name ) {
			// The cookie jar is not a form submission.
			// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$raw = wp_unslash( (string) $name );
			$raw = str_replace( "\0", '', $raw );
			if ( 1 === preg_match( '/^[A-Za-z0-9_\-]{1,200}$/', $raw ) ) {
				$names[] = $raw;
			}
		}
		return $names;
	}

	/**
	 * Normalized settings for this request.
	 *
	 * @return array<string, mixed>
	 */
	public function settings(): array {
		if ( null === $this->cache ) {
			$stored      = get_option( Consent_Settings::OPTION, null );
			$this->cache = Consent_Settings::normalize( $stored, self::default_css() );
		}
		return $this->cache;
	}

	/**
	 * Settings plus the chosen icon URL for the admin screen.
	 *
	 * @return array<string, mixed>
	 */
	public function view(): array {
		$settings                    = $this->settings();
		$settings['reopen_icon_url'] = $this->icon_url( (int) $settings['reopen_icon_id'] );
		return $settings;
	}

	/**
	 * Saves a form payload without changing the consent version.
	 *
	 * @param array<string, mixed> $input Form payload.
	 * @return array<string, mixed>
	 */
	public function save( array $input ): array {
		$current = $this->settings();
		if ( isset( $input['content'] ) ) {
			$input['content'] = wp_kses_post( (string) $input['content'] );
		}
		if ( isset( $input['read_more_content'] ) ) {
			$input['read_more_content'] = wp_kses_post( (string) $input['read_more_content'] );
		}
		$next                          = Consent_Settings::sanitize( $input, self::default_css() );
		$next['consent_version']       = (int) $current['consent_version'];
		$next['dismissed_catalog_ids'] = Consent_Settings::merge_dismissed(
			$current['cookies'],
			$next['cookies'],
			$next['dismissed_catalog_ids']
		);
		$this->write( $next );
		return $this->view();
	}

	/**
	 * Bumps the consent version.
	 *
	 * @return array<string, mixed>
	 */
	public function renew(): array {
		$this->write( Consent_Settings::renew( $this->settings() ) );
		return $this->view();
	}

	/**
	 * Restores factory settings and bumps the consent version.
	 *
	 * @return array<string, mixed>
	 */
	public function reset(): array {
		$this->write( Consent_Settings::reset( $this->settings(), self::default_css() ) );
		return $this->view();
	}

	/**
	 * Restores the stylesheet only.
	 *
	 * @return array<string, mixed>
	 */
	public function reset_styles(): array {
		$next               = $this->settings();
		$next['custom_css'] = self::default_css();
		$this->write( $next );
		return $this->view();
	}

	/**
	 * Adds catalog rows when this request shows a known cookie or script.
	 * Writes the option only when a new row appears.
	 *
	 * @param array<int, string> $cookie_names Cookie names.
	 * @param array<int, string> $handles      Script handles.
	 */
	public function detect( array $cookie_names, array $handles ): void {
		$settings = $this->settings();
		$merged   = Consent_Catalog::merge(
			$settings['cookies'],
			$settings['dismissed_catalog_ids'],
			$cookie_names,
			$handles
		);
		if ( ! $merged['changed'] ) {
			return;
		}
		$settings['cookies'] = $merged['rows'];
		$this->write( $settings );
	}

	/**
	 * Attachment URL, or empty when none is chosen.
	 *
	 * @param int $attachment_id Attachment id.
	 */
	public function icon_url( int $attachment_id ): string {
		if ( $attachment_id < 1 ) {
			return '';
		}
		$url = wp_get_attachment_image_url( $attachment_id, 'thumbnail' );
		return is_string( $url ) ? $url : '';
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	private function write( array $settings ): void {
		$this->cache = $settings;
		update_option( Consent_Settings::OPTION, $settings, true );
	}
}
