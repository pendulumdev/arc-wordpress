/**
 * WordPress dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { fetchInvites, fetchScores } from '../api';
import { Icon } from '../ui/icon';
import { InviteModal } from './invite-modal';
import {
	analyticsLinked,
	currentSetupAction,
	findAccountOnProject,
	setupProgress,
} from './setup-step-state';

function stepMark( step, index ) {
	if ( step.done ) {
		return (
			<Icon size={ 14 } strokeWidth={ 2.75 }>
				<polyline points="20 6 9 17 4 12" />
			</Icon>
		);
	}
	if ( step.pending ) {
		return null;
	}
	return <span className="arc-setup__index">{ index + 1 }</span>;
}

function stepStatus( step ) {
	if ( step.pending ) {
		return __( 'Checking', 'pendulum-arc' );
	}
	if ( step.done ) {
		return __( 'Complete', 'pendulum-arc' );
	}
	if ( step.action ) {
		return __( 'Start this step', 'pendulum-arc' );
	}
	return __( 'Not complete', 'pendulum-arc' );
}

function ActionIcon() {
	return (
		<span className="arc-setup__action-icon">
			<Icon size={ 12 } strokeWidth={ 2.25 }>
				<path d="M15 3h6v6" />
				<path d="M10 14 21 3" />
				<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
			</Icon>
		</span>
	);
}

/**
 * Install, Connect, Analytics, and Invite. Later ticks load after the page.
 * Only the next unfinished step is a link.
 *
 * @param {Object}     props
 * @param {boolean}    props.connected       Site is paired with Arc.
 * @param {() => void} [props.onConnect]     Starts Arc sign-in.
 * @param {() => void} [props.onAnalytics]   Starts Google connect.
 * @param {boolean}    [props.connectBusy]
 * @param {boolean}    [props.analyticsBusy]
 */
export function SetupSteps( {
	connected,
	onConnect,
	onAnalytics,
	connectBusy = false,
	analyticsBusy = false,
} ) {
	const [ analytics, setAnalytics ] = useState( connected ? null : false );
	const [ invited, setInvited ] = useState( connected ? null : false );
	const [ inviteOpen, setInviteOpen ] = useState( false );

	function refreshInvite() {
		findAccountOnProject( ( page ) => fetchInvites( page ) )
			.then( ( done ) => setInvited( done ) )
			.catch( () => setInvited( false ) );
	}

	useEffect( () => {
		if ( ! connected ) {
			setAnalytics( false );
			setInvited( false );
			return undefined;
		}
		setAnalytics( null );
		setInvited( null );
		let cancelled = false;
		fetchScores()
			.then( ( result ) => {
				if ( ! cancelled ) {
					setAnalytics( analyticsLinked( result ) );
				}
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setAnalytics( false );
				}
			} );
		findAccountOnProject( ( page ) => fetchInvites( page ) )
			.then( ( done ) => {
				if ( ! cancelled ) {
					setInvited( done );
				}
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setInvited( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ connected ] );

	const progress = setupProgress( {
		connected,
		analytics: analytics === true,
		invited: invited === true,
	} );
	const action = currentSetupAction( progress, {
		analytics: analytics === null,
		invite: invited === null,
	} );
	const steps = [
		{
			id: 'install',
			label: __( 'Install', 'pendulum-arc' ),
			detail: __( 'Install Arc Analytics', 'pendulum-arc' ),
			done: progress.install,
			pending: false,
			action: false,
			busy: false,
		},
		{
			id: 'connect',
			label: __( 'Connect', 'pendulum-arc' ),
			detail: __( 'Connect to Arc', 'pendulum-arc' ),
			done: progress.connect,
			pending: false,
			action: action === 'connect',
			busy: connectBusy,
		},
		{
			id: 'analytics',
			label: __( 'Analytics', 'pendulum-arc' ),
			detail: __( 'Connect to Google', 'pendulum-arc' ),
			done: progress.analytics,
			pending: analytics === null,
			action: action === 'analytics',
			busy: analyticsBusy,
		},
		{
			id: 'invite',
			label: __( 'Invite', 'pendulum-arc' ),
			detail: __( 'Connect your users', 'pendulum-arc' ),
			done: progress.invite,
			pending: invited === null,
			action: action === 'invite',
			busy: false,
		},
	];

	function run( step ) {
		if ( ! step.action || step.busy ) {
			return;
		}
		if ( step.id === 'connect' && onConnect ) {
			onConnect();
		}
		if ( step.id === 'analytics' && onAnalytics ) {
			onAnalytics();
		}
		if ( step.id === 'invite' ) {
			setInviteOpen( true );
		}
	}

	return (
		<div className="arc-setup-card">
			<ol
				className="arc-setup"
				aria-label={ __( 'Setup progress', 'pendulum-arc' ) }
			>
				{ steps.map( ( step, index ) => (
					<li
						key={ step.id }
						className="arc-setup__step"
						data-done={ step.done ? 'true' : 'false' }
						data-pending={ step.pending ? 'true' : 'false' }
						data-action={ step.action ? 'true' : 'false' }
					>
						{ step.action ? (
							<button
								type="button"
								className="arc-setup__action"
								disabled={ step.busy }
								onClick={ () => run( step ) }
							>
								<span className="arc-setup__label">
									{ step.label }
								</span>
								<ActionIcon />
							</button>
						) : (
							<span className="arc-setup__label">
								{ step.label }
							</span>
						) }
						<span className="arc-setup__track">
							<span
								className="arc-setup__mark"
								aria-hidden="true"
							>
								{ stepMark( step, index ) }
							</span>
						</span>
						<span className="arc-setup__detail">
							{ step.detail }
						</span>
						<span className="screen-reader-text">
							{ stepStatus( step ) }
						</span>
					</li>
				) ) }
			</ol>
			{ inviteOpen ? (
				<InviteModal
					onClose={ () => {
						setInviteOpen( false );
						refreshInvite();
					} }
				/>
			) : null }
		</div>
	);
}
