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
 * Permanent dashboard notice. Idle until a run is queued or running.
 *
 * @param {Object}     props
 * @param {string}     [props.connectUrl] WordPress Connect settings page.
 * @param {boolean}    [props.complete]   Every service already has a report.
 * @param {() => void} [props.onSettled]  Called when a service leaves in-flight.
 */
export function GenerationNotice( { connectUrl, complete = false, onSettled } ) {
	const [ active, setActive ] = useState( false );
	let message = __( 'Reports need generating.', 'pendulum-arc' );
	if ( active ) {
		message = __( 'Reports are currently generating.', 'pendulum-arc' );
	} else if ( complete ) {
		message = __( 'View your latest data below.', 'pendulum-arc' );
	}
	return (
		<div className="arc-report-alert arc-report-alert--info" role="status">
			<p>
				<Icon size={ 18 } strokeWidth={ 2 }>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</Icon>
				<span>{ message }</span>
			</p>
			<GenerateReports
				onActivity={ setActive }
				onSettled={ onSettled }
				connectUrl={ connectUrl }
			/>
		</div>
	);
}

/**
 * Warning card used at the close of a report, and when a summary is not
 * available yet. The button opens Arc.
 *
 * @param {Object}                    props
 * @param {string}                    [props.href]
 * @param {string}                    [props.label]
 * @param {import('react').ReactNode} props.children
 */
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
