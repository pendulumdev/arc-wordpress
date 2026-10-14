<?php
/**
 * A GitHub release the plugin can install.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Latest public release of pendulumdev/arc-wordpress.
 */
final class Github_Release {

	/**
	 * Owner and repository.
	 */
	public const REPO = 'pendulumdev/arc-wordpress';

	/**
	 * Asset name WordPress installs.
	 */
	public const ASSET = 'pendulum-arc.zip';

	/**
	 * @param string $version     Version without a leading v.
	 * @param string $package_url HTTPS download for the plugin zip.
	 * @param string $notes       Release body.
	 * @param string $page_url    Release page.
	 */
	private function __construct(
		private string $version,
		private string $package_url,
		private string $notes,
		private string $page_url
	) {
	}

	/**
	 * Reads a GitHub release payload. Rejects drafts, pre-releases, and any
	 * download URL that is not this repository's plugin zip.
	 *
	 * @param array<string, mixed> $json Decoded release.
	 */
	public static function from_api( array $json ): ?self {
		if ( ! empty( $json['draft'] ) || ! empty( $json['prerelease'] ) ) {
			return null;
		}

		$tag = $json['tag_name'] ?? '';
		if ( ! is_string( $tag ) || 1 !== preg_match( '/^v(\d+\.\d+\.\d+)$/', $tag, $match ) ) {
			return null;
		}

		$package = self::package_from_assets( $json['assets'] ?? null );
		if ( null === $package ) {
			return null;
		}

		$notes = $json['body'] ?? '';
		if ( ! is_string( $notes ) ) {
			$notes = '';
		}

		$page = $json['html_url'] ?? '';
		if ( ! is_string( $page ) || ! self::is_release_page( $page ) ) {
			$page = 'https://github.com/' . self::REPO . '/releases';
		}

		return new self( $match[1], $package, $notes, $page );
	}

	/**
	 * Whether this release is newer than the installed plugin.
	 *
	 * @param string $installed Installed version, without a leading v.
	 */
	public function is_newer_than( string $installed ): bool {
		return version_compare( $this->version, ltrim( $installed, 'v' ), '>' );
	}

	/**
	 * Version without a leading v.
	 */
	public function version(): string {
		return $this->version;
	}

	/**
	 * Plugin zip URL.
	 */
	public function package_url(): string {
		return $this->package_url;
	}

	/**
	 * Release notes.
	 */
	public function notes(): string {
		return $this->notes;
	}

	/**
	 * Release page.
	 */
	public function page_url(): string {
		return $this->page_url;
	}

	/**
	 * Latest-release endpoint. Public repositories need no token.
	 */
	public static function api_url(): string {
		return 'https://api.github.com/repos/' . self::REPO . '/releases/latest';
	}

	/**
	 * @param mixed $assets Release assets.
	 */
	private static function package_from_assets( $assets ): ?string {
		if ( ! is_array( $assets ) ) {
			return null;
		}
		foreach ( $assets as $asset ) {
			if ( ! is_array( $asset ) || ( $asset['name'] ?? '' ) !== self::ASSET ) {
				continue;
			}
			$url = $asset['browser_download_url'] ?? '';
			if ( is_string( $url ) && self::is_package_url( $url ) ) {
				return $url;
			}
		}
		return null;
	}

	/**
	 * Only the release asset on this repository.
	 *
	 * @param string $url Candidate download URL.
	 */
	private static function is_package_url( string $url ): bool {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return false;
		}
		if ( ( $parts['scheme'] ?? '' ) !== 'https' || ( $parts['host'] ?? '' ) !== 'github.com' ) {
			return false;
		}
		$path   = $parts['path'] ?? '';
		$prefix = '/pendulumdev/arc-wordpress/releases/download/';
		return is_string( $path )
			&& str_starts_with( $path, $prefix )
			&& str_ends_with( $path, '/' . self::ASSET );
	}

	/**
	 * @param string $url Candidate release page.
	 */
	private static function is_release_page( string $url ): bool {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) ) {
			return false;
		}
		return ( $parts['scheme'] ?? '' ) === 'https'
			&& ( $parts['host'] ?? '' ) === 'github.com'
			&& is_string( $parts['path'] ?? null )
			&& str_starts_with( $parts['path'], '/pendulumdev/arc-wordpress/' );
	}
}
