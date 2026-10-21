/**
 * WordPress dependencies
 */
import { createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { MetaBox } from '../meta';
import { ArcButton } from '../ui/button';
import { SetupSteps } from './setup-steps';

/**
 * Sales pitch for Arc reports. Stays above the connect and connection cards.
 *
 * @param {Object}     props
 * @param {string}     [props.portalUrl]
 * @param {string}     [props.arcMark]
 * @param {string}     [props.pendulumMark]
 * @param {string}     [props.userName]
 * @param {boolean}    [props.connected]
 * @param {() => void} [props.onConnect]
 * @param {() => void} [props.onAnalytics]
 * @param {boolean}    [props.connectBusy]
 * @param {boolean}    [props.analyticsBusy]
 */
export function ArcIntro( {
	portalUrl,
	arcMark,
	pendulumMark,
	userName = '',
	connected = false,
	onConnect,
	onAnalytics,
	connectBusy = false,
	analyticsBusy = false,
} ) {
	const greeting = userName
		? sprintf(
				/* translators: %s: the current user's display name. */
				__( 'Hi %s, welcome to Arc', 'pendulum-arc' ),
				userName
			)
		: __( 'Welcome to Arc', 'pendulum-arc' );

	return (
		<MetaBox
			icon="reports"
			title={ __(
				'Expand your dashboard with Arc Analytics',
				'pendulum-arc'
			) }
		>
			<p className="arc-meta__lead">
				<strong>{ greeting }</strong>
			</p>
			<p className="arc-meta__description">
				{ createInterpolateElement(
					__(
						"Connect your WordPress website with Arc for reports, issues, and recommendations across <strong>Analytics</strong>, <strong>Accessibility</strong>, <strong>SEO</strong>, <strong>AI readability</strong>, <strong>Security</strong>, and <strong>Brand cohesion</strong>. Each report scores the live site, lists what needs attention, and points to fixes. View report summaries directly in WordPress, and open Arc when you need to create automations, improve your website's scores or manage multiple sites.",
						'pendulum-arc'
					),
					{
						strong: <strong />,
					}
				) }
			</p>
			<SetupSteps
				connected={ connected }
				onConnect={ onConnect }
				onAnalytics={ onAnalytics }
				connectBusy={ connectBusy }
				analyticsBusy={ analyticsBusy }
			/>
			<p className="arc-meta__description">
				{ createInterpolateElement(
					__(
						'<strong>Visit Arc</strong> to find out more, and learn how Arc can help you manage your digital landscape. <strong>Visit Pendulum</strong> for web development and AI workflow insights.',
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
					href="https://pendulumdev.co.uk/full-stack-waffle"
					variant="connect"
					mark={ pendulumMark }
				>
					{ __( 'Maintained by pendulum', 'pendulum-arc' ) }
				</ArcButton>
			</div>
		</MetaBox>
	);
}
