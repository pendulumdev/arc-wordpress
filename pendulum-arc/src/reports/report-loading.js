/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from '../ui/icon';

/**
 * Spinner that stands in for content while a payload is in flight.
 *
 * @param {Object} [props]
 * @param {string} [props.label] Screen-reader text. Defaults to the report label.
 */
export function ReportLoader( { label } = {} ) {
	return (
		<div className="arc-report-loader" role="status">
			<span className="arc-report-loader__spin" aria-hidden="true">
				<Icon size={ 28 } strokeWidth={ 2.25 }>
					<path d="M21 12a9 9 0 1 1-6.219-8.56" />
				</Icon>
			</span>
			<span className="screen-reader-text">
				{ label || __( 'Loading report…', 'pendulum-arc' ) }
			</span>
		</div>
	);
}
