<?php
/**
 * Field codes from a site draft.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Local validation failure with field codes.
 */
final class Draft_Exception extends \InvalidArgumentException {

	/**
	 * Field to error code.
	 *
	 * @var array<string, string>
	 */
	private array $fields;

	/**
	 * @param array<string, string> $fields Field codes.
	 */
	public function __construct( array $fields ) {
		parent::__construct( 'Invalid site draft.' );
		$this->fields = $fields;
	}

	/**
	 * Field codes.
	 *
	 * @return array<string, string>
	 */
	public function fields(): array {
		return $this->fields;
	}
}
