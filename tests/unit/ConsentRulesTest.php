<?php
/**
 * Cookie consent rules: settings, catalog, scripts, list filter, and log payload.
 *
 * @package ArcWordpress
 */

declare(strict_types=1);

namespace ArcWordpress\Tests;

use ArcWordpress\Consent_Catalog;
use ArcWordpress\Consent_List;
use ArcWordpress\Consent_Log_Payload;
use ArcWordpress\Consent_Scripts;
use ArcWordpress\Consent_Settings;
use PHPUnit\Framework\TestCase;

/**
 * @covers \ArcWordpress\Consent_Settings
 * @covers \ArcWordpress\Consent_Catalog
 * @covers \ArcWordpress\Consent_Scripts
 * @covers \ArcWordpress\Consent_List
 * @covers \ArcWordpress\Consent_Log_Payload
 */
final class ConsentRulesTest extends TestCase {

	public function test_defaults_match_the_banner_factory(): void {
		$settings = Consent_Settings::defaults( 'body{}' );
		self::assertSame( 1, $settings['consent_version'] );
		self::assertSame( 'Cookies on this site', $settings['title'] );
		self::assertSame( 'modal', $settings['read_more'] );
		self::assertTrue( $settings['show_cookie_table'] );
		self::assertFalse( $settings['reload_accept'] );
		self::assertFalse( $settings['reload_decline'] );
		self::assertSame( 'collapse', $settings['after_choice'] );
		self::assertFalse( $settings['logging_enabled'] );
		self::assertFalse( $settings['disable_identifiable'] );
		self::assertFalse( $settings['disabled'] );
		self::assertSame( 'fixed', $settings['layout'] );
		self::assertSame( 'footer', $settings['placement'] );
		self::assertSame( 'bottom-left', $settings['fixed_position'] );
		self::assertFalse( $settings['disable_styles'] );
		self::assertSame( 'Accept', $settings['accept_label'] );
		self::assertSame( '#1a9bb8', $settings['accept_colour'] );
		self::assertSame( 'Decline', $settings['decline_label'] );
		self::assertSame( '#6b7280', $settings['decline_colour'] );
		self::assertSame( 'Read more', $settings['read_more_label'] );
		self::assertSame( '#6b7280', $settings['read_more_colour'] );
		self::assertSame( 'body{}', $settings['custom_css'] );
		self::assertSame( array(), $settings['cookies'] );
	}

	public function test_sanitize_keeps_a_cookie_and_drops_bad_values(): void {
		$clean = Consent_Settings::sanitize(
			array(
				'title'          => '  Hello <b>there</b>  ',
				'read_more'      => 'popup',
				'disabled'       => true,
				'placement'      => 'fixed',
				'fixed_position' => 'nope',
				'accept_colour'  => '#ABC',
				'decline_colour' => 'red',
				'read_more_url'  => 'javascript:alert(1)',
				'custom_css'     => "a{}\0b{}",
				'cookies'        => array(
					array(
						'id'          => 'cat_ga',
						'catalog_id'  => 'ga',
						'name'        => ' _ga ',
						'label'       => '',
						'description' => 'Visitor',
						'requirement' => 'optional',
						'type'        => 'Analytics',
						'scripts'     => " gtag \n\n https://example.com/gtag.js ",
						'match'       => 'prefix',
					),
					array(
						'name' => '',
					),
					'not-a-row',
				),
			),
			'default'
		);

		self::assertSame( 'Hello there', $clean['title'] );
		self::assertSame( 'modal', $clean['read_more'] );
		self::assertTrue( $clean['disabled'] );
		self::assertSame( 'footer', $clean['placement'] );
		self::assertSame( 'bottom-left', $clean['fixed_position'] );
		self::assertSame( '#abc', $clean['accept_colour'] );
		self::assertSame( '#6b7280', $clean['decline_colour'] );
		self::assertSame( '', $clean['read_more_url'] );
		self::assertSame( 'a{}b{}', $clean['custom_css'] );
		self::assertCount( 1, $clean['cookies'] );
		self::assertSame( 'cat_ga', $clean['cookies'][0]['id'] );
		self::assertSame( '_ga', $clean['cookies'][0]['name'] );
		self::assertSame( '_ga', $clean['cookies'][0]['label'] );
		self::assertSame( "gtag\nhttps://example.com/gtag.js", $clean['cookies'][0]['scripts'] );
		self::assertSame( 'prefix', $clean['cookies'][0]['match'] );
	}

