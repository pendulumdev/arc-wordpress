<?php
/**
 * Cookie consent settings: defaults, sanitizing, renew, and reset.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pure settings rules. Callers pass the default stylesheet.
 */
final class Consent_Settings {

	public const OPTION = 'arc_cookie_consent_settings';

	/**
	 * Nine overlay cells. The first word is the vertical edge.
	 *
	 * @return list<string>
	 */
	public static function positions(): array {
		return array(
			'top-left',
			'top-center',
			'top-right',
			'middle-left',
			'center',
			'middle-right',
			'bottom-left',
			'bottom-center',
			'bottom-right',
		);
	}

	/**
	 * Where the banner is printed. Fixed can be anywhere. Static joins the header or footer.
	 *
	 * @param array<string, mixed> $settings Settings.
	 */
	public static function print_slot( array $settings ): string {
		if ( 'static' === ( $settings['layout'] ?? '' ) ) {
			return 'header' === ( $settings['placement'] ?? '' ) ? 'header' : 'footer';
		}
		return 'fixed';
	}

	/**
	 * Header or footer from a theme template file name. Empty for any other file.
	 */
	public static function template_file_slot( string $path ): string {
		$name = strtolower( basename( str_replace( '\\', '/', $path ) ) );
		if ( 1 === preg_match( '/^header(-[a-z0-9_-]+)?\.php$/', $name ) ) {
			return 'header';
		}
		if ( 1 === preg_match( '/^footer(-[a-z0-9_-]+)?\.php$/', $name ) ) {
			return 'footer';
		}
		return '';
	}

	/**
	 * Header or footer for a template part. A set area wins over the slug.
	 */
	public static function template_part_slot( string $slug, string $area ): string {
		if ( 'header' === $area || 'footer' === $area ) {
			return $area;
		}
		if ( 'header' === $slug || 'footer' === $slug ) {
			return $slug;
		}
		return '';
	}

	/**
	 * Banner classes. Fixed uses the nine-cell overlay. Static is a header or footer bar.
	 *
	 * @param array<string, mixed> $settings Settings.
	 */
	public static function banner_class( array $settings ): string {
		if ( 'static' === ( $settings['layout'] ?? '' ) ) {
			$place = 'header' === ( $settings['placement'] ?? '' ) ? 'header' : 'footer';
			return 'arc-cookie arc-cookie--' . $place . ' arc-cookie--static';
		}
		return 'arc-cookie arc-cookie--fixed arc-cookie--pos-' . self::position( $settings );
	}

