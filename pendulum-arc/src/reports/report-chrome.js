/**
 * WordPress dependencies
 */
import {
	createPortal,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from '../ui/icon';

export const PAGE_FOCUS_EVENT = 'pendulum-arc:focus-page';

/**
 * @param {Object} props
 * @param {string} props.text
 * @param {string} [props.query]
 */
export function Highlight( { text, query } ) {
	const value = String( text || '' );
	const needle = String( query || '' ).trim();
	if ( ! needle ) {
		return value;
	}
	const lower = value.toLowerCase();
	const q = needle.toLowerCase();
	const parts = [];
	let start = 0;
	let index = lower.indexOf( q, start );
	let key = 0;
	while ( index !== -1 ) {
		if ( index > start ) {
			parts.push( value.slice( start, index ) );
		}
		parts.push(
			<mark key={ key } className="arc-search-hit">
				{ value.slice( index, index + q.length ) }
			</mark>
		);
		key += 1;
		start = index + q.length;
		index = lower.indexOf( q, start );
	}
	if ( start < value.length ) {
		parts.push( value.slice( start ) );
	}
	return parts;
}

/**
 * @param {HTMLElement} button
 * @param {HTMLElement} panel
 */
function placeInfoTip( button, panel ) {
	const rect = button.getBoundingClientRect();
	const tip = panel.getBoundingClientRect();
	const gap = 8;
	const edge = 8;
	let left = rect.left + rect.width / 2 - tip.width / 2;
	let top = rect.top - gap - tip.height;
	let arrow = 'bottom';
	left = Math.max(
		edge,
		Math.min( left, window.innerWidth - tip.width - edge )
	);
	if ( top < edge ) {
		top = rect.bottom + gap;
		arrow = 'top';
	}
	const arrowLeft = Math.max(
		20,
		Math.min( rect.left + rect.width / 2 - left, tip.width - 20 )
	);
	panel.dataset.arrow = arrow;
	panel.style.left = `${ left }px`;
	panel.style.top = `${ top }px`;
	panel.style.setProperty( '--arc-info-arrow', `${ arrowLeft }px` );
	panel.style.visibility = 'visible';
}

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.body
 */
export function InfoTip( { title, body } ) {
	const label = `${ __( 'About', 'pendulum-arc' ) } ${ title }`;
	const [ open, setOpen ] = useState( false );
	const buttonRef = useRef( null );
	const panelRef = useRef( null );

	useLayoutEffect( () => {
		if ( ! open || ! buttonRef.current || ! panelRef.current ) {
			return undefined;
		}
		placeInfoTip( buttonRef.current, panelRef.current );
		return undefined;
	}, [ open, body ] );

	const panel =
		open && typeof document !== 'undefined'
			? createPortal(
					<span
						ref={ panelRef }
						className="arc-info__panel"
						role="tooltip"
						data-arrow="bottom"
					>
						<span className="arc-info__shadow" aria-hidden="true" />
						<span className="arc-info__glass">{ body }</span>
					</span>,
					document.body
				)
			: null;

	return (
		<span
			className="arc-info"
			onMouseEnter={ () => setOpen( true ) }
			onMouseLeave={ () => setOpen( false ) }
			onFocus={ () => setOpen( true ) }
			onBlur={ () => setOpen( false ) }
		>
			<button
				ref={ buttonRef }
				type="button"
				className="arc-info__button"
				aria-label={ label }
			>
				<Icon size={ 12 } strokeWidth={ 2.25 }>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</Icon>
			</button>
			{ panel }
		</span>
	);
}

/**
 * Hover tooltip for a truncated value. The panel is the full text.
 *
 * @param {Object}                    props
 * @param {string[]}                  props.lines
 * @param {import('react').ReactNode} props.children
 */
export function ValueTip( { lines, children } ) {
	const items = ( lines || [] )
		.map( ( line ) => String( line || '' ).trim() )
		.filter( Boolean );
	const tipKey = items.join( '\n' );
	const [ open, setOpen ] = useState( false );
	const anchorRef = useRef( null );
	const panelRef = useRef( null );
	const timer = useRef( null );

	useLayoutEffect( () => {
		if ( ! open || ! anchorRef.current || ! panelRef.current ) {
			return undefined;
		}
		placeInfoTip( anchorRef.current, panelRef.current );
		return undefined;
	}, [ open, tipKey ] );

	useEffect(
		() => () => {
			window.clearTimeout( timer.current );
		},
		[]
	);

	if ( items.length === 0 ) {
		return children;
	}

	function show() {
		window.clearTimeout( timer.current );
		timer.current = window.setTimeout( () => setOpen( true ), 120 );
	}

	function hide() {
		window.clearTimeout( timer.current );
		setOpen( false );
	}

	const panel =
		open && typeof document !== 'undefined'
			? createPortal(
					<span
						ref={ panelRef }
						className="arc-info__panel arc-value-tip__panel"
						role="tooltip"
						data-arrow="bottom"
					>
						<span className="arc-info__shadow" aria-hidden="true" />
						<span className="arc-info__glass arc-value-tip__body">
							{ items.map( ( line, index ) => (
								<span
									key={ `${ index }-${ line }` }
									className="arc-value-tip__line"
								>
									{ line }
								</span>
							) ) }
						</span>
					</span>,
					document.body
				)
			: null;

	return (
		<span
			ref={ anchorRef }
			className="arc-value-tip"
			onMouseEnter={ show }
			onMouseLeave={ hide }
		>
			{ children }
			{ panel }
		</span>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.value
 * @param {(value: string) => void} props.onChange
 * @param {boolean}  [props.disabled]
 */
export function SearchField( { value, onChange, disabled = false } ) {
	const label = __( 'Search', 'pendulum-arc' );
	return (
		<input
			className="arc-table-search"
			type="search"
			value={ value }
			aria-label={ label }
			placeholder={ label }
			autoComplete="off"
			spellCheck={ false }
			disabled={ disabled || undefined }
			aria-busy={ disabled || undefined }
			onChange={ ( event ) => onChange( event.target.value ) }
			onKeyDown={ ( event ) => {
				if ( event.key === 'Enter' ) {
					event.preventDefault();
				}
			} }
		/>
	);
}

/**
 * @param {Object}  props
 * @param {boolean} props.active
 * @param {string}  props.dir
 */
export function SortArrows( { active, dir } ) {
	return (
		<span className="arc-sort__arrows" aria-hidden="true">
			<span className="arc-sort__up">
				<Icon size={ 10 } strokeWidth={ 2.5 }>
					<path
						d="m18 15-6-6-6 6"
						data-on={ active && dir === 'asc' ? 'true' : undefined }
					/>
				</Icon>
			</span>
			<span className="arc-sort__down">
				<Icon size={ 10 } strokeWidth={ 2.5 }>
					<path
						d="m6 9 6 6 6-6"
						data-on={
							active && dir === 'desc' ? 'true' : undefined
						}
					/>
				</Icon>
			</span>
		</span>
	);
}

/**
 * @param {HTMLElement} trigger
 * @param {HTMLElement} panel
 * @param {number}      width
 */
function placeCountBloom( trigger, panel, width ) {
	const rect = trigger.getBoundingClientRect();
	const bar = document.getElementById( 'wpadminbar' );
	const topEdge = bar ? bar.getBoundingClientRect().height + 8 : 12;
	const sideEdge = 12;
	const viewWidth = window.innerWidth;
	const viewHeight = window.innerHeight;
	const maxHeight = Math.max( 160, rect.bottom - topEdge );
	panel.style.maxHeight = `${ maxHeight }px`;
	panel.style.width = `${ width }rem`;
	const size = panel.getBoundingClientRect();
	const panelWidth = size.width || width * 16;
	const height = Math.min( size.height, maxHeight );
	const left = Math.max(
		sideEdge,
		Math.min( rect.right - panelWidth, viewWidth - panelWidth - sideEdge )
	);
	const top = Math.max(
		topEdge,
		Math.min( rect.bottom - height, viewHeight - height - sideEdge )
	);
	panel.style.left = `${ left }px`;
	panel.style.top = `${ top }px`;
	panel.style.visibility = 'visible';
}

/**
 * Compact dropdown, the same shape as the form fields menu.
 *
 * @param {Object}                                                  props
 * @param {string}                                                  props.label
 * @param {string}                                                  [props.title]
 * @param {string}                                                  [props.accent]
 * @param {Array<{ key?: string, title: string, detail?: string }>} props.items
 * @param {string}                                                  [props.query]
 * @param {number}                                                  [props.width]
 * @param {import('react').ReactNode}                               [props.children]
 */
export function CountBloom( {
	label,
	title = '',
	accent = 'muted',
	items,
	query = '',
	width = 16,
	children = null,
} ) {
	const heading = title || label;
	const [ open, setOpen ] = useState( false );
	const rootRef = useRef( null );
	const panelRef = useRef( null );
	const menuId = useId();

	useLayoutEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const trigger = rootRef.current;
		const panel = panelRef.current;
		if ( ! trigger || ! panel ) {
			return undefined;
		}
		placeCountBloom( trigger, panel, width );
		return undefined;
	}, [ open, items, width, children ] );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		function place() {
			const trigger = rootRef.current;
			const panel = panelRef.current;
			if ( ! trigger || ! panel ) {
				return;
			}
			placeCountBloom( trigger, panel, width );
		}
		function onPointer( event ) {
			if ( rootRef.current && rootRef.current.contains( event.target ) ) {
				return;
			}
			if (
				panelRef.current &&
				panelRef.current.contains( event.target )
			) {
				return;
			}
			setOpen( false );
		}
		function onKey( event ) {
			if ( event.key === 'Escape' ) {
				setOpen( false );
			}
		}
		document.addEventListener( 'mousedown', onPointer );
		document.addEventListener( 'keydown', onKey );
		window.addEventListener( 'resize', place );
		document.addEventListener( 'scroll', place, true );
		return () => {
			document.removeEventListener( 'mousedown', onPointer );
			document.removeEventListener( 'keydown', onKey );
			window.removeEventListener( 'resize', place );
			document.removeEventListener( 'scroll', place, true );
		};
	}, [ open, width ] );

	function toggle( event ) {
		event.stopPropagation();
		setOpen( ( value ) => ! value );
	}

	if ( ! items || items.length === 0 ) {
		return (
			<span className="arc-count-bloom__idle" data-accent={ accent }>
				{ label }
			</span>
		);
	}

	const panel =
		open && typeof document !== 'undefined'
			? createPortal(
					<div
						ref={ panelRef }
						id={ menuId }
						className="arc-count-bloom__panel"
						role="menu"
						aria-label={ heading }
						data-origin="bottom-right"
					>
						<div
							className="arc-count-bloom__shadow"
							aria-hidden="true"
						/>
						<div className="arc-count-bloom__iris">
							<div className="arc-count-bloom__chrome">
								<span>{ heading }</span>
								<button
									type="button"
									className="arc-count-bloom__close"
									aria-label={ __( 'Close', 'pendulum-arc' ) }
									onClick={ () => setOpen( false ) }
								>
									<Icon size={ 12 } strokeWidth={ 2.25 }>
										<path d="M18 6 6 18" />
										<path d="m6 6 12 12" />
									</Icon>
								</button>
							</div>
							<div
								className={
									children
										? 'arc-count-bloom__body arc-count-bloom__body--issues'
										: 'arc-count-bloom__body'
								}
							>
								{ children ||
									items.map( ( item, index ) => (
										<div
											key={
												item.key ||
												`${ item.title }-${ index }`
											}
											className="arc-count-bloom__item"
											role="menuitem"
										>
											<span className="arc-count-bloom__title">
												<Highlight
													text={ item.title }
													query={ query }
												/>
											</span>
											{ item.detail ? (
												<span className="arc-count-bloom__detail">
													{ item.detail }
												</span>
											) : null }
										</div>
									) ) }
							</div>
						</div>
					</div>,
					document.body
				)
			: null;

	return (
		<span className="arc-count-bloom" ref={ rootRef }>
			<span
				className="arc-count-bloom__trigger-wrap"
				data-open={ open ? 'true' : undefined }
			>
				<button
					type="button"
					className="arc-count-bloom__trigger"
					data-accent={ accent }
					aria-expanded={ open }
					aria-haspopup="menu"
					aria-controls={ menuId }
					onClick={ toggle }
				>
					<span className="arc-count-bloom__label">{ label }</span>
					<span className="arc-count-bloom__chevron">
						<Icon size={ 12 } strokeWidth={ 2.25 }>
							<path
								d="m6 9 6 6 6-6"
								data-open={ open ? 'true' : 'false' }
							/>
						</Icon>
					</span>
				</button>
			</span>
			{ panel }
		</span>
	);
}

