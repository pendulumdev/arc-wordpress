<?php
/**
 * Front banner, shortcodes, and inert optional scripts.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Prints the banner and blocks optional scripts in the HTML.
 * The HTML does not vary by the visitor, so a page cache stays safe.
 * The front script promotes the scripts the consent cookie allows.
 */
final class Consent_Front {

	public const COOKIE = 'arc_cookie_consent';

	/**
	 * @var Consent_Store
	 */
	private Consent_Store $store;

	/**
	 * Whether the banner markup has already been printed.
	 *
	 * @var bool
	 */
	private bool $printed = false;

	public function __construct() {
		$this->store = new Consent_Store();
	}

	/**
	 * Hooks.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'shortcodes' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'detect' ), 999 );
		add_action( 'wp_enqueue_scripts', array( $this, 'assets' ) );
		add_filter( 'render_block_core/template-part', array( $this, 'markup_part' ), 10, 2 );
		add_action( 'wp_after_load_template', array( $this, 'markup_template' ) );
		add_action( 'wp_footer', array( $this, 'markup_footer' ), 5 );
		add_action( 'wp_footer', array( $this, 'behaviour' ), 6 );
		add_filter( 'script_loader_tag', array( $this, 'script_tag' ), 10, 3 );
	}

	/**
	 * Shortcodes.
	 */
	public function shortcodes(): void {
		add_shortcode( 'arc_cookie_title', array( $this, 'shortcode_title' ) );
		add_shortcode( 'arc_cookie_content', array( $this, 'shortcode_content' ) );
		add_shortcode( 'arc_cookie_read_more', array( $this, 'shortcode_read_more' ) );
		add_shortcode( 'arc_cookie_list', array( $this, 'shortcode_list' ) );
		add_shortcode( 'arc_cookie_accept', array( $this, 'shortcode_accept' ) );
		add_shortcode( 'arc_cookie_decline', array( $this, 'shortcode_decline' ) );
		add_shortcode( 'arc_cookie_read_more_button', array( $this, 'shortcode_read_more_button' ) );
	}

	/**
	 * Adds catalog rows from this request.
	 */
	public function detect(): void {
		if ( is_admin() || $this->suppressed() ) {
			return;
		}
		$this->store->detect( Consent_Store::request_cookie_names(), self::queued_handles() );
	}

	/**
	 * Stylesheet, unless styles are disabled. Banner behaviour is printed in the footer.
	 */
	public function assets(): void {
		if ( ! $this->visible() ) {
			return;
		}
		$settings = $this->store->settings();
		if ( ! empty( $settings['disable_styles'] ) ) {
			return;
		}
		wp_register_style( 'arc-cookie-consent', false, array(), ARC_WORDPRESS_VERSION );
		wp_enqueue_style( 'arc-cookie-consent' );
		wp_add_inline_style( 'arc-cookie-consent', (string) $settings['custom_css'] );
	}

	/**
	 * Banner behaviour. Inline, so a blocked cookie-consent.js URL cannot leave the buttons dead.
	 */
	public function behaviour(): void {
		if ( ! $this->visible() ) {
			return;
		}
		$path = ARC_WORDPRESS_DIR . 'assets/arc-consent.js';
		if ( ! is_readable( $path ) ) {
			return;
		}
		// Local plugin file, not a remote request.
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$js = file_get_contents( $path );
		if ( ! is_string( $js ) || '' === trim( $js ) ) {
			return;
		}
		$js       = str_ireplace( '</script', '<\/script', $js );
		$settings = $this->store->settings();
		wp_print_inline_script_tag(
			'var arcCookieConsent = ' . wp_json_encode( $this->config( $settings ) ) . ";\n" . $js,
			array(
				'id' => 'pendulum-arc-consent-js',
			)
		);
	}

