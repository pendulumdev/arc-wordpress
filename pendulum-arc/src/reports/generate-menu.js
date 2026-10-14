/**
 * WordPress dependencies
 */
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { enqueueRun, errorMessage, fetchRuns } from '../api';
import { StrokeMark } from '../ui/column-icon';
import { ErrorAlert } from '../ui/error-alert';
import { Icon } from '../ui/icon';

const SERVICES = [
	{
		key: 'analytics',
		accent: 'sky',
		icon: 'chart',
		label: __( 'Analytics', 'pendulum-arc' ),
	},
	{
		key: 'seo',
		accent: 'lime',
		icon: 'searchCheck',
		label: __( 'SEO', 'pendulum-arc' ),
	},
	{
		key: 'a11y',
		accent: 'emerald',
		icon: 'access',
		label: __( 'A11Y', 'pendulum-arc' ),
	},
	{
		key: 'ai',
		accent: 'cyan',
		icon: 'bot',
		label: __( 'AI', 'pendulum-arc' ),
	},
	{
		key: 'security',
		accent: 'amber',
		icon: 'shield',
		label: __( 'Security', 'pendulum-arc' ),
	},
	{
		key: 'brand',
		accent: 'pink',
		icon: 'palette',
		label: __( 'Brand', 'pendulum-arc' ),
	},
];

/**
 * A poll of the run list wins. A queue that has not landed yet is queued.
 *
 * @param {string|null|undefined} inFlight
 * @param {boolean}               pending
 */
function busyStatus( inFlight, pending ) {
	if ( inFlight === 'running' || inFlight === 'queued' ) {
		return inFlight;
	}
	if ( pending ) {
		return 'queued';
	}
	return null;
}

function PlayIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
		</svg>
	);
}

function Spinner() {
	return (
		<span className="arc-generate__spin">
			<Icon size={ 16 } strokeWidth={ 2.25 }>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</Icon>
		</span>
	);
}

/**
 * Portal Generate bloom: confirm, then queue one service or every idle one.
 * In-flight labels come from one runs read when the notice opens, and one
 * more after a queue. The menu does not poll.
 *
 * @param {Object}     props
 * @param {() => void} [props.onActivity] Called when any service is queued or running.
 * @param {string}     [props.connectUrl] WordPress Connect settings page.
 */
