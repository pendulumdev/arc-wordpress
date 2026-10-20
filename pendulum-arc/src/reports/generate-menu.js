/**
 * WordPress dependencies
 */
import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { enqueueRun, errorMessage, fetchRuns } from '../api';
import { ArcButton } from '../ui/button';
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

const POLL_MS = 60000;

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

/**
 * Server statuses only. A local queue that has not landed is added by the caller.
 *
 * @param {Object|null|undefined} view Runs payload.
 */
function listedBusy( view ) {
	const next = {};
	const raw =
		view && view.busy && typeof view.busy === 'object' ? view.busy : {};
	for ( const service of SERVICES ) {
		const status = raw[ service.key ];
		if ( status === 'queued' || status === 'running' ) {
			next[ service.key ] = status;
		}
	}
	return next;
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
 * Runs are read on load, then once a minute while any service is in flight.
 *
 * @param {Object}     props
 * @param {() => void} [props.onActivity] Called when any service is queued or running.
 * @param {() => void} [props.onSettled]  Called when a service leaves in-flight.
 * @param {string}     [props.connectUrl] WordPress Connect settings page.
 */
export function GenerateReports( { onActivity, onSettled, connectUrl } ) {
	const [ open, setOpen ] = useState( false );
	const [ confirm, setConfirm ] = useState( null );
	const [ busy, setBusy ] = useState( {} );
	const [ pending, setPending ] = useState( null );
	const [ pendingAll, setPendingAll ] = useState( false );
	const [ error, setError ] = useState( null );
	const rootRef = useRef( null );
	const menuId = useId();
	const busyRef = useRef( {} );
	const pendingRef = useRef( null );
	const pendingAllRef = useRef( false );
	const onSettledRef = useRef( onSettled );
	pendingRef.current = pending;
	pendingAllRef.current = pendingAll;
	onSettledRef.current = onSettled;

	const applyBusy = useCallback( ( view ) => {
		const next = listedBusy( view );
		if ( pendingRef.current && ! next[ pendingRef.current ] ) {
			next[ pendingRef.current ] = 'queued';
		}
		if ( pendingAllRef.current ) {
			for ( const service of SERVICES ) {
				if ( busyRef.current[ service.key ] && ! next[ service.key ] ) {
					next[ service.key ] = busyRef.current[ service.key ];
				}
			}
		}
		const settled = SERVICES.some(
			( service ) =>
				busyRef.current[ service.key ] && ! next[ service.key ]
		);
		busyRef.current = next;
		setBusy( next );
		if ( settled && onSettledRef.current ) {
			onSettledRef.current();
		}
	}, [] );

	const readRuns = useCallback(
		( isCurrent ) => {
			fetchRuns()
				.then( ( view ) => {
					if ( ! isCurrent() ) {
						return;
					}
					applyBusy( view );
					if ( view && view.error ) {
						setError( view.error );
					}
				} )
				.catch( ( failure ) => {
					if ( ! isCurrent() ) {
						return;
					}
					setError(
						errorMessage(
							failure,
							__(
								'Could not load report status.',
								'pendulum-arc'
							)
						)
					);
				} );
		},
		[ applyBusy ]
	);

	useEffect( () => {
		let cancel = false;
		readRuns( () => ! cancel );
		return () => {
			cancel = true;
		};
	}, [ readRuns ] );

	const anyBusy = SERVICES.some(
		( service ) =>
			busyStatus( busy[ service.key ], pending === service.key ) !== null
	);
	const submitting = pendingAll || pending !== null;

	useEffect( () => {
		if ( ! anyBusy ) {
			return undefined;
		}
		let cancel = false;
		const timer = window.setInterval( () => {
			readRuns( () => ! cancel );
		}, POLL_MS );
		return () => {
			cancel = true;
			window.clearInterval( timer );
		};
	}, [ anyBusy, readRuns ] );

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
		const next = {
			...busyRef.current,
			[ service ]: busyRef.current[ service ] || 'queued',
		};
		busyRef.current = next;
		setBusy( next );
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
		const failures = [];
		try {
			for ( const service of services ) {
				try {
					await enqueueRun( service );
					markQueued( service );
				} catch ( failure ) {
					const label =
						SERVICES.find( ( row ) => row.key === service )
							?.label || service;
					failures.push(
						errorMessage(
							failure,
							sprintf(
								/* translators: %s is the report name. */
								__( 'Could not queue %s.', 'pendulum-arc' ),
								label
							)
						)
					);
				}
			}
			if ( failures.length > 0 ) {
				setError( failures.join( ' ' ) );
				return false;
			}
			return true;
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
			<ArcButton
				variant="primary"
				className="arc-generate__trigger"
				ariaLabel={ menuLabel }
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
			</ArcButton>
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
