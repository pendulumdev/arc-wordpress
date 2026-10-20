/**
 * WordPress dependencies
 */
import { createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { MetaBox } from '../meta';
import { ArcButton } from '../ui/button';

/**
 * Sales pitch for Arc reports. Stays above the connect and connection cards.
 *
 * @param {Object} props
 * @param {string} [props.portalUrl]
 * @param {string} [props.arcMark]
 * @param {string} [props.pendulumMark]
 */
export function ArcIntro( { portalUrl, arcMark, pendulumMark } ) {
	return (
		<MetaBox icon="reports" title={ __( 'Arc reports', 'pendulum-arc' ) }>
			<p className="arc-meta__description">
				{ createInterpolateElement(
					__(
						"Connect your WordPress website with Arc for reports, issues, and recommendations across <strong>Analytics</strong>, <strong>Accessibility</strong>, <strong>SEO</strong>, <strong>AI readability</strong>, <strong>Security</strong>, and <strong>Brand cohesion</strong>. Each report scores the live site, lists what needs attention, and points to the next change. View report summaries directly in WordPress, and open Arc when you need to create automations, improve your website's scores or manage multiple sites.",
						'pendulum-arc'
					),
					{
						strong: <strong />,
					}
				) }
			</p>
			<div className="pendulum-arc-intro__actions">
				{ portalUrl ? (
					<ArcButton
						href={ portalUrl }
						variant="connect"
						mark={ arcMark }
					>
						{ __( 'Visit Arc', 'pendulum-arc' ) }
					</ArcButton>
				) : null }
				<ArcButton
					href="https://pendulumdev.co.uk"
					variant="connect"
					mark={ pendulumMark }
				>
					{ __( 'Maintained by pendulum', 'pendulum-arc' ) }
				</ArcButton>
			</div>
		</MetaBox>
	);
}
