/**
 * WordPress dependencies
 */
import { Notice, Spinner, TextControl } from '@wordpress/components';
import {
	createInterpolateElement,
	useReducer,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	connectWithApiKey,
	createSite,
	disconnect,
	errorMessage,
	fieldErrors,
	pairSite,
	reconnect,
	startOAuth,
} from '../api';
import { ConnectionSummary, MetaBox } from '../meta';
import { ArcButton } from '../ui/button';
import { ErrorAlert } from '../ui/error-alert';
import { Icon } from '../ui/icon';
import { OpenInArc } from '../ui/open-in-arc';
import { ArcIntro } from './arc-intro';
import { ChooseSiteModal } from './choose-site-modal';
import { CreateSiteModal } from './create-site-modal';
import { connectReducer, initialConnectState } from './reducer';

const SAVED_API_KEY = '************';

function hasStoredApiKey( bootstrap ) {
	const connection = bootstrap.connection || {};
	if ( connection.connected && connection.method === 'api_key' ) {
		return true;
	}
	return Boolean( bootstrap.pending && bootstrap.pending.hasApiKey );
}

export function ConnectPage( { bootstrap } ) {
	const [ state, dispatch ] = useReducer(
		connectReducer,
		bootstrap.pending,
		initialConnectState
	);
	const [ apiKey, setApiKey ] = useState( '' );
	const [ keyHeld, setKeyHeld ] = useState( () =>
		hasStoredApiKey( bootstrap )
	);
	const showSavedKey = keyHeld && apiKey === '';
	const connected = bootstrap.connection && bootstrap.connection.connected;

	function replaceSavedKey() {
		if ( ! showSavedKey ) {
			return;
		}
		setKeyHeld( false );
		window.setTimeout( () => {
			const field = document.getElementById( 'pendulum-arc-api-key' );
			if ( field ) {
				field.focus();
			}
		}, 0 );
	}
	const reconnecting =
		new URLSearchParams( window.location.search ).get( 'arc_reconnect' ) ===
		'1';

	async function onApiKey( event ) {
		event.preventDefault();
		if ( showSavedKey ) {
			return;
		}
		dispatch( { type: 'verify-start' } );
		try {
			const result = await connectWithApiKey( apiKey );
			if ( result.status === 'connected' ) {
				window.location.assign( bootstrap.urls.dashboard );
				return;
			}
			if (
				result.status === 'needs_site' ||
				result.status === 'choose_site'
			) {
				setApiKey( '' );
				setKeyHeld( true );
			}
			dispatch( { type: 'verify-result', result } );
		} catch ( error ) {
			dispatch( {
				type: 'verify-error',
				message: errorMessage(
					error,
					__( 'Arc could not check that API key.', 'pendulum-arc' )
				),
			} );
		}
	}

	async function onReconnect() {
		dispatch( { type: 'verify-start' } );
		try {
			const result = await reconnect();
			if ( result.status === 'connected' ) {
				window.location.assign( bootstrap.urls.dashboard );
				return;
			}
			dispatch( { type: 'verify-result', result } );
		} catch ( error ) {
			dispatch( {
				type: 'verify-error',
				message: errorMessage(
					error,
					__( 'Arc could not reconnect this site.', 'pendulum-arc' )
				),
			} );
		}
	}

	async function onOAuth() {
		dispatch( { type: 'verify-start' } );
		try {
			const result = await startOAuth();
			window.location.assign( result.authorizeUrl );
		} catch ( error ) {
			dispatch( {
				type: 'verify-error',
				message: errorMessage(
					error,
					__( 'Arc sign-in could not start.', 'pendulum-arc' )
				),
			} );
		}
	}

	async function onCreate() {
		dispatch( { type: 'create-start' } );
		try {
			await createSite( state.draft );
			window.location.assign( bootstrap.urls.dashboard );
		} catch ( error ) {
			dispatch( {
				type: 'create-error',
				message: errorMessage(
					error,
					__( 'Arc could not add the site.', 'pendulum-arc' )
				),
				fieldErrors: fieldErrors( error ),
			} );
		}
	}

	async function onPair( siteId ) {
		dispatch( { type: 'pair-start' } );
		try {
			await pairSite( siteId );
			window.location.assign( bootstrap.urls.dashboard );
		} catch ( error ) {
			dispatch( {
				type: 'pair-error',
				message: errorMessage(
					error,
					__( 'Arc could not pair that site.', 'pendulum-arc' )
				),
			} );
		}
	}

	const busy = state.phase === 'verifying';
	const siteFormOpen =
		( ! connected || reconnecting ) &&
		( state.phase === 'needs_site' || state.phase === 'creating' ) &&
		Boolean( state.draft );

	return (
		<div className="pendulum-arc-screen">
			<OpenInArc bootstrap={ bootstrap } />
			{ bootstrap.notice && (
				<Notice
					status={ bootstrap.notice.status }
					isDismissible={ false }
				>
					{ bootstrap.notice.message }
				</Notice>
			) }
			{ state.error && ! siteFormOpen && (
				<Notice status="error" isDismissible={ false }>
					{ state.error }
				</Notice>
			) }
			{ ( ! connected || reconnecting ) &&
				state.phase === 'needs_project' && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'This Arc account has no project yet. Add one in Arc, then connect again.',
							'pendulum-arc'
						) }{ ' ' }
						<a href={ state.portalUrl || bootstrap.urls.portal }>
							{ __( 'Open Arc', 'pendulum-arc' ) }
						</a>
					</Notice>
				) }
			<ArcIntro
				portalUrl={
					( bootstrap.connection &&
						bootstrap.connection.portalUrl ) ||
					bootstrap.urls.portal
				}
				arcMark={ bootstrap.urls.arcMark }
				pendulumMark={ bootstrap.urls.pendulumMark }
			/>
			{ connected && reconnecting && (
				<>
					<ErrorAlert
						message={ __(
							'Arc cannot find the site stored for this address.',
							'pendulum-arc'
						) }
					/>
					<div className="pendulum-arc-meta-grid">
						<MetaBox
							icon="refresh"
							title={ __( 'Reconnect', 'pendulum-arc' ) }
							description={ __(
								'Use the Arc account or API key already saved on this site.',
								'pendulum-arc'
							) }
						>
							<ArcButton busy={ busy } onClick={ onReconnect }>
								{ __( 'Reconnect', 'pendulum-arc' ) }
							</ArcButton>
						</MetaBox>
					</div>
				</>
			) }
			{ connected && ! reconnecting && (
				<div className="pendulum-arc-connection">
					<ConnectionSummary
						connection={ bootstrap.connection }
						onDisconnect={ async () => {
							await disconnect();
							window.location.assign( bootstrap.urls.connect );
						} }
					/>
				</div>
			) }
			{ ! connected && (
				<div className="pendulum-arc-meta-grid">
					<MetaBox
						icon="user"
						title={ __(
							'Connect your Arc account',
							'pendulum-arc'
						) }
						description={ createInterpolateElement(
							__(
								'<strong>Getting started!</strong> Click connect to sign in, or create an Arc account. Arc pairs this website address to your account and automatically starts generating reports.',
								'pendulum-arc'
							),
							{
								strong: <strong />,
							}
						) }
					>
						<ArcButton busy={ busy } onClick={ onOAuth }>
							{ __( 'Connect with Arc', 'pendulum-arc' ) }
						</ArcButton>
						{ busy && <Spinner /> }
					</MetaBox>
					<MetaBox
						icon="key"
						title={ __( 'API key', 'pendulum-arc' ) }
						description={ __(
							'If you struggle to connect, create an API key in your Arc account and paste it here. If this web address is already a site, it is paired. If not, you confirm the site here.',
							'pendulum-arc'
						) }
					>
						<form className="arc-fields" onSubmit={ onApiKey }>
							<div
								className={
									showSavedKey
										? 'arc-key-field arc-key-field--saved'
										: 'arc-key-field'
								}
							>
								<TextControl
									id="pendulum-arc-api-key"
									label={ __( 'API key', 'pendulum-arc' ) }
									type={ showSavedKey ? 'text' : 'password' }
									value={
										showSavedKey ? SAVED_API_KEY : apiKey
									}
									readOnly={ showSavedKey }
									title={
										showSavedKey
											? __(
													'API key saved. Focus the field to replace it.',
													'pendulum-arc'
												)
											: undefined
									}
									onClick={ replaceSavedKey }
									onFocus={ replaceSavedKey }
									onChange={ setApiKey }
									autoComplete="off"
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								{ showSavedKey ? (
									<span className="arc-key-field__tick">
										<Icon size={ 16 } strokeWidth={ 2.5 }>
											<polyline points="20 6 9 17 4 12" />
										</Icon>
										<span className="screen-reader-text">
											{ __(
												'API key saved',
												'pendulum-arc'
											) }
										</span>
									</span>
								) : null }
							</div>
							<ArcButton
								type="submit"
								busy={ busy }
								disabled={ showSavedKey }
							>
								{ __( 'Connect with API key', 'pendulum-arc' ) }
							</ArcButton>
						</form>
					</MetaBox>
				</div>
			) }
			{ ( ! connected || reconnecting ) &&
			( state.phase === 'needs_site' || state.phase === 'creating' )
				? state.draft && (
						<CreateSiteModal
							draft={ state.draft }
							projects={ state.projects }
							fieldErrors={ state.fieldErrors }
							error={ state.error }
							busy={ state.phase === 'creating' }
							onChange={ ( patch ) =>
								dispatch( { type: 'draft', patch } )
							}
							onCancel={ () => dispatch( { type: 'dismiss' } ) }
							onSubmit={ onCreate }
						/>
					)
				: null }
			{ ( ! connected || reconnecting ) &&
			( state.phase === 'choose_site' || state.phase === 'pairing' ) ? (
				<ChooseSiteModal
					matches={ state.matches }
					busy={ state.phase === 'pairing' }
					onChoose={ onPair }
					onCancel={ () => dispatch( { type: 'dismiss' } ) }
				/>
			) : null }
		</div>
	);
}
