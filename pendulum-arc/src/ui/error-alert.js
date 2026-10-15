/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from './icon';

const GRANT_ERROR = 'Authorization grant is not valid.';
const RECONNECT_HINT = __(
	'Reconnect this site in Arc to allow generating reports.',
	'pendulum-arc'
);
const SITE_MISSING = __(
	'Arc cannot find this site on the connected account. Reconnect to attach the site for this WordPress address.',
	'pendulum-arc'
);

/**
 * A 404 from Arc, or the admin sentence that explains it.
 *
 * @param {string} message
 */
export function isSiteMissingError( message ) {
	return (
		message === 'Not found.' ||
		( typeof message === 'string' && message.includes( SITE_MISSING ) )
	);
}

/**
 * Connect settings, with the pairing form when the stored site is missing.
 *
 * @param {string}  connectUrl
 * @param {boolean} siteMissing
 */
function reconnectHref( connectUrl, siteMissing ) {
	if ( ! siteMissing ) {
		return connectUrl;
	}
	const join = connectUrl.includes( '?' ) ? '&' : '?';
	return `${ connectUrl }${ join }arc_reconnect=1`;
}

/**
 * Error card for a failed Arc request. An invalid grant or a missing site links to Connect.
 *
 * @param {Object} props
 * @param {string} props.message
 * @param {string} [props.connectUrl]
 */
export function ErrorAlert( { message, connectUrl } ) {
	const siteMissing = isSiteMissingError( message );
	const reconnect =
		connectUrl &&
		( message.includes( GRANT_ERROR ) ||
			message.includes( RECONNECT_HINT ) ||
			siteMissing )
			? reconnectHref( connectUrl, siteMissing )
			: '';
	let linkLabel = __( 'Reconnect this site.', 'pendulum-arc' );
	if ( message.includes( RECONNECT_HINT ) ) {
		linkLabel = __( 'Connect settings', 'pendulum-arc' );
	} else if ( siteMissing ) {
		linkLabel = __( 'Reconnect', 'pendulum-arc' );
	}
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
							<a href={ reconnect }>{ linkLabel }</a>
						</>
					) : null }
				</span>
			</p>
		</div>
	);
}