	/**
	 * Collapsed button classes. Same placement rule as the banner.
	 *
	 * @param array<string, mixed> $settings Settings.
	 */
	public static function reopen_class( array $settings ): string {
		if ( 'static' === ( $settings['layout'] ?? '' ) ) {
			$place = 'header' === ( $settings['placement'] ?? '' ) ? 'header' : 'footer';
			return 'arc-cookie__reopen arc-cookie--' . $place;
		}
		return 'arc-cookie__reopen arc-cookie--pos-' . self::position( $settings );
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	private static function position( array $settings ): string {
		$position = (string) ( $settings['fixed_position'] ?? 'bottom-left' );
		if ( ! in_array( $position, self::positions(), true ) ) {
			return 'bottom-left';
		}
		return $position;
	}

	/**
	 * Factory settings.
	 *
	 * @param string $css Default stylesheet.
	 * @return array<string, mixed>
	 */
	public static function defaults( string $css ): array {
		return array(
			'consent_version'       => 1,
			'title'                 => __( 'Cookies on this site', 'pendulum-arc' ),
			'content'               => __( 'We use cookies to run this site and, if you allow them, to remember your choices. Accept allows the optional cookies left checked. Read more lists them.', 'pendulum-arc' ),
			'read_more_content'     => __( 'Required cookies are needed for the site to work and stay on. Optional cookies are set only if you leave them checked and click Accept. You can change this later from the cookie button.', 'pendulum-arc' ),
			'cookies'               => array(),
			'dismissed_catalog_ids' => array(),
			'read_more'             => 'modal',
			'read_more_url'         => '',
			'show_cookie_table'     => true,
			'reload_accept'         => false,
			'reload_decline'        => false,
			'after_choice'          => 'collapse',
			'logging_enabled'       => false,
			'disable_identifiable'  => false,
			'disabled'              => false,
			'layout'                => 'fixed',
			'placement'             => 'footer',
			'fixed_position'        => 'bottom-left',
			'disable_styles'        => false,
			'accept_label'          => __( 'Accept', 'pendulum-arc' ),
			'accept_colour'         => '#1a9bb8',
			'decline_label'         => __( 'Decline', 'pendulum-arc' ),
			'decline_colour'        => '#6b7280',
			'read_more_label'       => __( 'Read more', 'pendulum-arc' ),
			'read_more_colour'      => '#6b7280',
			'reopen_icon_id'        => 0,
			'custom_css'            => $css,
		);
	}

	/**
	 * A stored option merged onto the factory settings.
	 *
	 * @param mixed  $stored Stored option.
	 * @param string $css    Default stylesheet.
	 * @return array<string, mixed>
	 */
	public static function normalize( $stored, string $css ): array {
		$defaults = self::defaults( $css );
		if ( ! is_array( $stored ) ) {
			return $defaults;
		}
		return self::sanitize( array_merge( $defaults, $stored ), $css );
	}

	/**
	 * Cleans a settings payload. The consent version is clamped, not trusted
	 * as a permission: the store keeps the saved version on an ordinary save.
	 *
	 * @param array<string, mixed> $input Incoming values.
	 * @param string               $css   Default stylesheet.
	 * @return array<string, mixed>
	 */
	public static function sanitize( array $input, string $css ): array {
		$defaults = self::defaults( $css );
		$cookies  = array();
		$seen     = array();
		$rows     = isset( $input['cookies'] ) && is_array( $input['cookies'] ) ? $input['cookies'] : array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$clean = self::cookie( $row );
			if ( null === $clean ) {
				continue;
			}
			if ( isset( $seen[ $clean['id'] ] ) ) {
				$clean['id'] = self::new_id();
			}
			$seen[ $clean['id'] ] = true;
			$cookies[]            = $clean;
			if ( count( $cookies ) >= 200 ) {
				break;
			}
		}

		return array(
			'consent_version'       => self::version( $input['consent_version'] ?? 1 ),
			'title'                 => self::plain( $input['title'] ?? '', $defaults['title'], 200 ),
			'content'               => self::markup( $input['content'] ?? '', $defaults['content'] ),
			'read_more_content'     => self::markup( $input['read_more_content'] ?? '', $defaults['read_more_content'] ),
			'cookies'               => $cookies,
			'dismissed_catalog_ids' => self::id_list( $input['dismissed_catalog_ids'] ?? array() ),
			'read_more'             => self::choice( $input['read_more'] ?? '', array( 'modal', 'link', 'no' ), 'modal' ),
			'read_more_url'         => self::link( (string) ( $input['read_more_url'] ?? '' ) ),
			'show_cookie_table'     => self::flag( $input['show_cookie_table'] ?? true ),
			'reload_accept'         => self::flag( $input['reload_accept'] ?? false ),
			'reload_decline'        => self::flag( $input['reload_decline'] ?? false ),
			'after_choice'          => self::choice( $input['after_choice'] ?? '', array( 'hide', 'collapse', 'remain' ), 'collapse' ),
			'logging_enabled'       => self::flag( $input['logging_enabled'] ?? false ),
			'disable_identifiable'  => self::flag( $input['disable_identifiable'] ?? false ),
			'disabled'              => self::flag( $input['disabled'] ?? false ),
			'layout'                => self::choice( $input['layout'] ?? '', array( 'fixed', 'static' ), 'fixed' ),
			'placement'             => self::choice( $input['placement'] ?? '', array( 'header', 'footer' ), 'footer' ),
			'fixed_position'        => self::choice( $input['fixed_position'] ?? '', self::positions(), 'bottom-left' ),
			'disable_styles'        => self::flag( $input['disable_styles'] ?? false ),
			'accept_label'          => self::plain( $input['accept_label'] ?? '', $defaults['accept_label'], 80 ),
			'accept_colour'         => self::colour( (string) ( $input['accept_colour'] ?? '' ), '#1a9bb8' ),
			'decline_label'         => self::plain( $input['decline_label'] ?? '', $defaults['decline_label'], 80 ),
			'decline_colour'        => self::colour( (string) ( $input['decline_colour'] ?? '' ), '#6b7280' ),
			'read_more_label'       => self::plain( $input['read_more_label'] ?? '', $defaults['read_more_label'], 80 ),
			'read_more_colour'      => self::colour( (string) ( $input['read_more_colour'] ?? '' ), '#6b7280' ),
			'reopen_icon_id'        => max( 0, (int) ( $input['reopen_icon_id'] ?? 0 ) ),
			'custom_css'            => self::css( array_key_exists( 'custom_css', $input ) ? (string) $input['custom_css'] : $css ),
		);
	}

