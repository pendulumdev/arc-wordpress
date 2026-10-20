<?php
/**
 * Builds the local keyphrase list in small pages. This does not call Arc.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * One tick reads a bounded set of posts or terms, then moves the cursor.
 */
final class Keyphrase_Scan {

	public const BATCH = 200;

	/**
	 * @var Keyphrase_List
	 */
	private Keyphrase_List $list;

	/**
	 * @var Keyphrase_Read
	 */
	private Keyphrase_Read $read;

	/**
	 * @param Keyphrase_List $phrases Local list.
	 * @param Keyphrase_Read $read    Plugin phrase reader.
	 */
	public function __construct( Keyphrase_List $phrases, Keyphrase_Read $read ) {
		$this->list = $phrases;
		$this->read = $read;
	}

	/**
	 * Reads one page. Returns true when another tick is still needed.
	 */
	public function tick( string $origin ): bool {
		$state = $this->list->state();
		if ( ! $state['enabled'] || $state['scan_done'] ) {
			return false;
		}
		$this->list->install();
		$types  = $this->post_types();
		$taxes  = $this->taxonomies();
		$cursor = $state['cursor'];
		if ( ! isset( $cursor['phase'] ) ) {
			$cursor = Keyphrase_Cursor::start( $taxes );
		}
		$count   = 0;
		$last_id = (int) ( $cursor['after_id'] ?? 0 );
		if ( 'posts' === (string) ( $cursor['phase'] ?? 'posts' ) ) {
			$ids = $this->post_ids( $types, (int) ( $cursor['after_id'] ?? 0 ) );
			foreach ( $ids as $post_id ) {
				$this->apply_post( $post_id, $origin );
				$last_id = $post_id;
				++$count;
			}
		} else {
			$index = (int) ( $cursor['taxonomy'] ?? 0 );
			$tax   = $taxes[ $index ] ?? '';
			if ( '' !== $tax ) {
				$terms = $this->terms( $tax, (int) ( $cursor['offset'] ?? 0 ) );
				$yoast = get_option( 'wpseo_taxonomy_meta', array() );
				if ( ! is_array( $yoast ) ) {
					$yoast = array();
				}
				foreach ( $terms as $term_id ) {
					$this->apply_term( $term_id, $tax, $origin, $yoast );
					++$count;
				}
			}
		}
		$next               = Keyphrase_Cursor::advance( $cursor, $count, self::BATCH, $last_id, count( $taxes ) );
		$state['cursor']    = $next;
		$state['scan_done'] = $next['done'];
		$this->list->write( $state );
		return ! $next['done'];
	}