/**
 * @param {string} viewport
 */
export function viewportRank( viewport ) {
	const lower = String( viewport || '' ).toLowerCase();
	if (
		lower.includes( 'mobile' ) ||
		lower.includes( 'phone' ) ||
		lower.includes( 'handset' )
	) {
		return 1;
	}
	if (
		lower.includes( 'desktop' ) ||
		lower.includes( 'laptop' ) ||
		lower === 'wide'
	) {
		return 2;
	}
	return 0;
}

/**
 * @param {string} left
 * @param {string} right
 */
export function compareViewport( left, right ) {
	const rank = viewportRank( left ) - viewportRank( right );
	if ( rank !== 0 ) {
		return rank;
	}
	return String( left || '' ).localeCompare(
		String( right || '' ),
		undefined,
		{
			sensitivity: 'base',
		}
	);
}

/**
 * @param {number|null|undefined} left
 * @param {number|null|undefined} right
 */
export function compareNumber( left, right ) {
	const a = Number.isFinite( left ) ? left : Number.NEGATIVE_INFINITY;
	const b = Number.isFinite( right ) ? right : Number.NEGATIVE_INFINITY;
	return a - b;
}

/**
 * @param {string} key
 */
export function defaultDirForSortKey( key ) {
	if ( key === 'url' ) {
		return 'asc';
	}
	return 'desc';
}