export function GenerateReports( { onActivity, connectUrl } ) {
	const [ open, setOpen ] = useState( false );
	const [ confirm, setConfirm ] = useState( null );
	const [ busy, setBusy ] = useState( {} );
	const [ pending, setPending ] = useState( null );
	const [ pendingAll, setPendingAll ] = useState( false );
	const [ error, setError ] = useState( null );
	const rootRef = useRef( null );
	const menuId = useId();

	useEffect( () => {
		let cancel = false;
		fetchRuns()
			.then( ( view ) => {
				if ( cancel || ! view || ! view.busy ) {
					return;
				}
				setBusy( ( current ) => ( { ...view.busy, ...current } ) );
				if ( view.error ) {
					setError( view.error );
				}
			} )
			.catch( ( failure ) => {
				if ( ! cancel ) {
					setError(
						errorMessage(
							failure,
							__(
								'Could not load report status.',
								'pendulum-arc'
							)
						)
					);
				}
			} );
		return () => {
			cancel = true;
		};
	}, [] );

	const anyBusy = SERVICES.some(
		( service ) =>
			busyStatus( busy[ service.key ], pending === service.key ) !== null
	);
	const submitting = pendingAll || pending !== null;

	useEffect( () => {
		if ( onActivity ) {
			onActivity( anyBusy || submitting );
		}
	}, [ anyBusy, submitting, onActivity ] );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		function onPointer( event ) {
			if (
				rootRef.current &&
				! rootRef.current.contains( event.target )
			) {
				setOpen( false );
				setConfirm( null );
			}
		}
		function onKey( event ) {
			if ( event.key !== 'Escape' ) {
				return;
			}
			if ( confirm ) {
				event.preventDefault();
				event.stopPropagation();
				setConfirm( null );
				return;
			}
			setOpen( false );
		}
		document.addEventListener( 'mousedown', onPointer );
		document.addEventListener( 'keydown', onKey, true );
		return () => {
			document.removeEventListener( 'mousedown', onPointer );
			document.removeEventListener( 'keydown', onKey, true );
		};
	}, [ open, confirm ] );

	function markQueued( service ) {
		setBusy( ( current ) => ( {
			...current,
			[ service ]: current[ service ] || 'queued',
		} ) );
	}

	async function queueOne( service ) {
		setPending( service );
		setError( null );
		try {
			await enqueueRun( service );
			markQueued( service );
			return true;
		} catch ( failure ) {
			setError(
				errorMessage(
					failure,
					__( 'Could not queue that report.', 'pendulum-arc' )
				)
			);
			return false;
		} finally {
			setPending( null );
		}
	}

	async function queueAll( services ) {
		setPendingAll( true );
		setError( null );
		try {
			for ( const service of services ) {
				await enqueueRun( service );
				markQueued( service );
			}
			return true;
		} catch ( failure ) {
			setError(
				errorMessage(
					failure,
					__( 'Could not queue that report.', 'pendulum-arc' )
				)
			);
			return false;
		} finally {
			setPendingAll( false );
		}
	}

	async function finish( run ) {
		setConfirm( null );
		const ok = await run();
		if ( ok ) {
			setOpen( false );
		}
	}

	const runnable = SERVICES.filter(
		( service ) =>
			busyStatus( busy[ service.key ], pending === service.key ) === null
	);
	const runAllDisabled = submitting || runnable.length === 0;
	const label = __( 'Run', 'pendulum-arc' );
	const menuLabel = __( 'Generate reports', 'pendulum-arc' );

	return (
		<div className="arc-generate" ref={ rootRef }>
			<button
				type="button"
				className="arc-button arc-button--primary arc-generate__trigger"
				aria-label={ menuLabel }
				aria-expanded={ open }
				aria-controls={ menuId }
				aria-haspopup="menu"
				aria-busy={ anyBusy || submitting ? 'true' : undefined }
				onClick={ () =>
					setOpen( ( value ) => {
						if ( value ) {
							setConfirm( null );
						}
						return ! value;
					} )
				}
			>
				<span className="arc-generate__play">
					{ anyBusy || submitting ? <Spinner /> : <PlayIcon /> }
				</span>
				<span>{ label }</span>
				<span
					className="arc-generate__chevron"
					data-open={ open ? 'true' : 'false' }
				>
					<Icon size={ 14 } strokeWidth={ 2.25 }>
						<path d="m6 9 6 6 6-6" />
					</Icon>
				</span>
			</button>
			{ open ? (
				<div
					id={ menuId }
					className="arc-issue-menu__panel arc-generate__panel"
					role="menu"
					aria-label={ menuLabel }
					data-origin="top-right"
				>
					<div
						className="arc-issue-menu__shadow"
						aria-hidden="true"
					/>
					<div className="arc-issue-menu__iris">
						<div className="arc-issue-menu__chrome">
							<span>{ menuLabel }</span>
							<button
								type="button"
								className="arc-issue-menu__close"
								aria-label={ __( 'Close', 'pendulum-arc' ) }
								onClick={ () => {
									setConfirm( null );
									setOpen( false );
								} }
							>
								<Icon size={ 12 } strokeWidth={ 2.25 }>
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</Icon>
							</button>
						</div>
						<div className="arc-issue-menu__body">
							<GenerateRow
								confirming={ confirm === 'all' }
								disabled={ runAllDisabled }
								icon={ runAllDisabled ? 'ban' : 'layers' }
								iconMuted={ runAllDisabled }
								label={ __( 'Run all', 'pendulum-arc' ) }
								strong
								onAsk={ () => setConfirm( 'all' ) }
								onCancel={ () => setConfirm( null ) }
								onConfirm={ () =>
									finish( () =>
										queueAll(
											runnable.map(
												( service ) => service.key
											)
										)
									)
								}
							/>
							{ SERVICES.map( ( service ) => {
								const status = busyStatus(
									busy[ service.key ],
									pending === service.key
								);
								return (
									<GenerateRow
										key={ service.key }
										confirming={ confirm === service.key }
										disabled={
											status !== null || pendingAll
										}
										status={ status }
										icon={
											status === 'queued'
												? 'clock'
												: service.icon
										}
										accent={
											status ? undefined : service.accent
										}
										spinning={ status === 'running' }
										label={ service.label }
										onAsk={ () =>
											setConfirm( service.key )
										}
										onCancel={ () => setConfirm( null ) }
										onConfirm={ () =>
											finish( () =>
												queueOne( service.key )
											)
										}
									/>
								);
							} ) }
							{ error ? (
								<div className="arc-generate__error">
									<ErrorAlert
										message={ error }
										connectUrl={ connectUrl }
									/>
								</div>
							) : null }
						</div>
					</div>
				</div>
			) : null }
		</div>
	);
}

