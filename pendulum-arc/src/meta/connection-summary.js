/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { MetaBox } from './meta-box';
import { ArcButton } from '../ui/button';

export function ConnectionSummary( { connection, onDisconnect } ) {
	const [ confirming, setConfirming ] = useState( false );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );

	if ( ! connection || ! connection.connected ) {
		return null;
	}

	const method =
		connection.method === 'oauth'
			? __( 'Arc account', 'pendulum-arc' )
			: __( 'API key', 'pendulum-arc' );

	async function confirm() {
		setBusy( true );
		setError( '' );
		try {
			await onDisconnect();
		} catch ( err ) {
			setBusy( false );
			setError(
				err && err.message
					? err.message
					: __( 'Arc could not be disconnected.', 'pendulum-arc' )
			);
		}
	}

	return (
		<MetaBox
			icon="link"
			title={ __( 'Connection', 'pendulum-arc' ) }
			footer={
				confirming ? (
					<div className="arc-meta__confirm">
						<p>
							{ __(
								'Disconnect this site? This install will stop reading Arc. The site and its reports stay in Arc.',
								'pendulum-arc'
							) }
						</p>
						<div className="pendulum-arc-modal__actions">
							<ArcButton
								variant="danger"
								onClick={ () => setConfirming( false ) }
								disabled={ busy }
							>
								{ __( 'Cancel', 'pendulum-arc' ) }
							</ArcButton>
							<ArcButton busy={ busy } onClick={ confirm }>
								{ __( 'Disconnect', 'pendulum-arc' ) }
							</ArcButton>
						</div>
					</div>
				) : (
					<ArcButton onClick={ () => setConfirming( true ) }>
						{ __( 'Disconnect', 'pendulum-arc' ) }
					</ArcButton>
				)
			}
		>
			<dl className="arc-meta__facts">
				<div>
					<dt>{ __( 'Site', 'pendulum-arc' ) }</dt>
					<dd>{ connection.siteName || connection.siteUrl }</dd>
				</div>
				<div>
					<dt>{ __( 'Address', 'pendulum-arc' ) }</dt>
					<dd>{ connection.siteUrl }</dd>
				</div>
				<div>
					<dt>{ __( 'Method', 'pendulum-arc' ) }</dt>
					<dd>{ method }</dd>
				</div>
				{ connection.accountLabel ? (
					<div>
						<dt>{ __( 'Credential', 'pendulum-arc' ) }</dt>
						<dd>{ connection.accountLabel }</dd>
					</div>
				) : null }
			</dl>
			{ error ? <p className="arc-meta__error">{ error }</p> : null }
		</MetaBox>
	);
}
