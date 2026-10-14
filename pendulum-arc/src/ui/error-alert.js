/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from './icon';

const GRANT_ERROR = 'Authorization grant is not valid.';

/**
 * Error card for a failed Arc request. An invalid grant links to Connect.
 *
 * @param {Object} props
 * @param {string} props.message
 * @param {string} [props.connectUrl]
 */
export function ErrorAlert( { message, connectUrl } ) {
	const reconnect =
		connectUrl && message.includes( GRANT_ERROR ) ? connectUrl : '';
	return (
		<div className="arc-report-alert arc-report-alert--error" role="alert">
			<p>
				<Icon size={ 18 } strokeWidth={ 2 }>
					<circle cx="12" cy="12" r="10" />
					<path d="m15 9-6 6" />
					<path d="m9 9 6 6" />
				</Icon>
				<span>
					{ message }
					{ reconnect ? (
						<>
							{ ' ' }
							<a href={ reconnect }>
								{ __( 'Reconnect this site.', 'pendulum-arc' ) }
							</a>
						</>
					) : null }
				</span>
			</p>
		</div>
	);
}
