/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, startGoogleConnect } from '../api';

/**
 * Starts the Arc Google handoff for the current WordPress user.
 */
export function useGoogleConnect() {
	const [ pending, setPending ] = useState( false );
	const [ notice, setNotice ] = useState( null );
	const start = useCallback( async () => {
		if ( pending ) {
			return;
		}
		setPending( true );
		setNotice( null );
		try {
			const result = await startGoogleConnect();
			if ( result && result.checkEmail ) {
				setNotice( {
					id: 'google-connect',
					tone: 'info',
					message:
						result.message ||
						__(
							'Check your email for an Arc invite. Accept it to connect Google. You will return to this site.',
							'pendulum-arc'
						),
				} );
				return;
			}
			if ( result && result.reconnect && result.url ) {
				setNotice( {
					id: 'google-connect',
					tone: 'info',
					message:
						result.message ||
						__(
							'Disconnect and Connect with Arc again before inviting someone who has no Arc account. If you already have an Arc account, continue.',
							'pendulum-arc'
						),
					onAction: () => {
						window.location.assign( result.url );
					},
					hrefLabel: __( 'Continue', 'pendulum-arc' ),
				} );
				return;
			}
			if ( result && result.url ) {
				window.location.assign( result.url );
				return;
			}
			setNotice( {
				id: 'google-connect',
				tone: 'error',
				message: __(
					'Arc did not start Google connect.',
					'pendulum-arc'
				),
			} );
		} catch ( error ) {
			setNotice( {
				id: 'google-connect',
				tone: 'error',
				message: errorMessage(
					error,
					__( 'Could not start Google connect.', 'pendulum-arc' )
				),
			} );
		} finally {
			setPending( false );
		}
	}, [ pending ] );
	return { start, pending, notice };
}