	public function test_saved_rem_font_sizes_become_pixels(): void {
		$clean = Consent_Settings::sanitize(
			array(
				'custom_css' => ".arc-cookie-root {\n\tfont-size: 0.875rem;\n}\n.arc-cookie__title {\n\tfont-size: 1rem;\n}\n.arc-cookie__table {\n\tfont-size: 0.8125rem;\n}\n.arc-cookie__cookie {\n\tfont-size: 0.75rem;\n}\n",
			),
			''
		);

		self::assertStringContainsString( 'font-size: 16px;', $clean['custom_css'] );
		self::assertStringContainsString( 'font-size: 18px;', $clean['custom_css'] );
		self::assertStringContainsString( 'font-size: 14px;', $clean['custom_css'] );
		self::assertStringContainsString( 'font-size: 13px;', $clean['custom_css'] );
		self::assertStringNotContainsString( 'rem;', $clean['custom_css'] );
		self::assertStringNotContainsString( 'arc-cookie-layout-lock', $clean['custom_css'] );
	}

	public function test_saved_rem_layout_gains_pixel_lock(): void {
		$clean = Consent_Settings::sanitize(
			array(
				'custom_css' => ".arc-cookie { max-width: 32rem; }\n.arc-cookie__dialog { max-width: 40rem; }\n",
			),
			''
		);

		self::assertStringContainsString( 'arc-cookie-layout-lock', $clean['custom_css'] );
		self::assertStringContainsString( 'max-width: 512px', $clean['custom_css'] );
		self::assertStringContainsString( 'max-width: 640px', $clean['custom_css'] );
		self::assertStringContainsString( 'table-layout: auto', $clean['custom_css'] );

		$again = Consent_Settings::sanitize(
			array(
				'custom_css' => $clean['custom_css'],
			),
			''
		);
		self::assertSame( 1, substr_count( $again['custom_css'], 'arc-cookie-layout-lock' ) );
	}

	public function test_banner_class_follows_layout(): void {
		$fixed = Consent_Settings::defaults( '' );
		self::assertSame(
			'arc-cookie arc-cookie--fixed arc-cookie--pos-bottom-left',
			Consent_Settings::banner_class( $fixed )
		);
		self::assertSame(
			'arc-cookie__reopen arc-cookie--pos-bottom-left',
			Consent_Settings::reopen_class( $fixed )
		);

		$static           = $fixed;
		$static['layout'] = 'static';
		$static['placement'] = 'header';
		self::assertSame(
			'arc-cookie arc-cookie--header arc-cookie--static',
			Consent_Settings::banner_class( $static )
		);
		self::assertSame(
			'arc-cookie__reopen arc-cookie--header',
			Consent_Settings::reopen_class( $static )
		);

		$footer               = $static;
		$footer['placement']  = 'fixed';
		self::assertSame(
			'arc-cookie arc-cookie--footer arc-cookie--static',
			Consent_Settings::banner_class( $footer )
		);
	}

	public function test_print_slot_follows_layout(): void {
		$settings = Consent_Settings::defaults( '' );
		self::assertSame( 'fixed', Consent_Settings::print_slot( $settings ) );

		$settings['layout']    = 'static';
		$settings['placement'] = 'header';
		self::assertSame( 'header', Consent_Settings::print_slot( $settings ) );

		$settings['placement'] = 'footer';
		self::assertSame( 'footer', Consent_Settings::print_slot( $settings ) );

		$settings['placement'] = 'fixed';
		self::assertSame( 'footer', Consent_Settings::print_slot( $settings ) );
	}

	public function test_template_slots_match_header_and_footer_only(): void {
		self::assertSame( 'header', Consent_Settings::template_file_slot( '/theme/header.php' ) );
		self::assertSame( 'header', Consent_Settings::template_file_slot( '/theme/header-front.php' ) );
		self::assertSame( 'footer', Consent_Settings::template_file_slot( '/theme/footer.php' ) );
		self::assertSame( '', Consent_Settings::template_file_slot( '/wp-includes/template-canvas.php' ) );

		self::assertSame( 'header', Consent_Settings::template_part_slot( 'header-large-title', 'header' ) );
		self::assertSame( 'footer', Consent_Settings::template_part_slot( 'footer-columns', 'footer' ) );
		self::assertSame( 'header', Consent_Settings::template_part_slot( 'header', '' ) );
		self::assertSame( '', Consent_Settings::template_part_slot( 'sidebar', 'uncategorized' ) );
	}

	public function test_a_site_path_is_kept_as_the_read_more_link(): void {
		$clean = Consent_Settings::sanitize(
			array( 'read_more_url' => '/privacy' ),
			''
		);
		self::assertSame( '/privacy', $clean['read_more_url'] );
	}

	public function test_renew_bumps_the_version_and_keeps_the_title(): void {
		$settings           = Consent_Settings::defaults( '' );
		$settings['title']  = 'Custom';
		$renewed            = Consent_Settings::renew( $settings );
		self::assertSame( 2, $renewed['consent_version'] );
		self::assertSame( 'Custom', $renewed['title'] );
	}