	/**
	 * Static banners join the end of the header or footer template part.
	 *
	 * @param string               $content Rendered part.
	 * @param array<string, mixed> $block   Parsed block.
	 */
	public function markup_part( string $content, array $block ): string {
		if ( $this->printed || ! $this->visible() ) {
			return $content;
		}
		$settings = $this->store->settings();
		$slot     = Consent_Settings::print_slot( $settings );
		if ( 'header' !== $slot && 'footer' !== $slot ) {
			return $content;
		}
		$attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$slug  = isset( $attrs['slug'] ) ? (string) $attrs['slug'] : '';
		$area  = isset( $attrs['area'] ) ? (string) $attrs['area'] : '';
		if ( '' === $area && '' !== $slug ) {
			$area = $this->part_area( $slug, isset( $attrs['theme'] ) ? (string) $attrs['theme'] : '' );
		}
		if ( Consent_Settings::template_part_slot( $slug, $area ) !== $slot ) {
			return $content;
		}
		$this->printed = true;
		return $content . $this->html( $settings );
	}

	/**
	 * Classic themes: a static header is printed when header.php finishes.
	 *
	 * @param string $path Template path.
	 */
	public function markup_template( string $path ): void {
		if ( $this->printed || ! $this->visible() ) {
			return;
		}
		$settings = $this->store->settings();
		if ( 'header' !== Consent_Settings::print_slot( $settings ) ) {
			return;
		}
		if ( 'header' !== Consent_Settings::template_file_slot( $path ) || ! $this->is_theme_file( $path ) ) {
			return;
		}
		$this->markup();
	}

	/**
	 * Fixed banners, a classic static footer, and a fallback when the theme printed neither.
	 * Classic footer.php calls this hook at the end of the file, before the body closes.
	 */
	public function markup_footer(): void {
		$this->markup();
	}

	/**
	 * Area stored for a template part. The block often only has a slug.
	 */
	private function part_area( string $slug, string $theme ): string {
		if ( ! function_exists( 'get_block_template' ) ) {
			return '';
		}
		if ( '' === $theme ) {
			$theme = (string) get_stylesheet();
		}
		$part = get_block_template( $theme . '//' . $slug, 'wp_template_part' );
		if ( ! is_object( $part ) || ! isset( $part->area ) ) {
			return '';
		}
		return (string) $part->area;
	}

