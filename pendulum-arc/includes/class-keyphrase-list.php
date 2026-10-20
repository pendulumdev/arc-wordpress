<?php
/**
 * Local keyphrase list. One row per path, not an autoloaded option.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The scan and the save hooks write here. Sync reads dirty rows from here.
 */
final class Keyphrase_List {

	public const OPTION    = 'arc_keyphrase_sync';
	public const DB_OPTION = 'arc_keyphrase_db';

	/**
	 * Table name for this site.
	 */
	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'arc_keyphrases';
	}

	/**
	 * Creates the table once. The option is not autoloaded.
	 */
	public function install(): void {
		if ( '1' === get_option( self::DB_OPTION, '' ) ) {
			return;
		}
		global $wpdb;
		$table   = self::table();
		$charset = $wpdb->get_charset_collate();
		$sql     = "CREATE TABLE {$table} (
			path_hash char(64) NOT NULL,
			path varchar(512) NOT NULL DEFAULT '',
			phrase varchar(500) NOT NULL DEFAULT '',
			synced_phrase varchar(500) NOT NULL DEFAULT '',
			deleted tinyint(1) NOT NULL DEFAULT 0,
			object_kind varchar(16) NOT NULL DEFAULT '',
			object_id bigint(20) unsigned NOT NULL DEFAULT 0,
			PRIMARY KEY  (path_hash),
			KEY object_lookup (object_kind, object_id)
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
	 * @return array{enabled: bool, acked_hash: string, focus: string, focus_synced: string, cursor: array<string, mixed>, scan_done: bool, sync_id: string, notice: bool}
	 */
	public function state(): array {
		$stored = get_option( self::OPTION, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}
		$cursor = $stored['cursor'] ?? array();
		if ( ! is_array( $cursor ) ) {
			$cursor = array();
		}
		return array(
			'enabled'      => ! empty( $stored['enabled'] ),
			'acked_hash'   => (string) ( $stored['acked_hash'] ?? '' ),
			'focus'        => (string) ( $stored['focus'] ?? '' ),
			'focus_synced' => (string) ( $stored['focus_synced'] ?? '' ),
			'cursor'       => $cursor,
			'scan_done'    => ! empty( $stored['scan_done'] ),
			'sync_id'      => (string) ( $stored['sync_id'] ?? '' ),
			'notice'       => ! empty( $stored['notice'] ),
		);
	}

	/**
	 * Turns the list on from an empty table, or clears it when turned off.
	 */
	public function set_enabled( bool $enabled ): void {
		if ( ! $enabled ) {
			$this->wipe_rows();
			update_option(
				self::OPTION,
				array(
					'enabled'      => false,
					'acked_hash'   => '',
					'focus'        => '',
					'focus_synced' => '',
					'cursor'       => array(),
					'scan_done'    => false,
					'sync_id'      => '',
					'notice'       => true,
				),
				false
			);
			return;
		}
		$this->install();
		$this->wipe_rows();
		update_option(
			self::OPTION,
			array(
				'enabled'      => true,
				'acked_hash'   => '',
				'focus'        => '',
				'focus_synced' => '',
				'cursor'       => Keyphrase_Cursor::start( array() ),
				'scan_done'    => false,
				'sync_id'      => '',
				'notice'       => false,
			),
			false
		);
	}

	/**
	 * Drops the accepted hash and starts the scan again. Rows are removed so the next upload is a replace.
	 */
	public function reset_scan(): void {
		$state = $this->state();
		if ( ! $state['enabled'] ) {
			return;
		}
		$this->wipe_rows();
		$state['acked_hash']   = '';
		$state['focus']        = '';
		$state['focus_synced'] = '';
		$state['cursor']       = Keyphrase_Cursor::start( array() );
		$state['scan_done']    = false;
		$state['sync_id']      = '';
		$this->write( $state );
	}

	/**
	 * @param array{enabled: bool, acked_hash: string, focus: string, focus_synced: string, cursor: array<string, mixed>, scan_done: bool, sync_id: string, notice: bool} $state State.
	 */
	public function write( array $state ): void {
		update_option( self::OPTION, $state, false );
	}

	/**
	 * Site focus. The homepage is not a page row.
	 */
	public function set_focus( string $phrase ): void {
		$state          = $this->state();
		$state['focus'] = $phrase;
		$this->write( $state );
	}

	/**
	 * Inserts or updates one path. A changed path tombstones the previous row.
	 */
	public function put( string $kind, int $object_id, string $path, string $phrase ): void {
		$existing = $this->by_object( $kind, $object_id );
		$hash     = hash( 'sha256', $path );
		if ( is_array( $existing ) && (string) $existing['path_hash'] !== $hash ) {
			$this->tombstone_hash( (string) $existing['path_hash'] );
		}
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( $wpdb->prepare( "INSERT INTO {$table} (path_hash, path, phrase, synced_phrase, deleted, object_kind, object_id) VALUES (%s, %s, %s, '', 0, %s, %d) ON DUPLICATE KEY UPDATE path = VALUES(path), phrase = VALUES(phrase), deleted = 0, object_kind = VALUES(object_kind), object_id = VALUES(object_id)", $hash, $path, $phrase, $kind, $object_id ) );
	}

	/**
	 * Marks a path deleted when Arc has accepted it. A row Arc has never seen is removed.
	 */
	public function clear_path( string $kind, int $object_id, string $path ): void {
		$existing = $this->by_object( $kind, $object_id );
		if ( is_array( $existing ) ) {
			$this->tombstone_hash( (string) $existing['path_hash'] );
		}
		if ( '' !== $path ) {
			$this->tombstone_hash( hash( 'sha256', $path ) );
		}
	}

	/**
	 * @return array<int, array{path: string, phrase: string, synced_phrase: string, deleted: bool}>
	 */
	public function rows(): array {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$found = $wpdb->get_results( "SELECT path, phrase, synced_phrase, deleted FROM {$table}", ARRAY_A );
		if ( ! is_array( $found ) ) {
			return array();
		}
		$out = array();
		foreach ( $found as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$out[] = array(
				'path'          => (string) ( $row['path'] ?? '' ),
				'phrase'        => (string) ( $row['phrase'] ?? '' ),
				'synced_phrase' => (string) ( $row['synced_phrase'] ?? '' ),
				'deleted'       => ! empty( $row['deleted'] ),
			);
		}
		return $out;
	}

	/**
	 * Pages that are still in the list. Tombstones are omitted, so this is the local hash input.
	 *
	 * @return array<int, array{path: string, phrase: string}>
	 */
	public function current_pages(): array {
		$pages = array();
		foreach ( $this->rows() as $row ) {
			if ( $row['deleted'] || '' === $row['phrase'] || '' === $row['path'] || '/' === $row['path'] ) {
				continue;
			}
			$pages[] = array(
				'path'   => $row['path'],
				'phrase' => $row['phrase'],
			);
		}
		return $pages;
	}

	/**
	 * How many current page rows are stored.
	 */
	public function page_count(): int {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE deleted = 0 AND phrase <> '' AND path <> '/' AND path <> ''" );
	}

	/**
	 * Copies the accepted phrases over the synced columns and drops tombstones.
	 */
	public function ack( string $hash, string $focus ): void {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "DELETE FROM {$table} WHERE deleted = 1" );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "UPDATE {$table} SET synced_phrase = phrase WHERE deleted = 0" );
		$state                 = $this->state();
		$state['acked_hash']   = $hash;
		$state['focus']        = $focus;
		$state['focus_synced'] = $focus;
		$state['sync_id']      = '';
		$this->write( $state );
	}

	/**
	 * Removes every row. Used when sync is turned off and when permalinks change.
	 */
	public function wipe_rows(): void {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->query( "DELETE FROM {$table}" );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function by_object( string $kind, int $object_id ): ?array {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT path_hash, path, synced_phrase, deleted FROM {$table} WHERE object_kind = %s AND object_id = %d ORDER BY deleted ASC LIMIT 1", $kind, $object_id ), ARRAY_A );
		return is_array( $row ) ? $row : null;
	}

	/**
	 * Tombstones a row Arc has accepted. A row that was never sent is deleted.
	 */
	private function tombstone_hash( string $hash ): void {
		global $wpdb;
		$table = self::table();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT synced_phrase FROM {$table} WHERE path_hash = %s", $hash ), ARRAY_A );
		if ( ! is_array( $row ) ) {
			return;
		}
		if ( '' === (string) ( $row['synced_phrase'] ?? '' ) ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->delete( $table, array( 'path_hash' => $hash ) );
			return;
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$wpdb->update(
			$table,
			array(
				'deleted' => 1,
				'phrase'  => '',
			),
			array( 'path_hash' => $hash )
		);
	}
}
