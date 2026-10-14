/**
 * WordPress dependencies
 */
import { Notice, Spinner, TextControl } from '@wordpress/components';
import { useReducer, useState } from '@wordpress/element';
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
	startOAuth,
} from '../api';
import { ConnectionSummary, MetaBox } from '../meta';
import { ArcButton } from '../ui/button';
import { ChooseSiteModal } from './choose-site-modal';
import { CreateSiteModal } from './create-site-modal';
import { connectReducer, initialConnectState } from './reducer';

export function ConnectPage( { bootstrap } ) {
	const [ state, dispatch ] = useReducer(
		connectReducer,
		bootstrap.pending,
		initialConnectState
	);
	const [ apiKey, setApiKey ] = useState( '' );
	const connected = bootstrap.connection && bootstrap.connection.connected;

	async function onApiKey( event ) {
		event.preventDefault();
		dispatch( { type: 'verify-start' } );
		try {
			const result = await connectWithApiKey( apiKey );
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
					__( 'Arc could not check that API key.', 'pendulum-arc' )
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

	return (
		<div className="pendulum-arc-screen">
			{ bootstrap.notice && (
				<Notice
					status={ bootstrap.notice.status }
					isDismissible={ false }
				>
					{ bootstrap.notice.message }
				</Notice>
			) }
			{ state.error && (
				<Notice status="error" isDismissible={ false }>
					{ state.error }
				</Notice>
			) }
			{ ! connected && state.phase === 'needs_project' && (
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
			{ connected ? (
				<div className="pendulum-arc-connection">
					<ConnectionSummary
						connection={ bootstrap.connection }
						onDisconnect={ async () => {
							await disconnect();
							window.location.assign( bootstrap.urls.connect );
						} }
					/>
				</div>
			) : (
				<div className="pendulum-arc-meta-grid">
					<MetaBox
						icon="key"
						title={ __( 'API key', 'pendulum-arc' ) }
						description={ __(
							'Paste a key from Arc. If this address is already a site, it is paired. If not, you confirm the site here.',
							'pendulum-arc'
						) }
					>
						<form className="arc-fields" onSubmit={ onApiKey }>
							<TextControl
								label={ __( 'API key', 'pendulum-arc' ) }
								type="password"
								value={ apiKey }
								onChange={ setApiKey }
								autoComplete="off"
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<ArcButton type="submit" busy={ busy }>
								{ __( 'Connect with API key', 'pendulum-arc' ) }
							</ArcButton>
						</form>
					</MetaBox>
					<MetaBox
						icon="user"
						title={ __( 'Arc account', 'pendulum-arc' ) }
						description={ __(
							'Sign in on Arc. Arc pairs this address to a site, or lets you add the site and its project, then sends you back here.',
							'pendulum-arc'
						) }
					>
						<ArcButton busy={ busy } onClick={ onOAuth }>
							{ __( 'Connect with Arc', 'pendulum-arc' ) }
						</ArcButton>
						{ busy && <Spinner /> }
					</MetaBox>
				</div>
			) }
			{ ! connected &&
			( state.phase === 'needs_site' || state.phase === 'creating' )
				? state.draft && (
						<CreateSiteModal
							draft={ state.draft }
							projects={ state.projects }
							fieldErrors={ state.fieldErrors }
							busy={ state.phase === 'creating' }
							onChange={ ( patch ) =>
								dispatch( { type: 'draft', patch } )
							}
							onCancel={ () => dispatch( { type: 'dismiss' } ) }
							onSubmit={ onCreate }
						/>
					)
				: null }
			{ ! connected &&
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