	/**
	 * Header files outside the active theme are ignored.
	 */
	private function is_theme_file( string $path ): bool {
		$path  = wp_normalize_path( $path );
		$roots = array( get_stylesheet_directory(), get_template_directory() );
		foreach ( $roots as $root ) {
			$root = wp_normalize_path( (string) $root );
			if ( '' !== $root && str_starts_with( $path, trailingslashit( $root ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Prints the banner once.
	 */
	public function markup(): void {
		if ( $this->printed || ! $this->visible() ) {
			return;
		}
		$this->printed = true;
		$this->out( $this->html( $this->store->settings() ) );
	}

	/**
	 * Optional scripts are always inert. Allowed ones are turned back on in the browser.
	 *
	 * @param string $tag    Script tag.
	 * @param string $handle Handle.
	 * @param string $src    URL.
	 */
	public function script_tag( string $tag, string $handle, string $src ): string {
		if ( is_admin() || $this->suppressed() ) {
			return $tag;
		}
		return Consent_Scripts::rewrite_tag( $tag, $handle, $src, $this->store->settings()['cookies'], array() );
	}

	/**
	 * @return string
	 */
	public function shortcode_title(): string {
		return esc_html( (string) $this->store->settings()['title'] );
	}

	/**
	 * @return string
	 */
	public function shortcode_content(): string {
		return wp_kses_post( (string) $this->store->settings()['content'] );
	}

	/**
	 * @return string
	 */
	public function shortcode_read_more(): string {
		return wp_kses_post( (string) $this->store->settings()['read_more_content'] );
	}

	/**
	 * @param array<string, string>|string $atts Attributes.
	 */
	public function shortcode_list( $atts ): string {
		$atts = shortcode_atts(
			array(
				'optional' => '',
				'type'     => '',
			),
			is_array( $atts ) ? $atts : array(),
			'arc_cookie_list'
		);
		$rows = Consent_List::filter(
			$this->store->settings()['cookies'],
			(string) $atts['optional'],
			(string) $atts['type']
		);
		return $this->table( $rows );
	}

	/**
	 * @param array<string, string>|string $atts Attributes.
	 */
	public function shortcode_accept( $atts ): string {
		return $this->choice_button( 'accept', $atts );
	}

	/**
	 * @param array<string, string>|string $atts Attributes.
	 */
	public function shortcode_decline( $atts ): string {
		return $this->choice_button( 'decline', $atts );
	}

	/**
	 * @param array<string, string>|string $atts Attributes.
	 */
	public function shortcode_read_more_button( $atts ): string {
		$settings = $this->store->settings();
		if ( 'no' === $settings['read_more'] ) {
			return '';
		}
		if ( 'link' === $settings['read_more'] ) {
			$url = (string) $settings['read_more_url'];
			if ( '' === $url ) {
				return '';
			}
			return $this->choice_button( 'read-more', $atts, $url );
		}
		return $this->choice_button( 'read-more', $atts );
	}

	/**
	 * @return list<string>
	 */
	private static function queued_handles(): array {
		$scripts = wp_scripts();
		if ( ! $scripts instanceof \WP_Scripts ) {
			return array();
		}
		$handles = array();
		foreach ( $scripts->queue as $handle ) {
			$handles[] = (string) $handle;
		}
		return $handles;
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 * @return array<string, mixed>
	 */
	private function config( array $settings ): array {
		$cookies = array();
		foreach ( $settings['cookies'] as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$cookies[] = array(
				'id'          => (string) $row['id'],
				'name'        => (string) $row['name'],
				'match'       => (string) $row['match'],
				'requirement' => (string) $row['requirement'],
			);
		}
		return array(
			'version'       => (int) $settings['consent_version'],
			'cookieName'    => self::COOKIE,
			'maxAge'        => 180 * DAY_IN_SECONDS,
			'secure'        => is_ssl(),
			'cookies'       => $cookies,
			'reloadAccept'  => (bool) $settings['reload_accept'],
			'reloadDecline' => (bool) $settings['reload_decline'],
			'afterChoice'   => (string) $settings['after_choice'],
			'logging'       => (bool) $settings['logging_enabled'],
			'logUrl'        => rest_url( 'pendulum-arc/v1/consent/log' ),
		);
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	private function html( array $settings ): string {
		$title = (string) $settings['title'];
		$style = sprintf(
			'--arc-cookie-accept:%1$s;--arc-cookie-decline:%2$s;--arc-cookie-more:%3$s;',
			esc_attr( (string) $settings['accept_colour'] ),
			esc_attr( (string) $settings['decline_colour'] ),
			esc_attr( (string) $settings['read_more_colour'] )
		);
		$html  = '<div class="arc-cookie-root" style="' . esc_attr( $style ) . '" data-arc-cookie-root>';
		$html .= '<div class="' . esc_attr( $this->banner_class( $settings ) ) . '" data-arc-cookie-banner role="region" aria-labelledby="arc-cookie-title">';
		$html .= '<h2 id="arc-cookie-title" class="arc-cookie__title">' . esc_html( $title ) . '</h2>';
		$html .= '<div class="arc-cookie__content">' . wp_kses_post( (string) $settings['content'] ) . '</div>';
		$html .= '<div class="arc-cookie__actions">' . $this->actions( $settings ) . '</div>';
		$html .= '</div>';
		$html .= $this->reopen( $settings, $title );
		$html .= $this->modal( $settings, $title );
		$html .= '</div>';
		return $html;
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	private function banner_class( array $settings ): string {
		return Consent_Settings::banner_class( $settings );
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 * @param string               $title    Banner title, used as the button name.
	 */
	private function reopen( array $settings, string $title ): string {
		$class = Consent_Settings::reopen_class( $settings );
		$url   = $this->store->icon_url( (int) $settings['reopen_icon_id'] );
		if ( '' === $url ) {
			$url = plugins_url( 'assets/cookie-icon.svg', ARC_WORDPRESS_FILE );
		}
		return '<button type="button" class="' . esc_attr( $class ) . '" data-arc-cookie-reopen hidden aria-label="' . esc_attr( $title ) . '">'
			. '<img src="' . esc_url( $url ) . '" alt="" width="22" height="22" />'
			. '</button>';
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 * @param string               $title    Dialog title.
	 */
	private function modal( array $settings, string $title ): string {
		if ( 'modal' !== $settings['read_more'] ) {
			return '';
		}
		$html  = '<div class="arc-cookie__modal" data-arc-cookie-modal hidden>';
		$html .= '<button type="button" class="arc-cookie__backdrop" data-arc-cookie-action="close" aria-label="' . esc_attr__( 'Close', 'pendulum-arc' ) . '"></button>';
		$html .= '<div class="arc-cookie__dialog" role="dialog" aria-modal="true" aria-labelledby="arc-cookie-more-title">';
		$html .= '<h2 id="arc-cookie-more-title" class="arc-cookie__title">' . esc_html( $title ) . '</h2>';
		$html .= '<div class="arc-cookie__content">' . wp_kses_post( (string) $settings['read_more_content'] ) . '</div>';
		if ( ! empty( $settings['show_cookie_table'] ) ) {
			$html .= $this->table( $settings['cookies'] );
		}
		$html .= '<div class="arc-cookie__actions">';
		$html .= $this->button( 'accept', (string) $settings['accept_label'], 'accept', '--arc-cookie-accept', (string) $settings['accept_colour'] );
		$html .= $this->button( 'decline', (string) $settings['decline_label'], 'decline', '--arc-cookie-decline', (string) $settings['decline_colour'] );
		$html .= '</div></div></div>';
		return $html;
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	private function actions( array $settings ): string {
		$html  = $this->button( 'accept', (string) $settings['accept_label'], 'accept', '--arc-cookie-accept', (string) $settings['accept_colour'] );
		$html .= $this->button( 'decline', (string) $settings['decline_label'], 'decline', '--arc-cookie-decline', (string) $settings['decline_colour'] );
		$html .= $this->read_more_control( $settings );
		return $html;
	}

	/**
	 * @param array<string, mixed> $settings Settings.
	 */
	private function read_more_control( array $settings ): string {
		$label  = (string) $settings['read_more_label'];
		$colour = (string) $settings['read_more_colour'];
		if ( 'modal' === $settings['read_more'] ) {
			return $this->button( 'read-more', $label, 'more', '--arc-cookie-more', $colour );
		}
		if ( 'link' === $settings['read_more'] && '' !== (string) $settings['read_more_url'] ) {
			return $this->button( 'read-more', $label, 'more', '--arc-cookie-more', $colour, (string) $settings['read_more_url'] );
		}
		return '';
	}

	/**
	 * @param array<int, array<string, mixed>> $rows Cookie rows.
	 */
	private function table( array $rows ): string {
		if ( array() === $rows ) {
			return '';
		}
		$html  = '<table class="arc-cookie__table"><thead><tr>';
		$html .= '<th scope="col">' . esc_html__( 'Choice', 'pendulum-arc' ) . '</th>';
		$html .= '<th scope="col">' . esc_html__( 'Cookie', 'pendulum-arc' ) . '</th>';
		$html .= '<th scope="col">' . esc_html__( 'About', 'pendulum-arc' ) . '</th>';
		$html .= '<th scope="col">' . esc_html__( 'Type', 'pendulum-arc' ) . '</th>';
		$html .= '</tr></thead><tbody>';
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$optional = 'optional' === ( $row['requirement'] ?? '' );
			$html    .= '<tr>';
			$html    .= '<td>';
			if ( $optional ) {
				$html .= '<input class="arc-cookie__choice" type="checkbox" checked data-arc-cookie-choice="' . esc_attr( (string) $row['id'] ) . '" aria-label="' . esc_attr( (string) $row['label'] ) . '" />';
			} else {
				$html .= esc_html__( 'Required', 'pendulum-arc' );
			}
			$html .= '</td>';
			$html .= '<td><span class="arc-cookie__name">' . esc_html( (string) $row['label'] ) . '</span>';
			$html .= '<span class="arc-cookie__cookie">' . esc_html( (string) $row['name'] ) . '</span></td>';
			$html .= '<td>' . esc_html( (string) ( $row['description'] ?? '' ) ) . '</td>';
			$html .= '<td>' . esc_html( (string) ( $row['type'] ?? '' ) ) . '</td>';
			$html .= '</tr>';
		}
		$html .= '</tbody></table>';
		return $html;
	}

	/**
	 * @param string                           $action Action.
	 * @param array<string, string>|string     $atts   Shortcode attributes.
	 * @param string                           $href   Set for a link button.
	 */
	private function choice_button( string $action, $atts, string $href = '' ): string {
		$settings = $this->store->settings();
		$fields   = array(
			'accept'    => array( 'accept_label', 'accept_colour', 'accept', '--arc-cookie-accept' ),
			'decline'   => array( 'decline_label', 'decline_colour', 'decline', '--arc-cookie-decline' ),
			'read-more' => array( 'read_more_label', 'read_more_colour', 'more', '--arc-cookie-more' ),
		);
		$field    = $fields[ $action ];
		$atts     = shortcode_atts(
			array(
				'label'  => '',
				'colour' => '',
			),
			is_array( $atts ) ? $atts : array(),
			'arc_cookie_' . $action
		);
		$label    = trim( wp_strip_all_tags( (string) $atts['label'] ) );
		if ( '' === $label ) {
			$label = (string) $settings[ $field[0] ];
		}
		$colour = Consent_Settings::colour( (string) $atts['colour'], (string) $settings[ $field[1] ] );
		return $this->button( $action, $label, $field[2], $field[3], $colour, $href );
	}

	/**
	 * @param string $action   accept, decline, or read-more.
	 * @param string $label    Button label.
	 * @param string $variant  accept, decline, or more.
	 * @param string $variable CSS variable name.
	 * @param string $colour   Hex colour.
	 * @param string $href     When set, the control is a link.
	 */
	private function button( string $action, string $label, string $variant, string $variable, string $colour, string $href = '' ): string {
		$class = 'arc-cookie__button arc-cookie__button--' . $variant;
		$style = $variable . ':' . $colour;
		if ( '' !== $href ) {
			return '<a class="' . esc_attr( $class ) . '" style="' . esc_attr( $style ) . '" href="' . esc_url( $href ) . '">' . esc_html( $label ) . '</a>';
		}
		return '<button type="button" class="' . esc_attr( $class ) . '" style="' . esc_attr( $style ) . '" data-arc-cookie-action="' . esc_attr( $action ) . '">' . esc_html( $label ) . '</button>';
	}

	/**
	 * Disable turns the banner and the script changes off. Settings stay saved.
	 */
	private function suppressed(): bool {
		return ! empty( $this->store->settings()['disabled'] );
	}

	/**
	 * The banner is a front-page element.
	 */
	private function visible(): bool {
		if ( $this->suppressed() ) {
			return false;
		}
		if ( is_admin() || is_feed() || wp_doing_ajax() || wp_doing_cron() ) {
			return false;
		}
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return false;
		}
		return true;
	}

	/**
	 * Prints markup assembled from escaped values.
	 *
	 * @param string $html Escaped markup.
	 */
	private function out( string $html ): void {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- values are escaped in the builders.
		echo $html;
	}
}
