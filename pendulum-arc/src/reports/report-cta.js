/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
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
							'Issue management and the rest of this report stay in Arc.',
							'pendulum-arc'
						) }
				</span>
			</p>
			{ href ? (
				<ArcButton href={ href }>
					{ label ||
						__( 'Open the full report in Arc', 'pendulum-arc' ) }
				</ArcButton>
			) : null }
		</div>
	);
}
