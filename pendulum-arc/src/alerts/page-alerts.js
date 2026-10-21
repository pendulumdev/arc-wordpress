/**
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { countedAlerts, setMenuCount } from './alert-list';
import { Icon } from '../ui/icon';

export {
	countedAlerts,
	googleAccountMissing,
	pageAlerts,
	setMenuCount,
} from './alert-list';

/**
 * The keyphrase banner. Other Arc screens link to Connect.
 *
 * @param {string}  connectUrl
 * @param {boolean} onConnect
 */
export function keyphraseAlert( connectUrl, onConnect ) {
	const alert = {
		id: 'keyphrases',
		tone: 'info',
		message: __(
			'Keyphrases on this site differ from Arc.',
			'pendulum-arc'
		),
		count: true,
	};
	if ( ! onConnect && connectUrl ) {
		alert.href = connectUrl;
		alert.hrefLabel = __( 'Sync with Arc', 'pendulum-arc' );
	}
	return alert;
}

/**
 * Standing notice when Analytics has no Google account. It does not add to the menu count.
 *
 * @param {Object|null} [action]          Connect Google control. Omitted when there is no action.
 * @param {() => void}  [action.onAction] Starts Connect Google.
 * @param {string}      [action.label]    Button label.
 * @param {boolean}     [action.disabled] Disables the button while connect is busy.
 */
export function googleAlert( action = null ) {
	const alert = {
		id: 'google',
		tone: 'info',
		message: __(
			'Connect your Google account to get GA4 and Search Console insights and improve your rankings.',
			'pendulum-arc'
		),
		count: false,
	};
	if ( action && action.onAction ) {
		alert.onAction = action.onAction;
		alert.hrefLabel =
			action.label || __( 'Connect Google', 'pendulum-arc' );
		alert.disabled = Boolean( action.disabled );
	}
	return alert;
}

function toneClass( tone ) {
	if ( tone === 'error' ) {
		return 'arc-report-alert arc-report-alert--error';
	}
	if ( tone === 'warning' ) {
		return 'arc-report-alert';
	}
	return 'arc-report-alert arc-report-alert--info';
}

function AlertIcon( { tone } ) {
	if ( tone === 'error' ) {
		return (
			<Icon size={ 18 } strokeWidth={ 2 }>
				<circle cx="12" cy="12" r="10" />
				<path d="m15 9-6 6" />
				<path d="m9 9 6 6" />
			</Icon>
		);
	}
	if ( tone === 'warning' ) {
		return (
			<Icon size={ 18 } strokeWidth={ 2 }>
				<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
				<path d="M12 9v4" />
				<path d="M12 17h.01" />
			</Icon>
		);
	}
	return (
		<Icon size={ 18 } strokeWidth={ 2 }>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 16v-4" />
			<path d="M12 8h.01" />
		</Icon>
	);
}

/**
 * One or more banners at the top of an Arc screen.
 *
 * @param {Object}        props
 * @param {Array<Object>} props.alerts
 */
export function PageAlerts( { alerts } ) {
	const count = countedAlerts( alerts );
	useEffect( () => {
		setMenuCount( count );
	}, [ count ] );

	if ( ! alerts.length ) {
		return null;
	}
	return (
		<div className="arc-alerts">
			{ alerts.map( ( alert ) => (
				<div
					key={ alert.id }
					className={ toneClass( alert.tone ) }
					role={ alert.tone === 'error' ? 'alert' : 'status' }
				>
					<p>
						<AlertIcon tone={ alert.tone } />
						<span>
							{ alert.message }
							{ alert.onAction ? (
								<>
									{ ' ' }
									<button
										type="button"
										className="arc-report-alert__action"
										onClick={ alert.onAction }
										disabled={ alert.disabled }
									>
										{ alert.hrefLabel }
									</button>
								</>
							) : null }
							{ ! alert.onAction && alert.href ? (
								<>
									{ ' ' }
									<a href={ alert.href }>
										{ alert.hrefLabel }
									</a>
								</>
							) : null }
						</span>
					</p>
					{ alert.onDismiss ? (
						<button
							type="button"
							className="arc-alerts__dismiss"
							onClick={ alert.onDismiss }
						>
							{ __( 'Dismiss', 'pendulum-arc' ) }
						</button>
					) : null }
				</div>
			) ) }
		</div>
	);
}
