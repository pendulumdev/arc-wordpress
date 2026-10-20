<?php
/**
 * Reads focus phrases WordPress SEO plugins already stored.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Meta is read even when the plugin that wrote it is inactive.
 */
final class Keyphrase_Read {

	/**
	 * Phrase for one public post.
	 */
	public function post_phrase( int $post_id ): string {
		return Keyphrase_Sources::phrase(
			array(
				'yoast'         => (string) get_post_meta( $post_id, '_yoast_wpseo_focuskw', true ),
				'yoast_premium' => (string) get_post_meta( $post_id, '_yoast_wpseo_focuskeywords', true ),
				'rank_math'     => (string) get_post_meta( $post_id, 'rank_math_focus_keyword', true ),
				'seopress'      => (string) get_post_meta( $post_id, '_seopress_analysis_target_kw', true ),
				'aioseo'        => $this->aioseo_json( 'aioseo_posts', 'post_id', $post_id ),
			)
		);
	}

	/**
	 * Phrase for one public term. Yoast stores terms in an option, not term meta.
	 *
	 * @param array<string, mixed> $yoast_meta wpseo_taxonomy_meta.
	 */
	public function term_phrase( int $term_id, string $taxonomy, array $yoast_meta ): string {
		$yoast = '';
		$tax   = $yoast_meta[ $taxonomy ] ?? null;
		if ( is_array( $tax ) ) {
			$row = $tax[ $term_id ] ?? $tax[ (string) $term_id ] ?? null;
			if ( is_array( $row ) && isset( $row['wpseo_focuskw'] ) && is_string( $row['wpseo_focuskw'] ) ) {
				$yoast = $row['wpseo_focuskw'];
			}
		}
		return Keyphrase_Sources::phrase(
			array(
				'yoast'     => $yoast,
				'rank_math' => (string) get_term_meta( $term_id, 'rank_math_focus_keyword', true ),
				'seopress'  => (string) get_term_meta( $term_id, '_seopress_analysis_target_kw', true ),
				'aioseo'    => $this->aioseo_json( 'aioseo_terms', 'term_id', $term_id ),
			)
		);
	}

	/**
	 * JSON column, or an empty string when that plugin table is absent.
	 */
	private function aioseo_json( string $suffix, string $column, int $object_id ): string {
		global $wpdb;
		$table = $wpdb->prefix . $suffix;
		if ( ! $this->table_exists( $table ) ) {
			return '';
		}
		if ( ! in_array( $column, array( 'post_id', 'term_id' ), true ) ) {
			return '';
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$value = $wpdb->get_var( $wpdb->prepare( "SELECT keyphrases FROM {$table} WHERE {$column} = %d LIMIT 1", $object_id ) );
		return is_string( $value ) ? $value : '';
	}

	/**
	 * Whether a plugin table is installed.
	 */
	private function table_exists( string $table ): bool {
		global $wpdb;
		$like = $wpdb->esc_like( $table );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $like ) );
		return $found === $table;
	}
}
