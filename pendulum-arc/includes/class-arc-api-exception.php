<?php
/**
 * Error from an Arc HTTP call.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Safe message and HTTP status from Arc.
 */
final class Arc_Api_Exception extends \RuntimeException {

	/**
	 * Arc status, or 0 when the host could not be reached.
	 *
	 * @var int
	 */
	private int $status_code;

	/**
	 * Arc error code, such as INSUFFICIENT_SCOPE. Empty when Arc sent none.
	 *
	 * @var string
	 */
	private string $error_code;

	/**
	 * @param string $message     Text safe to show an admin.
	 * @param int    $status_code HTTP status, or 0.
	 * @param string $error_code  Arc error code, or empty.
	 */
	public function __construct( string $message, int $status_code = 0, string $error_code = '' ) {
		parent::__construct( $message );
		$this->status_code = $status_code;
		$this->error_code  = $error_code;
	}

	/**
	 * HTTP status, or 0 for a transport failure.
	 */
	public function status_code(): int {
		return $this->status_code;
	}

	/**
	 * Arc error code, or an empty string.
	 */
	public function error_code(): string {
		return $this->error_code;
	}
}
