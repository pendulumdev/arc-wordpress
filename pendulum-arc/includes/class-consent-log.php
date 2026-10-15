<?php
/**
 * Consent log table.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Stores consent choices and limits how often one address can write.
 */
final class Consent_Log {

	public const DB_OPTION = 'arc_consent_log_db';

	/**
	 * Table name for this site.
	 */
	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'arc_consent_log';
	}

	/**
	 * Creates the table once.
	 */
	public function install(): void {
		if ( '1' === get_option( self::DB_OPTION, '' ) ) {
			return;
		}
		global $wpdb;
		$table   = self::table();
		$charset = $wpdb->get_charset_collate();
		$sql     = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			created_gmt datetime NOT NULL,
			consent_version int(10) unsigned NOT NULL DEFAULT 0,
			action varchar(16) NOT NULL DEFAULT '',
			allowed text NOT NULL,
			refused text NOT NULL,
			ip varchar(45) NOT NULL DEFAULT '',
			user_agent varchar(500) NOT NULL DEFAULT '',
			PRIMARY KEY  (id),
			KEY created_gmt (created_gmt)
		) {$charset};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );

		$like = $wpdb->esc_like( $table );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $like ) );
		if ( $found === $table ) {
			update_option( self::DB_OPTION, '1', false );
		}
	}

	/**
	 * Inserts one accepted payload.
	 *
	 * @param array{action: string, allowed: array<int, string>, refused: array<int, string>, ip: string, user_agent: string} $row Payload.
	 * @param int                                                                                                                $version Consent version.
	 */
	public function insert( array $row, int $version ): void {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->insert(
			self::table(),
			array(
				'created_gmt'     => gmdate( 'Y-m-d H:i:s' ),
				'consent_version' => $version,
				'action'          => $row['action'],
				'allowed'         => wp_json_encode( $row['allowed'] ),
				'refused'         => wp_json_encode( $row['refused'] ),
				'ip'              => $row['ip'],
				'user_agent'      => $row['user_agent'],
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	/**
	 * Newest rows for the Advanced tab.
	 *
	 * @param int $limit Maximum rows.
	 * @return list<array<string, mixed>>
	 */
	public function latest( int $limit = 100 ): array {
		global $wpdb;
		$table = self::table();
		$limit = max( 1, min( 100, $limit ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT id, created_gmt, consent_version, action, allowed, refused, ip, user_agent FROM {$table} ORDER BY id DESC LIMIT %d", $limit ), ARRAY_A );
		if ( ! is_array( $rows ) ) {
			return array();
		}
		$out = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$out[] = array(
				'id'              => (int) $row['id'],
				'created_gmt'     => (string) $row['created_gmt'],
				'consent_version' => (int) $row['consent_version'],
				'action'          => (string) $row['action'],
				'allowed'         => self::names( (string) $row['allowed'] ),
				'refused'         => self::names( (string) $row['refused'] ),
				'ip'              => (string) $row['ip'],
				'user_agent'      => (string) $row['user_agent'],
			);
		}
		return $out;
	}

	/**
	 * True when this address has already logged 30 choices in the last hour.
	 *
	 * @param string $ip Remote address. Empty still counts as one bucket.
	 */
	public function limited( string $ip ): bool {
		$key   = 'arc_cookie_consent_rate_' . md5( '' === $ip ? 'unknown' : $ip );
		$count = (int) get_transient( $key );
		if ( $count >= 30 ) {
			return true;
		}
		set_transient( $key, $count + 1, HOUR_IN_SECONDS );
		return false;
	}

	/**
	 * @param string $json JSON list of cookie names.
	 * @return list<string>
	 */
	private static function names( string $json ): array {
		$decoded = json_decode( $json, true );
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		$names = array();
		foreach ( $decoded as $name ) {
			if ( is_string( $name ) && '' !== $name ) {
				$names[] = $name;
			}
		}
		return $names;
	}
}