	public function test_reset_restores_defaults_and_bumps_the_version(): void {
		$settings                          = Consent_Settings::defaults( 'old' );
		$settings['title']                 = 'Custom';
		$settings['cookies']               = array(
			array(
				'id'         => 'cat_ga',
				'catalog_id' => 'ga',
				'name'       => '_ga',
			),
		);
		$settings['dismissed_catalog_ids'] = array( 'gid' );
		$settings['custom_css']            = 'changed';
		$reset                             = Consent_Settings::reset( $settings, 'fresh' );
		self::assertSame( 2, $reset['consent_version'] );
		self::assertSame( 'Cookies on this site', $reset['title'] );
		self::assertSame( array(), $reset['cookies'] );
		self::assertSame( array(), $reset['dismissed_catalog_ids'] );
		self::assertSame( 'fresh', $reset['custom_css'] );
	}

	public function test_removing_a_catalog_row_dismisses_it_until_it_returns(): void {
		$previous = array(
			array( 'catalog_id' => 'ga' ),
			array( 'catalog_id' => 'gid' ),
		);
		$next     = array(
			array( 'catalog_id' => 'gid' ),
		);
		$dismissed = Consent_Settings::merge_dismissed( $previous, $next, array( 'gat' ) );
		self::assertSame( array( 'gat', 'ga' ), $dismissed );

		$back = Consent_Settings::merge_dismissed(
			$previous,
			array(
				array( 'catalog_id' => 'ga' ),
				array( 'catalog_id' => 'gid' ),
			),
			$dismissed
		);
		self::assertSame( array( 'gat' ), $back );
	}

	public function test_catalog_matches_known_cookies_without_swallowing_neighbours(): void {
		self::assertSame(
			array( 'wordpress_logged_in' ),
			Consent_Catalog::matching_ids( array( 'wordpress_logged_in_abc' ), array() )
		);
		self::assertSame(
			array( 'wp_settings_time' ),
			Consent_Catalog::matching_ids( array( 'wp-settings-time-1' ), array() )
		);
		self::assertSame(
			array( 'wp_settings' ),
			Consent_Catalog::matching_ids( array( 'wp-settings-1' ), array() )
		);
		self::assertSame(
			array( 'ga' ),
			Consent_Catalog::matching_ids( array( '_ga' ), array() )
		);
		self::assertSame(
			array( 'ga_container' ),
			Consent_Catalog::matching_ids( array( '_ga_ABC123' ), array() )
		);
		self::assertSame(
			array( 'gat' ),
			Consent_Catalog::matching_ids( array( '_gat_UA_1' ), array() )
		);
		self::assertSame(
			array( 'comment_author_email' ),
			Consent_Catalog::matching_ids( array( 'comment_author_email_abc' ), array() )
		);
		self::assertSame(
			array( 'ga', 'ga_container', 'gid', 'gat' ),
			Consent_Catalog::matching_ids( array(), array( 'gtag' ) )
		);
		self::assertSame(
			array(),
			Consent_Catalog::matching_ids( array( 'unknown_cookie' ), array( 'theme-script' ) )
		);
	}

	public function test_catalog_merge_adds_once_skips_dismissed_and_keeps_edits(): void {
		$existing = array(
			array(
				'id'          => 'cat_ga',
				'catalog_id'  => 'ga',
				'name'        => '_ga',
				'label'       => 'Custom',
				'description' => 'Edited',
				'requirement' => 'optional',
				'type'        => 'Analytics',
				'scripts'     => 'gtag',
				'match'       => 'prefix',
			),
		);
		$first = Consent_Catalog::merge( $existing, array(), array( '_ga', '_gid' ), array() );
		self::assertTrue( $first['changed'] );
		self::assertSame( 'Custom', $first['rows'][0]['label'] );
		self::assertSame( 'gtag', $first['rows'][0]['scripts'] );
		self::assertSame( 'gid', $first['rows'][1]['catalog_id'] );

		$again = Consent_Catalog::merge( $first['rows'], array(), array( '_ga', '_gid' ), array() );
		self::assertFalse( $again['changed'] );
		self::assertCount( 2, $again['rows'] );

		$dismissed = Consent_Catalog::merge( array(), array( 'ga' ), array( '_ga' ), array() );
		self::assertFalse( $dismissed['changed'] );
		self::assertSame( array(), $dismissed['rows'] );
	}