	/**
	 * Asks every visitor again. Other settings stay.
	 *
	 * @param array<string, mixed> $settings Current settings.
	 * @return array<string, mixed>
	 */
	public static function renew( array $settings ): array {
		$settings['consent_version'] = self::version( $settings['consent_version'] ?? 1 ) + 1;
		return $settings;
	}

	/**
	 * Factory settings, with the version moved on so existing visitors are asked again.
	 *
	 * @param array<string, mixed> $settings Current settings.
	 * @param string               $css      Default stylesheet.
	 * @return array<string, mixed>
	 */
	public static function reset( array $settings, string $css ): array {
		$next                    = self::defaults( $css );
		$next['consent_version'] = self::version( $settings['consent_version'] ?? 1 ) + 1;
		return $next;
	}

	/**
	 * Catalog ids removed from the list stay dismissed. Ids that are present again are forgotten.
	 *
	 * @param array<int, array<string, mixed>> $previous Previous rows.
	 * @param array<int, array<string, mixed>> $next     Saved rows.
	 * @param array<int, string>               $dismissed Already dismissed ids.
	 * @return list<string>
	 */
	public static function merge_dismissed( array $previous, array $next, array $dismissed ): array {
		$gone = array();
		$kept = array();
		foreach ( $previous as $row ) {
			$id = isset( $row['catalog_id'] ) ? (string) $row['catalog_id'] : '';
			if ( '' !== $id ) {
				$gone[ $id ] = true;
			}
		}
		foreach ( $next as $row ) {
			$id = isset( $row['catalog_id'] ) ? (string) $row['catalog_id'] : '';
			if ( '' !== $id ) {
				$kept[ $id ] = true;
				unset( $gone[ $id ] );
			}
		}
		foreach ( array_keys( $gone ) as $id ) {
			$dismissed[] = $id;
		}
		$out = array();
		foreach ( $dismissed as $id ) {
			$id = (string) $id;
			if ( '' === $id || isset( $kept[ $id ] ) || isset( $out[ $id ] ) ) {
				continue;
			}
			$out[ $id ] = true;
		}
		return array_keys( $out );
	}

