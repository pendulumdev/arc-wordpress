/**
 * WordPress dependencies
 */
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from '../ui/icon';

const SEVERITY_LABEL = {
	critical: 'Critical',
	high: 'High',
	medium: 'Medium',
	low: 'Low',
};

const SEVERITY_RANK = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

const SEVERITY_ACCENT = {
	critical: 'red',
	high: 'coral',
	medium: 'orange',
	low: 'amber',
};

const CHECK_KINDS = [ 'coverage', 'finding', 'annotation' ];

/**
 * @param {Array<{ items?: Array<{ severity?: string }> }>} groups
 */
function worstSeverity( groups ) {
	let worst = '';
	let rank = 99;
	groups.forEach( ( group ) => {
		( group.items || [] ).forEach( ( item ) => {
			const next = SEVERITY_RANK[ item.severity ];
			if ( next !== undefined && next < rank ) {
				rank = next;
				worst = item.severity;
			}
		} );
	} );
	return worst;
}

/**
 * @param {Array<{ items?: unknown[] }>} groups
 */
function issueCount( groups ) {
	return groups.reduce(
		( total, group ) => total + ( group.items || [] ).length,
		0
	);
}

function KindIcon( { kind, sectionId, size } ) {
	const name = sectionId || kind;
	if ( name === 'ga4' || kind === 'metric' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<path d="M3 3v18h18" />
				<path d="M18 17V9" />
				<path d="M13 17V5" />
				<path d="M8 17v-3" />
			</Icon>
		);
	}
	if ( name === 'gsc' || kind === 'finding' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</Icon>
		);
	}
	if ( name === 'events' || kind === 'collision' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<circle cx="18" cy="18" r="3" />
				<circle cx="6" cy="6" r="3" />
				<path d="M6 21V9a9 9 0 0 0 9 9" />
			</Icon>
		);
	}
	if ( name === 'system' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
				<path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
				<path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
			</Icon>
		);
	}
	if ( name === 'environment' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<circle cx="12" cy="12" r="10" />
				<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
				<path d="M2 12h20" />
			</Icon>
		);
	}
	if ( kind === 'insight' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
				<path d="M9 18h6" />
				<path d="M10 22h4" />
			</Icon>
		);
	}
	if ( kind === 'analytics-error' ) {
		return (
			<Icon size={ size } strokeWidth={ 2 }>
				<path d="m19 5 3-3" />
				<path d="m2 22 3-3" />
				<path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
				<path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" />
			</Icon>
		);
	}
	return (
		<Icon size={ size } strokeWidth={ 2 }>
			<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
			<path d="M12 9v4" />
			<path d="M12 17h.01" />
		</Icon>
	);
}

function IssueRow( { item } ) {
	const severity = SEVERITY_LABEL[ item.severity ] ? item.severity : '';
	const summary = item.summary || '';
	const pages = Number( item.occurrenceCount );
	let pageLine = '';
	if ( pages === 1 ) {
		pageLine = __( 'on 1 page', 'pendulum-arc' );
	} else if ( pages > 1 ) {
		pageLine = sprintf(
			/* translators: %d: number of pages this issue appears on. */
			__( 'on %d pages', 'pendulum-arc' ),
			pages
		);
	}
	const showKey = CHECK_KINDS.includes( item.kind ) && item.key;
	return (
		<div className="arc-issue-row" data-severity={ severity || undefined }>
			<div className="arc-issue-row__main">
				<span
					className="arc-issue-row__well"
					data-severity={ severity || undefined }
				>
					<KindIcon kind={ item.kind } size={ 14 } />
				</span>
				<span className="arc-issue-row__copy">
					<span className="arc-issue-row__title">{ item.title }</span>
					{ summary ? (
						<span className="arc-issue-row__summary">
							{ summary }
						</span>
					) : null }
					{ pageLine && pageLine !== summary ? (
						<span className="arc-issue-row__summary">
							{ pageLine }
						</span>
					) : null }
				</span>
				{ severity ? (
					<span
						className="arc-pill arc-issue-row__pill"
						data-accent={ SEVERITY_ACCENT[ severity ] }
					>
						<span className="arc-pill__label">
							{ SEVERITY_LABEL[ severity ] }
						</span>
					</span>
				) : null }
			</div>
			{ item.fix ? (
				<div className="arc-issue-row__fix">
					<p>
						<Icon size={ 13 } strokeWidth={ 2 }>
							<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
						</Icon>
						{ __( 'Remediation', 'pendulum-arc' ) }
					</p>
					<p>{ item.fix }</p>
				</div>
			) : null }
			{ showKey ? (
				<p className="arc-issue-row__meta">
					<span
						className="arc-pill"
						data-accent="muted"
						data-size="xs"
					>
						<span className="arc-pill__label">
							<Icon size={ 11 } strokeWidth={ 2.25 }>
								<path d="M4 9h16" />
								<path d="M4 15h16" />
								<path d="M10 3 8 21" />
								<path d="M16 3l-2 18" />
							</Icon>
							<span className="arc-issue-row__key">
								{ item.key }
							</span>
						</span>
					</span>
				</p>
			) : null }
		</div>
	);
}

