<?php
/**
 * Checkbox, background scan, and the click that sends the list to Arc.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

// Exception text is JSON for the admin UI, which renders it as text.
// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The cron keeps the local list. Arc is called only from the dashboard status check and the sync button.
 */
final class Keyphrase_Sync {

	public const HOOK = 'arc_wordpress_keyphrase_scan';
	public const LOCK = 'arc_keyphrase_scan_lock';

	/**
	 * Focus meta written by SEO plugins. Read after the meta exists, not on save_post.
	 *
	 * @var array<int, string>
	 */
	private const FOCUS_META = array(
		'_yoast_wpseo_focuskw',
		'_yoast_wpseo_focuskeywords',
		'rank_math_focus_keyword',
		'_seopress_analysis_target_kw',
	);

	/**
	 * @var Connection_Store
	 */
	private Connection_Store $connections;

	/**
	 * @var Connect_Service
	 */
	private Connect_Service $connect;

	/**
	 * @var Arc_Client
	 */
	private Arc_Client $client;

	/**
	 * @var Keyphrase_List
	 */
	private Keyphrase_List $list;

	/**
	 * @var Keyphrase_Scan
	 */
	private Keyphrase_Scan $scan;

	/**
	 * @param Connection_Store $connections Paired site.
	 * @param Connect_Service  $connect     Bearer calls.
	 * @param Arc_Client       $client      SEO target routes.
	 * @param Keyphrase_List   $phrases     Local rows.
	 * @param Keyphrase_Scan   $scan        One page of the scan.
	 */
	public function __construct( Connection_Store $connections, Connect_Service $connect, Arc_Client $client, Keyphrase_List $phrases, Keyphrase_Scan $scan ) {
		$this->connections = $connections;
		$this->connect     = $connect;
		$this->client      = $client;
		$this->list        = $phrases;
		$this->scan        = $scan;
	}

	/**
	 * Hooks. A scan that was already enabled is scheduled again if it has not finished.
	 */
	public function register(): void {
		add_action( self::HOOK, array( $this, 'cron' ) );
		add_action( 'wp_after_insert_post', array( $this, 'save_post' ) );
		add_action( 'added_post_meta', array( $this, 'focus_meta' ), 10, 3 );
		add_action( 'updated_post_meta', array( $this, 'focus_meta' ), 10, 3 );
		add_action( 'before_delete_post', array( $this, 'delete_post' ) );
		add_action( 'saved_term', array( $this, 'save_term' ), 20, 3 );
		add_action( 'pre_delete_term', array( $this, 'delete_term' ), 10, 2 );
		add_action( 'update_option_permalink_structure', array( $this, 'permalinks' ) );
		$state = $this->list->state();
		if ( $state['enabled'] && ! $state['scan_done'] ) {
			$this->schedule();
		}
	}

	/**
	 * One cron page. Schedules the next page when the list is still incomplete.
	 */
	public function cron(): void {
		if ( $this->pump() ) {
			$this->schedule();
		}
	}