	/**
	 * Refreshes one saved post.
	 */
	public function save_post( int $post_id, string $origin ): void {
		if ( ! $this->list->state()['enabled'] || wp_is_post_revision( $post_id ) ) {
			return;
		}
		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return;
		}
		if ( ! in_array( $post->post_type, $this->post_types(), true ) ) {
			return;
		}
		$this->list->install();
		if ( 'publish' !== $post->post_status || '' !== (string) $post->post_password ) {
			$url  = (string) get_permalink( $post );
			$path = Keyphrase_Path::from_url( $url, $origin );
			$this->list->clear_path( 'post', $post_id, (string) $path );
			return;
		}
		$this->apply_post( $post_id, $origin );
	}

	/**
	 * Tombstones a post that is about to be deleted.
	 */
	public function delete_post( int $post_id, string $origin ): void {
		if ( ! $this->list->state()['enabled'] ) {
			return;
		}
		$url  = (string) get_permalink( $post_id );
		$path = Keyphrase_Path::from_url( $url, $origin );
		$this->list->clear_path( 'post', $post_id, (string) $path );
	}

	/**
	 * Refreshes one saved term.
	 */
	public function save_term( int $term_id, string $taxonomy, string $origin ): void {
		if ( ! $this->list->state()['enabled'] || ! in_array( $taxonomy, $this->taxonomies(), true ) ) {
			return;
		}
		$this->list->install();
		$yoast = get_option( 'wpseo_taxonomy_meta', array() );
		if ( ! is_array( $yoast ) ) {
			$yoast = array();
		}
		$this->apply_term( $term_id, $taxonomy, $origin, $yoast );
	}

	/**
	 * Tombstones a term that is about to be deleted.
	 */
	public function delete_term( int $term_id, string $taxonomy, string $origin ): void {
		if ( ! $this->list->state()['enabled'] || ! in_array( $taxonomy, $this->taxonomies(), true ) ) {
			return;
		}
		$link = get_term_link( $term_id, $taxonomy );
		$url  = is_string( $link ) ? $link : '';
		$path = Keyphrase_Path::from_url( $url, $origin );
		$this->list->clear_path( 'term', $term_id, (string) $path );
	}

	/**
	 * Writes one published post into the list.
	 */
	private function apply_post( int $post_id, string $origin ): void {
		$url  = (string) get_permalink( $post_id );
		$post = get_post( $post_id );
		if ( ! $post instanceof \WP_Post || '' !== (string) $post->post_password ) {
			return;
		}
		$front = (int) get_option( 'page_on_front' ) === $post_id && 'page' === $post->post_type;
		$row   = Keyphrase_Collect::row( $url, $origin, $front, array( $this->read->post_phrase( $post_id ) ) );
		$this->apply( 'post', $post_id, $row );
	}

	/**
	 * Writes one term into the list.
	 *
	 * @param array<string, mixed> $yoast Yoast taxonomy option.
	 */
	private function apply_term( int $term_id, string $taxonomy, string $origin, array $yoast ): void {
		$link = get_term_link( $term_id, $taxonomy );
		if ( ! is_string( $link ) ) {
			return;
		}
		$row = Keyphrase_Collect::row( $link, $origin, false, array( $this->read->term_phrase( $term_id, $taxonomy, $yoast ) ) );
		$this->apply( 'term', $term_id, $row );
	}

	/**
	 * @param array{role: string, path: string, phrase: string} $row Classified row.
	 */
	private function apply( string $kind, int $object_id, array $row ): void {
		if ( 'skip' === $row['role'] ) {
			return;
		}
		if ( 'focus' === $row['role'] || 'clear-focus' === $row['role'] ) {
			$this->list->set_focus( $row['phrase'] );
			return;
		}
		if ( 'clear' === $row['role'] ) {
			$this->list->clear_path( $kind, $object_id, $row['path'] );
			return;
		}
		$this->list->put( $kind, $object_id, $row['path'], $row['phrase'] );
	}

	/**
	 * @param array<int, string> $types Public post types.
	 * @return array<int, int>
	 */
	private function post_ids( array $types, int $after_id ): array {
		if ( ! $types ) {
			return array();
		}
		global $wpdb;
		$placeholders = implode( ', ', array_fill( 0, count( $types ), '%s' ) );
		$args         = $types;
		$args[]       = $after_id;
		$args[]       = self::BATCH;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_status = 'publish' AND post_password = '' AND post_type IN ({$placeholders}) AND ID > %d ORDER BY ID ASC LIMIT %d", $args ) );
		if ( ! is_array( $ids ) ) {
			return array();
		}
		return array_map( 'intval', $ids );
	}

	/**
	 * @return array<int, int>
	 */
	private function terms( string $taxonomy, int $offset ): array {
		$found = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
				'number'     => self::BATCH,
				'offset'     => $offset,
				'orderby'    => 'term_id',
				'order'      => 'ASC',
				'fields'     => 'ids',
			)
		);
		if ( ! is_array( $found ) ) {
			return array();
		}
		return array_map( 'intval', $found );
	}

	/**
	 * @return array<int, string>
	 */
	private function post_types(): array {
		$types = get_post_types( array( 'public' => true ), 'names' );
		if ( ! is_array( $types ) ) {
			return array();
		}
		unset( $types['attachment'] );
		return array_values( $types );
	}

	/**
	 * @return array<int, string>
	 */
	private function taxonomies(): array {
		$taxes = get_taxonomies( array( 'public' => true ), 'names' );
		if ( ! is_array( $taxes ) ) {
			return array();
		}
		return array_values( $taxes );
	}
}
