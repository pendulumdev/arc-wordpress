<?php
/**
 * Known cookies. A row is added only when the site already sets that cookie
 * or enqueues a known script handle.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Catalog match and merge.
 */
final class Consent_Catalog {

	/**
	 * Catalog ids matched by the request cookies or script handles.
	 *
	 * @param array<int, string> $cookie_names Cookie names on the request.
	 * @param array<int, string> $handles      Enqueued script handles.
	 * @return list<string>
	 */
	public static function matching_ids( array $cookie_names, array $handles ): array {
		$ids = array();
		foreach ( self::entries() as $entry ) {
			if ( self::matches_handle( $entry, $handles ) || self::matches_any_cookie( $entry, $cookie_names ) ) {
				$ids[] = $entry['id'];
			}
		}
		return $ids;
	}

	/**
	 * Appends catalog rows that are newly detected. Existing rows are not edited.
	 * Dismissed ids are skipped.
	 *
	 * @param array<int, array<string, mixed>> $rows      Current rows.
	 * @param array<int, string>               $dismissed Dismissed catalog ids.
	 * @param array<int, string>               $cookie_names Cookie names.
	 * @param array<int, string>               $handles   Script handles.
	 * @return array{rows: array<int, array<string, mixed>>, changed: bool}
	 */
	public static function merge( array $rows, array $dismissed, array $cookie_names, array $handles ): array {
		$present = array();
		foreach ( $rows as $row ) {
			$id = isset( $row['catalog_id'] ) ? (string) $row['catalog_id'] : '';
			if ( '' !== $id ) {
				$present[ $id ] = true;
			}
		}
		$skip    = array_fill_keys( $dismissed, true );
		$changed = false;
		foreach ( self::matching_ids( $cookie_names, $handles ) as $id ) {
			if ( isset( $present[ $id ] ) || isset( $skip[ $id ] ) ) {
				continue;
			}
			$rows[]         = self::row( $id );
			$present[ $id ] = true;
			$changed        = true;
		}
		return array(
			'rows'    => $rows,
			'changed' => $changed,
		);
	}