	public function test_script_tags_block_only_optional_rows_that_are_not_allowed(): void {
		$cookies = array(
			array(
				'id'          => 'cat_login',
				'requirement' => 'required',
				'scripts'     => "jquery\n",
			),
			array(
				'id'          => 'cat_ga',
				'requirement' => 'optional',
				'scripts'     => "gtag\nhttps://www.googletagmanager.com/gtag/js",
			),
		);
		$tag     = '<script src="https://www.googletagmanager.com/gtag/js?id=G-1" id="gtag-js"></script>';
		$blocked = Consent_Scripts::rewrite_tag( $tag, 'other', 'https://www.googletagmanager.com/gtag/js?id=G-1', $cookies, array() );
		self::assertStringContainsString( 'type="text/plain"', $blocked );
		self::assertStringContainsString( 'data-arc-cookie="cat_ga"', $blocked );
		self::assertStringContainsString( 'data-arc-script-type="text/javascript"', $blocked );

		$allowed = Consent_Scripts::rewrite_tag( $tag, 'other', 'https://www.googletagmanager.com/gtag/js?id=G-1', $cookies, array( 'cat_ga' ) );
		self::assertSame( $tag, $allowed );

		$jquery = '<script src="/jquery.js" id="jquery-js"></script>';
		self::assertSame(
			$jquery,
			Consent_Scripts::rewrite_tag( $jquery, 'jquery', '/jquery.js', $cookies, array() )
		);

		$theme = '<script src="/theme.js" id="theme-js"></script>';
		self::assertSame(
			$theme,
			Consent_Scripts::rewrite_tag( $theme, 'theme', '/theme.js', $cookies, array() )
		);

		$inline = "<script id='gtag-js-after'>\nwindow.dataLayer = [];\n</script>";
		self::assertStringContainsString(
			'data-arc-cookie="cat_ga"',
			Consent_Scripts::rewrite_tag( $inline, 'gtag', '', $cookies, array() )
		);
	}

	public function test_a_required_match_wins_over_an_optional_match(): void {
		$cookies = array(
			array(
				'id'          => 'cat_ga',
				'requirement' => 'optional',
				'scripts'     => 'gtag',
			),
			array(
				'id'          => 'cat_login',
				'requirement' => 'required',
				'scripts'     => 'gtag',
			),
		);
		$tag     = '<script src="/gtag.js" id="gtag-js"></script>';
		self::assertSame(
			$tag,
			Consent_Scripts::rewrite_tag( $tag, 'gtag', '/gtag.js', $cookies, array() )
		);
	}

	public function test_the_cookie_list_filters_by_optional_and_type(): void {
		$rows = array(
			array(
				'requirement' => 'optional',
				'type'        => 'Analytics',
				'name'        => '_ga',
			),
			array(
				'requirement' => 'required',
				'type'        => 'Necessary',
				'name'        => 'wordpress_logged_in_',
			),
			array(
				'requirement' => 'optional',
				'type'        => 'Comments',
				'name'        => 'comment_author_',
			),
		);
		self::assertCount( 2, Consent_List::filter( $rows, 'yes', '' ) );
		self::assertCount( 1, Consent_List::filter( $rows, 'no', '' ) );
		self::assertSame( '_ga', Consent_List::filter( $rows, '', 'analytics' )[0]['name'] );
		self::assertSame( 'comment_author_', Consent_List::filter( $rows, 'yes', 'comments' )[0]['name'] );
		self::assertCount( 3, Consent_List::filter( $rows, '', '' ) );
	}

	public function test_the_log_drops_identifiable_fields_and_rejects_unknown_ids(): void {
		$rows = array(
			array(
				'id'          => 'cat_login',
				'name'        => 'wordpress_logged_in_',
				'requirement' => 'required',
			),
			array(
				'id'          => 'cat_ga',
				'name'        => '_ga',
				'requirement' => 'optional',
			),
		);

		$hidden = Consent_Log_Payload::build( true, true, 'accept', array( 'cat_ga' ), $rows, '203.0.113.5', 'Agent' );
		self::assertNotNull( $hidden );
		self::assertSame( '', $hidden['ip'] );
		self::assertSame( '', $hidden['user_agent'] );
		self::assertSame( array( 'wordpress_logged_in_', '_ga' ), $hidden['allowed'] );
		self::assertSame( array(), $hidden['refused'] );

		$decline = Consent_Log_Payload::build( true, false, 'decline', array( 'cat_ga' ), $rows, '203.0.113.5', 'Agent' );
		self::assertNotNull( $decline );
		self::assertSame( '203.0.113.5', $decline['ip'] );
		self::assertSame( 'Agent', $decline['user_agent'] );
		self::assertSame( array( 'wordpress_logged_in_' ), $decline['allowed'] );
		self::assertSame( array( '_ga' ), $decline['refused'] );

		self::assertNull( Consent_Log_Payload::build( false, false, 'accept', array(), $rows, '203.0.113.5', 'Agent' ) );
		self::assertNull( Consent_Log_Payload::build( true, false, 'accept', array( 'missing' ), $rows, '', '' ) );
		self::assertNull( Consent_Log_Payload::build( true, false, 'nope', array(), $rows, '', '' ) );
	}
}