/**
 * Portal Issues bloom for the selected report.
 *
 * @param {Object}                                                             props
 * @param {Array<{ sectionId?: string, label: string, items: Array<Object> }>} props.groups
 */
export function IssueMenu( { groups } ) {
	const count = issueCount( groups );
	const [ open, setOpen ] = useState( false );
	const rootRef = useRef( null );
	const menuId = useId();

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
			}
		}
		function onKey( event ) {
			if ( event.key === 'Escape' ) {
				setOpen( false );
			}
		}
		document.addEventListener( 'mousedown', onPointer );
		document.addEventListener( 'keydown', onKey );
		return () => {
			document.removeEventListener( 'mousedown', onPointer );
			document.removeEventListener( 'keydown', onKey );
		};
	}, [ open ] );

	if ( count === 0 ) {
		return null;
	}

	const severity = worstSeverity( groups );
	const label = __( 'Issues', 'pendulum-arc' );
	const panelLabel = `${ label } (${ count })`;
	let rowIndex = 0;
	return (
		<div className="arc-issue-menu" ref={ rootRef }>
			<div
				className="arc-issue-menu__trigger"
				data-open={ open ? 'true' : undefined }
			>
				<button
					type="button"
					className="arc-issue-button"
					aria-label={ `${ label }: ${ count }` }
					aria-expanded={ open }
					aria-controls={ menuId }
					aria-haspopup="menu"
					onClick={ () => setOpen( ( value ) => ! value ) }
				>
					<span className="arc-issue-button__start">
						<span
							className="arc-issue-button__count"
							data-severity={ severity || 'medium' }
						>
							{ count > 99 ? '99+' : count }
						</span>
					</span>
					<span className="arc-issue-button__label">{ label }</span>
					<span
						className="arc-issue-button__end"
						data-open={ open ? 'true' : 'false' }
					>
						<Icon size={ 14 } strokeWidth={ 2.25 }>
							<path d="m6 9 6 6 6-6" />
						</Icon>
					</span>
				</button>
			</div>
			{ open ? (
				<div
					id={ menuId }
					className="arc-issue-menu__panel"
					role="menu"
					aria-label={ panelLabel }
					data-origin="top-right"
				>
					<div
						className="arc-issue-menu__shadow"
						aria-hidden="true"
					/>
					<div className="arc-issue-menu__iris">
						<div className="arc-issue-menu__chrome">
							<span>{ panelLabel }</span>
							<button
								type="button"
								className="arc-issue-menu__close"
								aria-label={ __( 'Close', 'pendulum-arc' ) }
								onClick={ () => setOpen( false ) }
							>
								<Icon size={ 12 } strokeWidth={ 2.25 }>
									<path d="M18 6 6 18" />
									<path d="m6 6 12 12" />
								</Icon>
							</button>
						</div>
						<div className="arc-issue-menu__body">
							{ groups.map( ( group ) => (
								<div key={ group.sectionId || group.label }>
									<p className="arc-issue-menu__group">
										<KindIcon
											sectionId={ group.sectionId }
											size={ 12 }
										/>
										{ group.label } ({ group.items.length })
									</p>
									{ group.items.map( ( item ) => {
										const delay = ( rowIndex + 1 ) * 0.08;
										rowIndex += 1;
										return (
											<div
												key={ `${ item.kind }:${ item.key }` }
												className="arc-issue-menu__item"
												style={ {
													'--arc-bloom-delay': `${ delay }s`,
												} }
												role="none"
											>
												<div
													role="menuitem"
													data-severity={
														SEVERITY_LABEL[
															item.severity
														]
															? item.severity
															: undefined
													}
												>
													<IssueRow item={ item } />
												</div>
											</div>
										);
									} ) }
								</div>
							) ) }
						</div>
					</div>
				</div>
			) : null }
		</div>
	);
}