/**
 * @param {string} url
 */
function pageUrlKey( url ) {
	try {
		const parsed = new URL( url );
		const path = parsed.pathname.replace( /\/+$/, '' ) || '/';
		return `${ parsed.origin }${ path }`;
	} catch {
		return String( url || '' );
	}
}

/**
 * Scroll the security row for this issue into view and pulse it.
 *
 * @param {Object} item
 * @param {string} [item.sectionId]
 * @param {string} [item.kind]
 * @param {string} [item.key]
 * @return {boolean} True when a matching row was on the page.
 */
export function focusIssueTarget( item ) {
	const section = item && item.sectionId;
	const kind = item && item.kind;
	const key = item && item.key;
	if ( ! section || ! kind || ! key || typeof document === 'undefined' ) {
		return false;
	}
	const target = `${ section }::${ kind }:${ key }`.replace( /"/g, '' );
	const node = document.querySelector( `[data-issue-target="${ target }"]` );
	if ( ! node ) {
		return false;
	}
	const row =
		node.closest(
			'.arc-harvest, .arc-lens-row, .arc-surface-row, .arc-social-row'
		) || node;
	row.scrollIntoView( { block: 'center', behavior: 'smooth' } );
	row.classList.remove( 'arc-issue-pulse' );
	void row.offsetWidth;
	row.classList.add( 'arc-issue-pulse' );
	window.setTimeout( () => {
		row.classList.remove( 'arc-issue-pulse' );
	}, 6000 );
	return true;
}

/**
 * Scroll the page-analysis row for this url into view and mark it.
 *
 * @param {string} url
 */
export function focusPageRow( url ) {
	const target = pageUrlKey( url );
	const rows = document.querySelectorAll( '[data-page-url]' );
	let first = null;
	rows.forEach( ( row ) => {
		const match =
			pageUrlKey( row.getAttribute( 'data-page-url' ) ) === target;
		if ( match ) {
			row.setAttribute( 'data-page-selected', 'true' );
			if ( ! first ) {
				first = row;
			}
		} else {
			row.removeAttribute( 'data-page-selected' );
		}
	} );
	if ( first && typeof first.scrollIntoView === 'function' ) {
		first.scrollIntoView( { block: 'center', behavior: 'smooth' } );
	}
}
