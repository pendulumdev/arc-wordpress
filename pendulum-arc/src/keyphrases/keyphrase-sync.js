/**
 * WordPress dependencies
 */
import { CheckboxControl } from '@wordpress/components';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { fetchKeyphrases, setKeyphrasesEnabled, syncKeyphrases } from '../api';
import { ArcButton } from '../ui/button';

/**
 * Sync keyphrases control. The scan stays on WordPress. Arc is called when this screen loads after the scan, and when the button is clicked.
 *
 * @param {Object}  props
 * @param {boolean} props.connected Paired with an Arc site.
 * @param {string}  [props.arcMark] Arc mark shown on the sync button.
 */
export function KeyphraseSync( { connected, arcMark } ) {
	const [ status, setStatus ] = useState( null );
	const [ message, setMessage ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ busy, setBusy ] = useState( false );

	const load = useCallback( async () => {
		try {
			const next = await fetchKeyphrases();
			setStatus( next );
			setError( next.error || '' );
		} catch ( failure ) {
			setError(
				failure?.message ||
					__( 'Keyphrases could not be loaded.', 'pendulum-arc' )
			);
		}
	}, [] );

	useEffect( () => {
		load();
	}, [ load ] );

	useEffect( () => {
		if ( ! status?.scanning ) {
			return undefined;
		}
		const timer = window.setInterval( load, 4000 );
		return () => window.clearInterval( timer );
	}, [ status?.scanning, load ] );

	const onToggle = async ( enabled ) => {
		setBusy( true );
		setMessage( '' );
		setError( '' );
		try {
			const next = await setKeyphrasesEnabled( enabled );
			setStatus( next );
			setError( next.error || '' );
		} catch ( failure ) {
			setError(
				failure?.message ||
					__( 'Keyphrases could not be updated.', 'pendulum-arc' )
			);
		} finally {
			setBusy( false );
		}
	};

	const onSync = async () => {
		setBusy( true );
		setMessage( '' );
		setError( '' );
		try {
			const result = await syncKeyphrases();
			setMessage( result.message || '' );
			await load();
		} catch ( failure ) {
			setError(
				failure?.message ||
					__( 'Keyphrases could not be synced.', 'pendulum-arc' )
			);
		} finally {
			setBusy( false );
		}
	};

	const showButton = Boolean(
		connected &&
		status?.enabled &&
		status?.scanDone &&
		status?.diverged &&
		! busy
	);

	return (
		<section className="arc-keyphrases">
			<CheckboxControl
				label={ __( 'Sync keyphrases', 'pendulum-arc' ) }
				help={ __(
					'Keep a list of focus keyphrases from Yoast, Rank Math, SEOPress, and All in One SEO. Send that list to Arc when you choose to.',
					'pendulum-arc'
				) }
				checked={ Boolean( status?.enabled ) }
				disabled={ busy || ! status }
				onChange={ onToggle }
			/>
			{ status?.notice && ! status?.enabled ? (
				<div
					className="arc-report-alert arc-report-alert--info"
					role="status"
				>
					<p>
						{ __(
							'If you turn Sync keyphrases back on later, it may take a few minutes to resync the keyphrases with Arc.',
							'pendulum-arc'
						) }
					</p>
				</div>
			) : null }
			{ status?.scanning ? (
				<div
					className="arc-report-alert arc-report-alert--info"
					role="status"
				>
					<p>
						{ __(
							'Reading keyphrases. This can take a few minutes.',
							'pendulum-arc'
						) }
					</p>
				</div>
			) : null }
			{ showButton ? (
				<div>
					<ArcButton
						variant="connect"
						mark={ arcMark }
						busy={ busy }
						onClick={ onSync }
					>
						{ __( 'Sync with Arc', 'pendulum-arc' ) }
					</ArcButton>
				</div>
			) : null }
			{ message ? (
				<div
					className="arc-report-alert arc-report-alert--info"
					role="status"
				>
					<p>{ message }</p>
				</div>
			) : null }
			{ error ? (
				<div
					className="arc-report-alert arc-report-alert--error"
					role="alert"
				>
					<p>{ error }</p>
				</div>
			) : null }
		</section>
	);
}
