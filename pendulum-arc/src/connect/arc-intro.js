/**
 * WordPress dependencies
 */
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
 */
export function ArcIntro( { portalUrl } ) {
	return (
		<div className="pendulum-arc-intro">
			<MetaBox
				icon="reports"
				title={ __( 'Arc reports', 'pendulum-arc' ) }
			>
				<p className="arc-meta__description">
					{ __(
						'Connect your WordPress website with Arc for reports, issues, and recommendations across Analytics, Accessibility, SEO, AI readability, Security, and Brand cohesion.',
						'pendulum-arc'
					) }
				</p>
				<p className="arc-meta__description">
					{ __(
						'Each report scores the live site, lists what needs attention, and points to the next change. Keep the summary here in WordPress, and open Arc when you want the full report.',
						'pendulum-arc'
					) }
				</p>
				{ portalUrl ? (
					<ArcButton href={ portalUrl } variant="primary">
						{ __( 'Visit Arc', 'pendulum-arc' ) }
					</ArcButton>
				) : null }
			</MetaBox>
		</div>
	);
}