	/**
	 * @param array<string, mixed> $entry   Catalog entry.
	 * @param array<int, string>   $handles Script handles.
	 */
	private static function matches_handle( array $entry, array $handles ): bool {
		foreach ( $entry['handles'] as $handle ) {
			if ( in_array( $handle, $handles, true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param array<string, mixed> $entry Catalog entry.
	 * @param array<int, string>   $names Cookie names.
	 */
	private static function matches_any_cookie( array $entry, array $names ): bool {
		foreach ( $names as $name ) {
			if ( self::matches_cookie( $entry, (string) $name ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param array<string, mixed> $entry Catalog entry.
	 * @param string               $name  Cookie name.
	 */
	private static function matches_cookie( array $entry, string $name ): bool {
		foreach ( $entry['exclude_prefixes'] as $prefix ) {
			if ( str_starts_with( $name, $prefix ) ) {
				return false;
			}
		}
		foreach ( $entry['prefixes'] as $prefix ) {
			if ( str_starts_with( $name, $prefix ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Row for a catalog id. Unknown ids return an empty manual-shaped row
	 * that sanitize will drop because the name is empty.
	 *
	 * @param string $id Catalog id.
	 * @return array<string, string>
	 */
	private static function row( string $id ): array {
		foreach ( self::entries() as $entry ) {
			if ( $entry['id'] !== $id ) {
				continue;
			}
			return array(
				'id'          => 'cat_' . $entry['id'],
				'catalog_id'  => $entry['id'],
				'name'        => $entry['name'],
				'label'       => $entry['label'],
				'description' => $entry['description'],
				'requirement' => $entry['requirement'],
				'type'        => $entry['type'],
				'scripts'     => '',
				'match'       => $entry['match'],
			);
		}
		return array(
			'id'          => '',
			'catalog_id'  => '',
			'name'        => '',
			'label'       => '',
			'description' => '',
			'requirement' => 'optional',
			'type'        => '',
			'scripts'     => '',
			'match'       => 'exact',
		);
	}

	/**
	 * Known cookies. Prefix order is handled with exclusions so `_ga` does
	 * not swallow `_ga_` or `_gat`.
	 *
	 * @return list<array<string, mixed>>
	 */
	private static function entries(): array {
		$analytics = array( 'google-site-kit', 'google-analytics', 'gtag' );
		return array(
			self::entry(
				'wordpress_logged_in',
				'wordpress_logged_in_',
				'prefix',
				__( 'WordPress login', 'pendulum-arc' ),
				__( 'Keeps an editor signed in. Required, and the browser will not let this banner delete it.', 'pendulum-arc' ),
				'required',
				__( 'Necessary', 'pendulum-arc' ),
				array( 'wordpress_logged_in_' ),
				array(),
				array()
			),
			self::entry(
				'wordpress_sec',
				'wordpress_sec_',
				'prefix',
				__( 'WordPress secure login', 'pendulum-arc' ),
				__( 'Second sign-in cookie on HTTPS. Required, and the browser will not let this banner delete it.', 'pendulum-arc' ),
				'required',
				__( 'Necessary', 'pendulum-arc' ),
				array( 'wordpress_sec_' ),
				array(),
				array()
			),
			self::entry(
				'wp_settings',
				'wp-settings-',
				'prefix',
				__( 'WordPress admin settings', 'pendulum-arc' ),
				__( 'Remembers admin screen preferences for a signed-in user.', 'pendulum-arc' ),
				'required',
				__( 'Necessary', 'pendulum-arc' ),
				array( 'wp-settings-' ),
				array( 'wp-settings-time-' ),
				array()
			),
			self::entry(
				'wp_settings_time',
				'wp-settings-time-',
				'prefix',
				__( 'WordPress admin settings time', 'pendulum-arc' ),
				__( 'Stores when those admin preferences were saved.', 'pendulum-arc' ),
				'required',
				__( 'Necessary', 'pendulum-arc' ),
				array( 'wp-settings-time-' ),
				array(),
				array()
			),
			self::entry(
				'comment_author',
				'comment_author_',
				'prefix',
				__( 'Comment name', 'pendulum-arc' ),
				__( 'Remembers the name typed on a comment form.', 'pendulum-arc' ),
				'optional',
				__( 'Comments', 'pendulum-arc' ),
				array( 'comment_author_' ),
				array( 'comment_author_email_', 'comment_author_url_' ),
				array()
			),
			self::entry(
				'comment_author_email',
				'comment_author_email_',
				'prefix',
				__( 'Comment email', 'pendulum-arc' ),
				__( 'Remembers the email typed on a comment form.', 'pendulum-arc' ),
				'optional',
				__( 'Comments', 'pendulum-arc' ),
				array( 'comment_author_email_' ),
				array(),
				array()
			),
			self::entry(
				'comment_author_url',
				'comment_author_url_',
				'prefix',
				__( 'Comment website', 'pendulum-arc' ),
				__( 'Remembers the website typed on a comment form.', 'pendulum-arc' ),
				'optional',
				__( 'Comments', 'pendulum-arc' ),
				array( 'comment_author_url_' ),
				array(),
				array()
			),
			self::entry(
				'ga',
				'_ga',
				'exact',
				__( 'Google Analytics', 'pendulum-arc' ),
				__( 'Distinguishes visitors. The cookie name is _ga.', 'pendulum-arc' ),
				'optional',
				__( 'Analytics', 'pendulum-arc' ),
				array( '_ga' ),
				array( '_ga_', '_gat' ),
				$analytics
			),
			self::entry(
				'ga_container',
				'_ga_',
				'prefix',
				__( 'Google Analytics property', 'pendulum-arc' ),
				__( 'Distinguishes visitors for one Analytics property. The cookie name starts with _ga_.', 'pendulum-arc' ),
				'optional',
				__( 'Analytics', 'pendulum-arc' ),
				array( '_ga_' ),
				array(),
				$analytics
			),
			self::entry(
				'gid',
				'_gid',
				'prefix',
				__( 'Google Analytics session', 'pendulum-arc' ),
				__( 'Distinguishes visitors for about a day. The cookie name starts with _gid.', 'pendulum-arc' ),
				'optional',
				__( 'Analytics', 'pendulum-arc' ),
				array( '_gid' ),
				array(),
				$analytics
			),
			self::entry(
				'gat',
				'_gat',
				'prefix',
				__( 'Google Analytics throttle', 'pendulum-arc' ),
				__( 'Throttles Analytics requests. The cookie name starts with _gat.', 'pendulum-arc' ),
				'optional',
				__( 'Analytics', 'pendulum-arc' ),
				array( '_gat' ),
				array(),
				$analytics
			),
		);
	}

	/**
	 * @param string               $id          Catalog id.
	 * @param string               $name        Cookie name or prefix.
	 * @param string               $name_match  exact or prefix.
	 * @param string               $label       Visitor label.
	 * @param string               $description Visitor description.
	 * @param string               $requirement optional or required.
	 * @param string               $type        Category label.
	 * @param array<int, string>   $prefixes    Names that count as this cookie.
	 * @param array<int, string>   $exclude     Prefixes that belong to another entry.
	 * @param array<int, string>   $handles     Script handles that count as this cookie.
	 * @return array<string, mixed>
	 */
	private static function entry(
		string $id,
		string $name,
		string $name_match,
		string $label,
		string $description,
		string $requirement,
		string $type,
		array $prefixes,
		array $exclude,
		array $handles
	): array {
		return array(
			'id'               => $id,
			'name'             => $name,
			'match'            => $name_match,
			'label'            => $label,
			'description'      => $description,
			'requirement'      => $requirement,
			'type'             => $type,
			'prefixes'         => $prefixes,
			'exclude_prefixes' => $exclude,
			'handles'          => $handles,
		);
	}
}
