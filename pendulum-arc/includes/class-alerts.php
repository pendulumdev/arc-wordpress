<?php
/**
 * Alerts for the Arc menu and the top of Arc screens.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reads the keyphrase list without calling Arc. The Connect screen compares the hash.
 */
final class Alerts {

	/**
	 * @var Connection_Store
	 */
	private Connection_Store $connections;

	/**
	 * @var Keyphrase_List
	 */
	private Keyphrase_List $list;

	/**
	 * @param Connection_Store $connections Paired site.
	 * @param Keyphrase_List   $phrases     Local keyphrase rows.
	 */
	public function __construct( Connection_Store $connections, Keyphrase_List $phrases ) {
		$this->connections = $connections;
		$this->list        = $phrases;
	}

	/**
	 * Count shown on the Arc menu. Flash notices are not included.
	 */
	public function menu_count(): int {
		if ( ! current_user_can( 'manage_options' ) ) {
			return 0;
		}
		return Page_Alerts::count( $this->items( null, false ) );
	}

	/**
	 * Alerts for one Arc screen.
	 *
	 * @param array{status?: string, message?: string}|null $flash One-shot notice, or null.
	 * @return array<int, array{id: string, tone: string, message: string, count: bool, href?: string, hrefLabel?: string}>
	 */
	public function for_screen( ?array $flash, bool $on_connect ): array {
		return $this->items( $flash, $on_connect );
	}

	/**
	 * @param array{status?: string, message?: string}|null $flash One-shot notice, or null.
	 * @return array<int, array{id: string, tone: string, message: string, count: bool, href?: string, hrefLabel?: string}>
	 */
	private function items( ?array $flash, bool $on_connect ): array {
		$connected = $this->connections->is_connected();
		return Page_Alerts::collect(
			$flash,
			$this->list->needs_sync( $connected ),
			admin_url( 'admin.php?page=pendulum-arc-connect' ),
			$on_connect,
			$connected && Google_Connection::missing(),
			! $connected
		);
	}
}