	/**
	 * Hex colour, or the fallback when the value is not a colour.
	 *
	 * @param string $value    Incoming colour.
	 * @param string $fallback Fallback hex.
	 */
	public static function colour( string $value, string $fallback ): string {
		$value = trim( $value );
		if ( 1 !== preg_match( '/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value ) ) {
			return strtolower( $fallback );
		}
		return strtolower( $value );
	}

	/**
	 * Site path or http(s) URL. Anything else is dropped.
	 *
	 * @param string $value Incoming link.
	 */
	public static function link( string $value ): string {
		$value = trim( $value );
		if ( '' === $value ) {
			return '';
		}
		if ( str_starts_with( $value, '/' ) && ! str_starts_with( $value, '//' ) ) {
			return $value;
		}
		if ( filter_var( $value, FILTER_VALIDATE_URL ) && 1 === preg_match( '#^https?://#i', $value ) ) {
			return $value;
		}
		return '';
	}

	/**
	 * @param array<string, mixed> $row Incoming cookie.
	 * @return array<string, string>|null
	 */
	private static function cookie( array $row ): ?array {
		$name = self::plain( $row['name'] ?? '', '', 200 );
		if ( '' === $name ) {
			return null;
		}
		$id = isset( $row['id'] ) ? (string) $row['id'] : '';
		if ( 1 !== preg_match( '/^[a-z0-9_]{1,64}$/', $id ) ) {
			$id = self::new_id();
		}
		$catalog = isset( $row['catalog_id'] ) ? (string) $row['catalog_id'] : '';
		if ( 1 !== preg_match( '/^[a-z0-9_]{0,64}$/', $catalog ) ) {
			$catalog = '';
		}
		return array(
			'id'          => $id,
			'catalog_id'  => $catalog,
			'name'        => $name,
			'label'       => self::plain( $row['label'] ?? '', $name, 200 ),
			'description' => self::plain( $row['description'] ?? '', '', 2000 ),
			'requirement' => self::choice( $row['requirement'] ?? '', array( 'optional', 'required' ), 'optional' ),
			'type'        => self::plain( $row['type'] ?? '', '', 80 ),
			'scripts'     => self::scripts( (string) ( $row['scripts'] ?? '' ) ),
			'match'       => self::choice( $row['match'] ?? '', array( 'exact', 'prefix' ), 'exact' ),
		);
	}

	/**
	 * Fresh row id.
	 */
	private static function new_id(): string {
		return 'c_' . bin2hex( random_bytes( 4 ) );
	}

	/**
	 * @param mixed $value Incoming version.
	 */
	private static function version( $value ): int {
		$version = (int) $value;
		return $version > 0 ? $version : 1;
	}

	/**
	 * @param mixed $value Incoming flag.
	 */
	private static function flag( $value ): bool {
		return true === $value || 1 === $value || '1' === $value || 'true' === $value;
	}

	/**
	 * @param mixed              $value    Incoming value.
	 * @param array<int, string> $allowed  Allowed values.
	 * @param string             $fallback Fallback.
	 */
	private static function choice( $value, array $allowed, string $fallback ): string {
		$value = (string) $value;
		return in_array( $value, $allowed, true ) ? $value : $fallback;
	}

	/**
	 * @param mixed  $value    Incoming text.
	 * @param string $fallback Used when the text is empty.
	 * @param int    $limit    Maximum length.
	 */
	private static function plain( $value, string $fallback, int $limit ): string {
		$text = trim( self::strip( str_replace( "\0", '', (string) $value ) ) );
		if ( '' === $text ) {
			$text = $fallback;
		}
		if ( strlen( $text ) > $limit ) {
			$text = substr( $text, 0, $limit );
		}
		return $text;
	}

	/**
	 * @param mixed  $value    Incoming HTML.
	 * @param string $fallback Used when the HTML is empty.
	 */
	private static function markup( $value, string $fallback ): string {
		$text = str_replace( "\0", '', (string) $value );
		if ( '' === trim( self::strip( $text ) ) ) {
			return $fallback;
		}
		if ( strlen( $text ) > 50000 ) {
			$text = substr( $text, 0, 50000 );
		}
		return $text;
	}

	/**
	 * @param string $css Incoming CSS.
	 */
	private static function css( string $css ): string {
		$css = str_replace( "\0", '', $css );
		if ( strlen( $css ) > 100000 ) {
			return substr( $css, 0, 100000 );
		}
		return $css;
	}

	/**
	 * @param mixed $value Incoming id list.
	 * @return list<string>
	 */
	private static function id_list( $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}
		$out = array();
		foreach ( $value as $id ) {
			$id = (string) $id;
			if ( 1 !== preg_match( '/^[a-z0-9_]{1,64}$/', $id ) || isset( $out[ $id ] ) ) {
				continue;
			}
			$out[ $id ] = true;
			if ( count( $out ) >= 200 ) {
				break;
			}
		}
		return array_keys( $out );
	}

	/**
	 * Removes tags without calling WordPress. This class is loaded by PHPUnit
	 * before WordPress exists.
	 *
	 * @param string $value Text that may contain tags.
	 */
	private static function strip( string $value ): string {
		$stripped = preg_replace( '/<[^>]*>/', '', $value );
		return is_string( $stripped ) ? $stripped : $value;
	}

	/**
	 * One script handle or URL per line.
	 *
	 * @param string $value Incoming script list.
	 */
	private static function scripts( string $value ): string {
		$value = str_replace( array( "\0", "\r\n", "\r" ), array( '', "\n", "\n" ), $value );
		$kept  = array();
		foreach ( explode( "\n", $value ) as $line ) {
			$line = trim( self::strip( $line ) );
			if ( '' === $line ) {
				continue;
			}
			if ( strlen( $line ) > 500 ) {
				$line = substr( $line, 0, 500 );
			}
			$kept[] = $line;
			if ( count( $kept ) >= 50 ) {
				break;
			}
		}
		$text = implode( "\n", $kept );
		if ( strlen( $text ) > 5000 ) {
			return substr( $text, 0, 5000 );
		}
		return $text;
	}
}