	/**
	 * Refreshes the row for a saved post. Runs after Yoast and the block editor have stored focus meta.
	 *
	 * @param int $post_id Post id.
	 */
	public function save_post( int $post_id ): void {
		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
			return;
		}
		$this->scan->save_post( $post_id, $this->origin() );
	}

	/**
	 * Refreshes one post when an SEO plugin writes its focus meta outside the insert hooks.
	 *
	 * @param int    $meta_id  Meta row id. Unused.
	 * @param int    $post_id  Post id.
	 * @param string $meta_key Meta key.
	 */
	public function focus_meta( int $meta_id, int $post_id, string $meta_key ): void {
		unset( $meta_id );
		if ( ! in_array( $meta_key, self::FOCUS_META, true ) ) {
			return;
		}
		$this->save_post( $post_id );
	}

	/**
	 * Tombstones a post before WordPress removes it.
	 *
	 * @param int $post_id Post id.
	 */
	public function delete_post( int $post_id ): void {
		$this->scan->delete_post( $post_id, $this->origin() );
	}

	/**
	 * Refreshes the row for a saved term.
	 *
	 * @param int    $term_id  Term id.
	 * @param int    $tt_id    Term taxonomy id. Unused.
	 * @param string $taxonomy Taxonomy name.
	 */
	public function save_term( int $term_id, int $tt_id, string $taxonomy ): void {
		unset( $tt_id );
		$this->scan->save_term( $term_id, $taxonomy, $this->origin() );
	}

	/**
	 * Tombstones a term before WordPress removes it.
	 *
	 * @param int    $term_id  Term id.
	 * @param string $taxonomy Taxonomy name.
	 */
	public function delete_term( int $term_id, string $taxonomy ): void {
		$this->scan->delete_term( $term_id, $taxonomy, $this->origin() );
	}

	/**
	 * Permalinks change every path, so the list is rebuilt and the next sync replaces the target.
	 */
	public function permalinks(): void {
		$this->list->reset_scan();
		$state = $this->list->state();
		if ( $state['enabled'] ) {
			$this->schedule();
		}
	}

	/**
	 * Dashboard view. Opening the screen also reads one page of the scan.
	 *
	 * @return array{enabled: bool, scanning: bool, scanDone: bool, diverged: bool, notice: bool, pageCount: int, error: string}
	 */
	public function status(): array {
		$this->pump();
		$state    = $this->list->state();
		$view     = $this->connections->public_view();
		$scanning = $state['enabled'] && ! $state['scan_done'];
		if ( $scanning ) {
			$this->schedule();
		}
		$diverged = false;
		$error    = '';
		if ( $state['enabled'] && $state['scan_done'] && ! empty( $view['connected'] ) ) {
			try {
				$remote   = $this->connect->with_arc(
					function ( string $env, string $token, string $site_id ) {
						return $this->client->seo_targets( $env, $token, $site_id );
					}
				);
				$arc_hash = (string) ( $remote['hash'] ?? '' );
				$local    = Keyphrase_Hash::of( $state['focus'], $this->list->current_pages() );
				$diverged = $arc_hash !== $local;
			} catch ( Arc_Api_Exception $error_object ) {
				$error = $error_object->getMessage();
			}
		}
		return array(
			'enabled'   => $state['enabled'],
			'scanning'  => $scanning,
			'scanDone'  => $state['scan_done'],
			'diverged'  => $diverged,
			'notice'    => $state['notice'],
			'pageCount' => $state['enabled'] ? $this->list->page_count() : 0,
			'error'     => $error,
		);
	}

	/**
	 * Turns the background list on or off. Off does not change the Arc target.
	 *
	 * @return array{enabled: bool, scanning: bool, scanDone: bool, diverged: bool, notice: bool, pageCount: int, error: string}
	 */
	public function set_enabled( bool $enabled ): array {
		$state = $this->list->state();
		if ( $enabled === $state['enabled'] ) {
			return $this->status();
		}
		if ( ! $enabled && '' !== $state['sync_id'] ) {
			$this->abandon( $state['sync_id'] );
		}
		$this->list->set_enabled( $enabled );
		if ( $enabled ) {
			$this->schedule();
		} else {
			wp_clear_scheduled_hook( self::HOOK );
		}
		return $this->status();
	}

	/**
	 * Sends the delta, or the whole list when Arc has moved, then queues the SEO report.
	 *
	 * @return array{ok: bool, message: string}
	 */
	public function push(): array {
		$state = $this->list->state();
		if ( ! $state['enabled'] || ! $state['scan_done'] ) {
			throw new Arc_Api_Exception( __( 'Keyphrase sync is still reading this site.', 'pendulum-arc' ), 409 );
		}
		$remote   = $this->connect->with_arc(
			function ( string $env, string $token, string $site_id ) {
				return $this->client->seo_targets( $env, $token, $site_id );
			}
		);
		$arc_hash = (string) ( $remote['hash'] ?? '' );
		$plan     = Keyphrase_Push::plan( $state['acked_hash'], $arc_hash, $state['focus'], $state['focus_synced'], $this->list->rows() );
		if ( '' !== $state['sync_id'] ) {
			$this->abandon( $state['sync_id'] );
		}
		$started = $this->connect->with_arc(
			function ( string $env, string $token, string $site_id ) {
				return $this->client->start_seo_target_sync( $env, $token, $site_id, wp_generate_uuid4() );
			}
		);
		$sync_id = (string) ( $started['syncId'] ?? '' );
		if ( '' === $sync_id ) {
			throw new Arc_Api_Exception( __( 'Arc refused the request. Try again in a moment.', 'pendulum-arc' ), 502 );
		}
		$state            = $this->list->state();
		$state['sync_id'] = $sync_id;
		$this->list->write( $state );
		try {
			foreach ( Keyphrase_Push::batches( $plan['upserts'], $plan['deletes'] ) as $batch ) {
				$this->connect->with_arc(
					function ( string $env, string $token, string $site_id ) use ( $sync_id, $batch ) {
						return $this->client->append_seo_target_batch( $env, $token, $site_id, $sync_id, $batch, wp_generate_uuid4() );
					}
				);
			}
			$body = array(
				'mode'     => $plan['mode'],
				'baseHash' => $arc_hash,
				'auto_run' => true,
			);
			if ( $plan['send_focus'] ) {
				$body['focusKeyphrase'] = $plan['focus'];
			}
			$committed = $this->connect->with_arc(
				function ( string $env, string $token, string $site_id ) use ( $sync_id, $body ) {
					return $this->client->commit_seo_target_sync( $env, $token, $site_id, $sync_id, $body, wp_generate_uuid4() );
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			$this->abandon( $sync_id );
			throw $error;
		}
		$focus = $committed['focusKeyphrase'] ?? $state['focus'];
		if ( ! is_string( $focus ) ) {
			$focus = '';
		}
		$this->list->ack( (string) ( $committed['hash'] ?? '' ), $focus );
		return array(
			'ok'      => true,
			'message' => self::result_message( $committed ),
		);
	}

	/**
	 * Reads one page unless another tick is already running.
	 */
	private function pump(): bool {
		$state = $this->list->state();
		if ( ! $state['enabled'] || $state['scan_done'] ) {
			return false;
		}
		if ( get_transient( self::LOCK ) ) {
			return true;
		}
		set_transient( self::LOCK, '1', 30 );
		try {
			return $this->scan->tick( $this->origin() );
		} finally {
			delete_transient( self::LOCK );
		}
	}

	/**
	 * Queues the next page when one is not already waiting.
	 */
	private function schedule(): void {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_single_event( time() + 15, self::HOOK );
		}
	}

	/**
	 * Paired site address. Paths are stored relative to that origin.
	 */
	private function origin(): string {
		$view = $this->connections->public_view();
		$url  = (string) ( $view['siteUrl'] ?? '' );
		if ( '' === $url ) {
			$url = home_url( '/' );
		}
		return $url;
	}

	/**
	 * Drops an open Arc session. A missing session is ignored.
	 */
	private function abandon( string $sync_id ): void {
		if ( '' === $sync_id ) {
			return;
		}
		try {
			$this->connect->with_arc(
				function ( string $env, string $token, string $site_id ) use ( $sync_id ) {
					return $this->client->abandon_seo_target_sync( $env, $token, $site_id, $sync_id, wp_generate_uuid4() );
				}
			);
		} catch ( Arc_Api_Exception $error ) {
			unset( $error );
		}
		$state            = $this->list->state();
		$state['sync_id'] = '';
		$this->list->write( $state );
	}

	/**
	 * Sentence for the dashboard after a commit.
	 *
	 * @param array<string, mixed> $committed Commit response.
	 */
	private static function result_message( array $committed ): string {
		$queue = $committed['queueError'] ?? '';
		if ( is_string( $queue ) && '' !== $queue ) {
			if ( 'PAGE_QUOTA_EXHAUSTED' === $queue ) {
				return __( 'The target was saved. The SEO report was not queued because the page allowance is used.', 'pendulum-arc' );
			}
			if ( 'RUN_ACTIVE' === $queue ) {
				return __( 'The target was saved. An SEO report is already running.', 'pendulum-arc' );
			}
			if ( 'RUN_RATE_EXHAUSTED' === $queue ) {
				return __( 'The target was saved. The SEO report was not queued because the daily limit is reached.', 'pendulum-arc' );
			}
			return __( 'The target was saved. The SEO report was not queued.', 'pendulum-arc' );
		}
		if ( empty( $committed['declared'] ) ) {
			return __( 'Arc already has this target.', 'pendulum-arc' );
		}
		return __( 'Synced. The SEO report is queued.', 'pendulum-arc' );
	}
}
