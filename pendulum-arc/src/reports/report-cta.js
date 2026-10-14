/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { GenerateReports } from './generate-menu';
import { ArcButton } from '../ui/button';
import { Icon } from '../ui/icon';

/**
 * Warning card used at the close of a report, and when a summary is not
 * available yet. The button opens Arc.
 *
 * @param {Object}                    props
 * @param {string}                    [props.href]
 * @param {string}                    [props.label]
 * @param {import('react').ReactNode} props.children
 */
/**
 * Top-of-dashboard notice when the selected report has no succeeded run.
 * The action is the portal Generate menu.
 *
 * @param {Object}  props
 * @param {boolean} props.generating
 * @param {string}  [props.connectUrl] WordPress Connect settings page.
 */
export function GenerationNotice( { generating, connectUrl } ) {
	const [ active, setActive ] = useState( false );
	const live = generating || active;
	return (
		<div className="arc-report-alert arc-report-alert--error" role="alert">
			<p>
				<Icon size={ 18 } strokeWidth={ 2 }>
					<circle cx="12" cy="12" r="10" />
					<path d="m15 9-6 6" />
					<path d="m9 9 6 6" />
				</Icon>
				<span>
					{ live
						? __(
								'Reports are currently generating.',
								'pendulum-arc'
							)
						: __( 'Reports need generating.', 'pendulum-arc' ) }
				</span>
			</p>
			<GenerateReports
				onActivity={ setActive }
				connectUrl={ connectUrl }
			/>
		</div>
	);
}

export function ReportCta( { href, label, children } ) {
	return (
		<div className="arc-report-alert">
			<p>
				<Icon size={ 18 } strokeWidth={ 2 }>
					<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
				</Icon>
				<span>
					{ children ||
						__(
							'Issue management and the full report are viewable in Arc. Automate fixes, review issues, and employ agents to help you manage your digital landscape.',
							'pendulum-arc'
						) }
				</span>
			</p>
			{ href ? (
				<ArcButton href={ href } variant="connect">
					{ label ||
						__( 'Open the full report in Arc', 'pendulum-arc' ) }
				</ArcButton>
			) : null }
		</div>
	);
}