function rowEnd( confirming, statusLabel, onCancel, onConfirm ) {
	if ( confirming ) {
		return (
			<span className="arc-generate__confirm">
				<button
					type="button"
					className="arc-generate__choice"
					aria-label={ __( 'Cancel', 'pendulum-arc' ) }
					onClick={ ( event ) => {
						event.stopPropagation();
						onCancel();
					} }
				>
					<StrokeMark name="x" size={ 12 } strokeWidth={ 2.25 } />
				</button>
				<button
					type="button"
					className="arc-generate__choice arc-generate__choice--confirm"
					data-confirm-run="true"
					aria-label={ __( 'Confirm', 'pendulum-arc' ) }
					onClick={ ( event ) => {
						event.stopPropagation();
						onConfirm();
					} }
				>
					<StrokeMark name="check" size={ 12 } strokeWidth={ 2.5 } />
				</button>
			</span>
		);
	}
	if ( statusLabel ) {
		return <span className="arc-generate__status">{ statusLabel }</span>;
	}
	return null;
}

/**
 * @param {Object}     props
 * @param {boolean}    props.confirming
 * @param {boolean}    props.disabled
 * @param {string}     props.icon
 * @param {string}     props.label
 * @param {string}     [props.status]
 * @param {string}     [props.accent]
 * @param {boolean}    [props.strong]
 * @param {boolean}    [props.spinning]
 * @param {boolean}    [props.iconMuted]
 * @param {() => void} props.onAsk
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
function GenerateRow( {
	confirming,
	disabled,
	icon,
	label,
	status,
	accent,
	strong,
	spinning,
	iconMuted,
	onAsk,
	onCancel,
	onConfirm,
} ) {
	let statusLabel = null;
	if ( status === 'running' ) {
		statusLabel = __( 'Running', 'pendulum-arc' );
	} else if ( status === 'queued' ) {
		statusLabel = __( 'Queued', 'pendulum-arc' );
	}
	return (
		<div
			className={
				strong
					? 'arc-generate__row arc-generate__row--all'
					: 'arc-generate__row'
			}
			role="menuitem"
			tabIndex={ disabled ? -1 : 0 }
			aria-disabled={ disabled || undefined }
			aria-busy={ status ? 'true' : undefined }
			aria-expanded={ confirming || undefined }
			onClick={ () => {
				if ( disabled ) {
					return;
				}
				if ( confirming ) {
					onCancel();
				} else {
					onAsk();
				}
			} }
			onKeyDown={ ( event ) => {
				if ( event.target !== event.currentTarget || disabled ) {
					return;
				}
				if ( event.key !== 'Enter' && event.key !== ' ' ) {
					return;
				}
				event.preventDefault();
				if ( confirming ) {
					onCancel();
				} else {
					onAsk();
				}
			} }
		>
			<span className="arc-generate__main">
				<span
					className={
						spinning
							? 'arc-generate__mark arc-generate__spin'
							: 'arc-generate__mark'
					}
					data-accent={ accent || undefined }
					data-muted={ iconMuted ? 'true' : undefined }
				>
					{ spinning ? (
						<Icon size={ 16 } strokeWidth={ 2.25 }>
							<path d="M21 12a9 9 0 1 1-6.219-8.56" />
						</Icon>
					) : (
						<StrokeMark
							name={ icon }
							size={ 16 }
							strokeWidth={ 2.25 }
						/>
					) }
				</span>
				<span className="arc-generate__row-label">{ label }</span>
			</span>
			{ rowEnd( confirming, statusLabel, onCancel, onConfirm ) }
		</div>
	);
}
