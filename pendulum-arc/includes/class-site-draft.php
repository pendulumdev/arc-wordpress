<?php
/**
 * Checks the API-key create form before it is sent.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Field error codes for a site draft. Messages are translated elsewhere.
 */
final class Site_Draft {

	public const NAME_SHORT      = 'name_short';
	public const NAME_LONG       = 'name_long';
	public const URL             = 'url';
	public const PROJECT         = 'project';
	public const PROJECT_UNKNOWN = 'project_unknown';

	/**
	 * Field code map. Empty means the draft can be submitted.
	 *
	 * @param string                            $name       Site name.
	 * @param string                            $base_url   Site URL.
	 * @param string                            $project_id Chosen project.
	 * @param array<int, array{id: string, name: string}> $projects Projects the key can use.
	 * @return array<string, string>
	 */
	public static function validate( string $name, string $base_url, string $project_id, array $projects ): array {
		$errors = array();
		$name   = trim( $name );
		$length = strlen( $name );
		if ( $length < 2 ) {
			$errors['name'] = self::NAME_SHORT;
		} elseif ( $length > 120 ) {
			$errors['name'] = self::NAME_LONG;
		}

		if ( null === Site_Origin::normalize( $base_url ) ) {
			$errors['baseUrl'] = self::URL;
		}

		$project_id = trim( $project_id );
		if ( count( $projects ) > 1 && '' === $project_id ) {
			$errors['projectId'] = self::PROJECT;
		} elseif ( '' !== $project_id && ! self::known( $project_id, $projects ) ) {
			$errors['projectId'] = self::PROJECT_UNKNOWN;
		} elseif ( '' === $project_id && count( $projects ) > 0 && ! self::known( $projects[0]['id'], $projects ) ) {
			$errors['projectId'] = self::PROJECT;
		}

		return $errors;
	}

	/**
	 * The id to send. A single project fills an empty choice.
	 *
	 * @param string                            $project_id Chosen project.
	 * @param array<int, array{id: string, name: string}> $projects Projects the key can use.
	 */
	public static function resolve_project( string $project_id, array $projects ): string {
		$project_id = trim( $project_id );
		if ( '' === $project_id && 1 === count( $projects ) ) {
			return $projects[0]['id'];
		}
		return $project_id;
	}

	/**
	 * Whether the id is in the list returned by Arc.
	 *
	 * @param string                            $project_id Chosen project.
	 * @param array<int, array{id: string, name: string}> $projects Projects the key can use.
	 */
	private static function known( string $project_id, array $projects ): bool {
		foreach ( $projects as $project ) {
			if ( $project['id'] === $project_id ) {
				return true;
			}
		}
		return false;
	}
}
