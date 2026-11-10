/**
 * WordPress dependencies
 */
import { Fragment, useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ColumnMark, StrokeMark } from '../ui/column-icon';
import { Icon } from '../ui/icon';
import { MoodMark, scoreMood } from '../ui/score-card';
import {
	CountBloom,
	Highlight,
	InfoTip,
	PAGE_FOCUS_EVENT,
	SearchField,
	SortArrows,
	compareNumber,
	compareViewport,
	defaultDirForSortKey,
	focusPageRow,
} from './report-chrome';
import { IssueRow } from './issue-menu';
import { fetchReportTable } from '../api';

const MOOD_ACCENT = {
	great: 'emerald',
	good: 'lime',
	ok: 'amber',
	poor: 'orange',
	bad: 'red',
};

const MOOD_LABEL = {
	great: __( 'Excellent', 'pendulum-arc' ),
	good: __( 'Good', 'pendulum-arc' ),
	ok: __( 'Needs work', 'pendulum-arc' ),
	poor: __( 'Critical gaps', 'pendulum-arc' ),
	bad: __( 'Critical gaps', 'pendulum-arc' ),
};

const PLATFORM_HOSTS = [
	[ 'twitter.com', 'x' ],
	[ 'x.com', 'x' ],
	[ 'facebook.com', 'facebook' ],
	[ 'fb.com', 'facebook' ],
	[ 'instagram.com', 'instagram' ],
	[ 'linkedin.com', 'linkedin' ],
	[ 'youtube.com', 'youtube' ],
	[ 'youtu.be', 'youtube' ],
	[ 'github.com', 'github' ],
	[ 'vercel.com', 'vercel' ],
	[ 'tiktok.com', 'tiktok' ],
	[ 'pinterest.com', 'pinterest' ],
	[ 'threads.net', 'threads' ],
	[ 'bsky.app', 'bluesky' ],
	[ 'wa.me', 'whatsapp' ],
	[ 'whatsapp.com', 'whatsapp' ],
	[ 'discord.gg', 'discord' ],
	[ 'discord.com', 'discord' ],
	[ 'twitch.tv', 'twitch' ],
	[ 'vimeo.com', 'vimeo' ],
	[ 'dribbble.com', 'dribbble' ],
	[ 'behance.net', 'behance' ],
];

const PLATFORM_LABELS = {
	behance: 'Behance',
	bluesky: 'Bluesky',
	discord: 'Discord',
	dribbble: 'Dribbble',
	facebook: 'Facebook',
	github: 'GitHub',
	instagram: 'Instagram',
	linkedin: 'LinkedIn',
	pinterest: 'Pinterest',
	threads: 'Threads',
	tiktok: 'TikTok',
	twitch: 'Twitch',
	vercel: 'Vercel',
	vimeo: 'Vimeo',
	rss: 'RSS',
	whatsapp: 'WhatsApp',
	x: 'X',
	youtube: 'YouTube',
};

const SEVERITY_ACCENT = {
	critical: 'red',
	high: 'coral',
	medium: 'orange',
	low: 'amber',
};

const SEO_PAGES_TIP = __(
	'Per-page SEO signals from this crawl. Open a row for scores, readability, page metrics, keyphrase checks, and issues. The social card and search result are on the Preview tab. The URL column shows a keyphrase tag under the path when a phrase is set. Search matches the page title, URL, keyphrase, and preview text (title, description, site, and host).',
	'pendulum-arc'
);

const SOCIAL_TIP = __(
	"Social and provider links harvested from crawled pages. Each row leads with that service's icon. Showing you what your website will be affiliated with. This inventory does not change the score.",
	'pendulum-arc'
);

const FORMS_TIP = __(
	'Every form on crawled pages. The name is the form id, or the form name when there is no id. The same id or name is one form even when the fields differ; each field list is its own line. With no id and no name, the name is unknown and only the same field list is grouped. Single means one page, Multiple means some crawled pages, and Sitewide means every crawled page. A line names a captcha or honeypot when one was found, and that pill says the form is protected by that check. Otherwise it shows Unprotected: no form protection was detected. This inventory does not change the score.',
	'pendulum-arc'
);

const PAGE_HEIGHT_KEY = 'pendulum-arc:table-height:seo-pages';
const A11Y_PAGE_HEIGHT_KEY = 'pendulum-arc:table-height:a11y-pages';
const AI_PAGE_HEIGHT_KEY = 'pendulum-arc:table-height:ai-pages';

const A11Y_PAGES_TIP = __(
	"Per-page accessibility results from this run. Filter by mobile or desktop. The preview is the audit screenshot. The Issues count opens that page's findings. The URL column shows the page title above the path when this run stored one, and an edit link when this site has that page. Search matches the page title and URL.",
	'pendulum-arc'
);

const AI_PAGES_TIP = __(
	"Per-page AI visibility from this run. Search matches the page title and URL. The Issues count opens that page's findings. SSR gap, word counts, and AI meta show when this run recorded them. The URL column shows the page title above the path when this run stored a heading, and an edit link when this site has that page.",
	'pendulum-arc'
);

const PROVIDER_IDS = new Set( [ 'github', 'vercel' ] );

const PRESENCE_LABEL = {
	single: __( 'Single', 'pendulum-arc' ),
	multiple: __( 'Multiple', 'pendulum-arc' ),
	sitewide: __( 'Sitewide', 'pendulum-arc' ),
};

const PROTECTION_LABEL = {
	recaptcha: 'reCAPTCHA',
	hcaptcha: 'hCaptcha',
	turnstile: 'Turnstile',
	'friendly-captcha': 'Friendly Captcha',
	honeypot: 'Honeypot',
	other: 'Other',
};

function heat( value ) {
	const count = Number( value ) || 0;
	if ( count <= 0 ) {
		return 'idle';
	}
	if ( count <= 5 ) {
		return 'amber';
	}
	if ( count <= 20 ) {
		return 'orange';
	}
	return 'red';
}

function IssueCount( { value } ) {
	const count = Number( value );
	const shown = Number.isFinite( count ) ? count : 0;
	return (
		<span className="arc-issue-count" data-heat={ heat( shown ) }>
			{ shown }
		</span>
	);
}

function ScorePill( { mood, value } ) {
	const label = MOOD_LABEL[ mood ];
	const accent = MOOD_ACCENT[ mood ] || 'muted';
	if ( ! label ) {
		return <span className="arc-report-cell__text">{ value }</span>;
	}
	return (
		<span
			className="arc-pill"
			data-accent={ accent }
			title={ `${ value } (${ label })` }
		>
			<span className="arc-pill__label">{ label }</span>
			<span className="arc-pill__value">
				{ value }
				<MoodMark mood={ mood } size={ 12 } />
			</span>
		</span>
	);
}

function MutedPill( { label, title } ) {
	if ( ! label ) {
		return null;
	}
	return (
		<span
			className="arc-pill"
			data-accent="muted"
			data-size="md"
			title={ title }
		>
			<span className="arc-pill__label">{ label }</span>
		</span>
	);
}

function PathLink( { href, label, editHref, query } ) {
	return (
		<span className="arc-path-cell">
			{ href ? (
				<a
					className="arc-page-link"
					href={ href }
					target="_blank"
					rel="noreferrer"
				>
					<span className="arc-page-link__label">
						<Highlight text={ label } query={ query } />
					</span>
					<StrokeMark name="external" size={ 12 } strokeWidth={ 2 } />
				</a>
			) : (
				<span className="arc-page-link__label">
					<Highlight text={ label } query={ query } />
				</span>
			) }
			{ editHref ? (
				<a className="arc-page-link" href={ editHref }>
					<span className="arc-page-link__label">
						{ __( 'Edit', 'pendulum-arc' ) }
					</span>
				</a>
			) : null }
		</span>
	);
}

function columnCell( block, row, id ) {
	const index = ( block.columns || [] ).findIndex(
		( column ) => column.id === id
	);
	if ( index < 0 ) {
		return null;
	}
	return ( row.cells || [] )[ index ] || null;
}

function hostOf( url ) {
	try {
		return new URL( url ).host;
	} catch {
		return '';
	}
}

function displayOf( url ) {
	try {
		const parsed = new URL( url );
		const path = parsed.pathname === '/' ? '' : parsed.pathname;
		return `${ parsed.host }${ path }`;
	} catch {
		return url;
	}
}

function isDesktopViewport( viewport ) {
	const lower = String( viewport || '' ).toLowerCase();
	return (
		lower.includes( 'desktop' ) ||
		lower.includes( 'laptop' ) ||
		lower === 'wide'
	);
}

function isMobileViewport( viewport ) {
	const lower = String( viewport || '' ).toLowerCase();
	return (
		lower.includes( 'mobile' ) ||
		lower.includes( 'phone' ) ||
		lower.includes( 'handset' )
	);
}

function keyphraseCaption( caption ) {
	const text = String( caption || '' );
	const match = text.match(
		/^Keyphrase(?: score)?\s+(\d+(?:\.\d+)?)(?:\s·\s([\s\S]+))?$/
	);
	if ( ! match ) {
		return { score: '', phrases: [] };
	}
	return {
		score: match[ 1 ],
		phrases: ( match[ 2 ] || '' )
			.split( ',' )
			.map( ( phrase ) => phrase.trim() )
			.filter( Boolean ),
	};
}

function seoPageOf( block, row ) {
	if ( row.page ) {
		const urlCell = columnCell( block, row, 'url' );
		return {
			...row.page,
			editHref: ( urlCell && urlCell.editHref ) || '',
			preview: columnCell( block, row, 'preview' ),
		};
	}
	const urlCell = columnCell( block, row, 'url' ) || {};
	const scoreCell = columnCell( block, row, 'score' ) || {};
	const parsed = keyphraseCaption( scoreCell.caption );
	const failed = scoreCell.text === 'Load failed';
	const links = columnCell( block, row, 'links' );
	const issues = columnCell( block, row, 'issues' );
	return {
		title: '',
		path: urlCell.text || '',
		url: urlCell.href || '',
		viewport: ( columnCell( block, row, 'viewport' ) || {} ).text || '',
		keyphrases: parsed.phrases,
		keyphraseScore: parsed.score || null,
		score: scoreCell.text || '-',
		error: failed ? scoreCell.caption || '' : null,
		siteName: null,
		brokenLinkCount:
			links && links.text !== '-' ? Number( links.text ) || 0 : 0,
		issueCount: Number( issues && issues.text ) || 0,
		issues: [],
		editHref: urlCell.editHref || '',
		preview: columnCell( block, row, 'preview' ),
		mood: scoreCell.mood,
		hideLinks: links && links.text === '-',
	};
}

const TABLE_PAGE_SIZE = 50;

function asCount( value, fallback ) {
	const number = Number( value );
	return Number.isFinite( number ) && number >= 0 ? number : fallback;
}

/**
 * Windows are 50 rows. A crawl total wins when the reported page count
 * only describes the rows already on screen.
 *
 * @param {number|undefined|null} pageCount Reported page count.
 * @param {number|undefined|null} total     Rows in the crawl, or this search.
 */
function tablePageCount( pageCount, total ) {
	const reported = Math.max( 1, asCount( pageCount, 1 ) );
	if ( total === undefined || total === null ) {
		return reported;
	}
	const fromTotal = Math.max(
		1,
		Math.ceil( asCount( total, 0 ) / TABLE_PAGE_SIZE )
	);
	return Math.max( reported, fromTotal );
}

function listStamp( block ) {
	const rows = block.rows || [];
	const first = rows[ 0 ] && rows[ 0 ].id ? rows[ 0 ].id : '';
	const last =
		rows.length > 0 && rows[ rows.length - 1 ].id
			? rows[ rows.length - 1 ].id
			: '';
	return `${ block.pageIndex ?? 0 }|${ block.total ?? '' }|${ rows.length }|${ first }|${ last }`;
}

function useReportTable( block, service, table, runId = '' ) {
	const [ query, setQuery ] = useState( '' );
	const [ request, setRequest ] = useState( () => ( {
		page: asCount( block.pageIndex, 0 ),
		query: '',
		viewport: '',
	} ) );
	const [ loaded, setLoaded ] = useState( null );
	const [ pending, setPending ] = useState( false );
	const requestId = useRef( 0 );
	const stamp = listStamp( block );

	useEffect( () => {
		setQuery( '' );
		setRequest( {
			page: asCount( block.pageIndex, 0 ),
			query: '',
			viewport: '',
		} );
		setLoaded( null );
		setPending( false );
	}, [ stamp ] ); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect( () => {
		const handle = window.setTimeout( () => {
			const next = query.trim();
			setRequest( ( current ) =>
				current.query === next
					? current
					: { ...current, query: next, page: 0 }
			);
		}, 250 );
		return () => window.clearTimeout( handle );
	}, [ query ] );

	const idle =
		request.page === asCount( block.pageIndex, 0 ) &&
		request.query === '' &&
		request.viewport === '';

	useEffect( () => {
		if ( idle ) {
			return undefined;
		}
		const token = ++requestId.current;
		setPending( true );
		let cancelled = false;
		fetchReportTable( service, table, {
			page: request.page,
			q: request.query,
			viewport: request.viewport,
			run: runId || '',
		} )
			.then( ( result ) => {
				if (
					cancelled ||
					token !== requestId.current ||
					! result ||
					result.error ||
					result.kind !== 'table'
				) {
					return;
				}
				setLoaded( result );
			} )
			.catch( () => {} )
			.finally( () => {
				if ( ! cancelled && token === requestId.current ) {
					setPending( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [
		idle,
		service,
		table,
		runId,
		request.page,
		request.query,
		request.viewport,
	] );

	const current = idle || ! loaded ? block : loaded;
	const total =
		current.total === undefined || current.total === null
			? ( current.rows || [] ).length
			: asCount( current.total, 0 );
	function goToPage( page ) {
		setRequest( ( currentRequest ) => ( { ...currentRequest, page } ) );
	}
	function setViewport( viewport ) {
		setRequest( ( currentRequest ) =>
			currentRequest.viewport === viewport
				? currentRequest
				: { ...currentRequest, viewport, page: 0 }
		);
	}

	return {
		rows: current.rows || [],
		columns: current.columns || block.columns || [],
		source: current,
		pageIndex: asCount( current.pageIndex, request.page ),
		pageCount: tablePageCount(
			current.pageCount,
			current.total === undefined || current.total === null
				? undefined
				: total
		),
		total,
		query,
		setQuery,
		viewport: request.viewport,
		setViewport,
		viewports: current.viewports || block.viewports || [],
		pending,
		remote: ! idle,
		goToPage,
	};
}

function TablePager( { pageIndex, pageCount, pending, onPage } ) {
	if ( pageCount <= 1 ) {
		return null;
	}
	const atStart = pageIndex <= 0;
	const atEnd = pageIndex + 1 >= pageCount;
	return (
		<nav
			className="arc-table-pager"
			aria-label={ __( 'Pagination', 'pendulum-arc' ) }
		>
			<button
				type="button"
				disabled={ pending || atStart }
				aria-label={ __( 'Previous', 'pendulum-arc' ) }
				title={ __( 'Previous', 'pendulum-arc' ) }
				onClick={ () => onPage( pageIndex - 1 ) }
			>
				<Icon size={ 12 } strokeWidth={ 2.25 }>
					<path d="m15 18-6-6 6-6" />
				</Icon>
			</button>
			<span
				className="arc-table-pager__count"
				aria-live="polite"
				aria-label={ sprintf(
					/* translators: 1: current page, 2: page count. */
					__( 'Page %1$d of %2$d', 'pendulum-arc' ),
					pageIndex + 1,
					pageCount
				) }
			>
				{ sprintf(
					/* translators: 1: current page, 2: page count. */
					__( '%1$d / %2$d', 'pendulum-arc' ),
					pageIndex + 1,
					pageCount
				) }
			</span>
			<button
				type="button"
				disabled={ pending || atEnd }
				aria-label={ __( 'Next', 'pendulum-arc' ) }
				title={ __( 'Next', 'pendulum-arc' ) }
				onClick={ () => onPage( pageIndex + 1 ) }
			>
				<Icon size={ 12 } strokeWidth={ 2.25 }>
					<path d="m9 18 6-6-6-6" />
				</Icon>
			</button>
		</nav>
	);
}

function TableCard( {
	block,
	columns,
	children,
	count,
	tip,
	query,
	onQuery,
	sort,
	onSort,
	expanded,
	onToggleHeight,
	emptySearch,
	filters,
	pageIndex = 0,
	pager = null,
} ) {
	const searchable = typeof onQuery === 'function';
	const sortable = typeof onSort === 'function';
	const scrollRef = useRef( null );
	useEffect( () => {
		if ( scrollRef.current ) {
			scrollRef.current.scrollTop = 0;
		}
	}, [ pageIndex ] );
	return (
		<section
			className="arc-report-block arc-table-card"
			data-span={ block.span || 'full' }
		>
			<div className="arc-table-card__bar">
				<h3>{ block.heading }</h3>
				<span className="arc-pill" data-accent="muted" data-size="xs">
					<span className="arc-pill__label">{ count }</span>
				</span>
				{ searchable ? (
					<SearchField value={ query } onChange={ onQuery } />
				) : null }
				{ filters }
				{ tip ? (
					<InfoTip title={ block.heading } body={ tip } />
				) : null }
				{ pager || typeof onToggleHeight === 'function' ? (
					<div className="arc-table-card__tools">
						{ pager }
						{ typeof onToggleHeight === 'function' ? (
							<button
								type="button"
								className="arc-table-card__expand"
								aria-label={
									expanded
										? __(
												'Constrain list height',
												'pendulum-arc'
											)
										: __( 'Show full list', 'pendulum-arc' )
								}
								aria-pressed={ expanded }
								onClick={ onToggleHeight }
							>
								<Icon size={ 14 } strokeWidth={ 1.75 }>
									{ expanded ? (
										<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
									) : (
										<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
									) }
								</Icon>
							</button>
						) : null }
					</div>
				) : null }
			</div>
			{ count === 0 && ! searchable ? (
				<p className="arc-table-card__empty">{ block.empty }</p>
			) : (
				<div
					ref={ scrollRef }
					className="arc-table-card__scroll"
					data-constrain={
						typeof onToggleHeight === 'function' && ! expanded
							? 'true'
							: undefined
					}
				>
					<table className="arc-report-table">
						<thead>
							<tr>
								{ columns.map( ( column ) => (
									<th
										key={ column.id }
										data-align={ column.align || 'start' }
									>
										{ sortable &&
										column.id !== 'preview' ? (
											<button
												type="button"
												className="arc-sort"
												data-active={
													sort &&
													sort.key === column.id
														? 'true'
														: undefined
												}
												onClick={ () =>
													onSort( column.id )
												}
											>
												<span className="arc-report-table__label">
													<ColumnMark
														id={ column.id }
													/>
													{ column.label }
												</span>
												<SortArrows
													active={
														sort &&
														sort.key === column.id
													}
													dir={
														sort ? sort.dir : 'asc'
													}
												/>
											</button>
										) : (
											<span className="arc-report-table__label">
												<ColumnMark id={ column.id } />
												{ column.label }
											</span>
										) }
									</th>
								) ) }
							</tr>
						</thead>
						<tbody>
							{ count === 0 ? (
								<tr>
									<td
										className="arc-table-card__miss"
										colSpan={ columns.length }
									>
										{ emptySearch || block.empty }
									</td>
								</tr>
							) : (
								children
							) }
						</tbody>
					</table>
				</div>
			) }
		</section>
	);
}

function InventoryCard( {
	block,
	icon,
	children,
	count,
	span = 'half',
	tip,
	search,
	filtering,
	hasContent,
	pageIndex = 0,
	pager = null,
} ) {
	const show = hasContent ?? count > 0;
	const bodyRef = useRef( null );
	useEffect( () => {
		if ( bodyRef.current ) {
			bodyRef.current.scrollTop = 0;
		}
	}, [ pageIndex ] );
	return (
		<section
			className="arc-report-block arc-security-panel arc-inventory"
			data-span={ span }
		>
			<div className="arc-security-panel__bar">
				<span className="arc-security-panel__icon">
					<StrokeMark name={ icon } />
				</span>
				<h3>{ block.heading }</h3>
				<span className="arc-pill" data-accent="muted" data-size="md">
					<span className="arc-pill__label">{ count }</span>
				</span>
				{ search }
				{ tip ? (
					<InfoTip title={ block.heading } body={ tip } />
				) : null }
				{ pager }
			</div>
			<div ref={ bodyRef } className="arc-inventory__body">
				{ show ? (
					children
				) : (
					<p className="arc-security-panel__empty">
						{ filtering
							? __( 'No rows match this search.', 'pendulum-arc' )
							: block.empty }
					</p>
				) }
			</div>
		</section>
	);
}

function SeoPreview( { page, query } ) {
	const cell = page.preview || {};
	const src = cell.image && cell.image.src ? cell.image.src : '';
	const title = String( cell.text || page.title || '' ).trim();
	const caption = String( cell.caption || '' ).trim();
	const host = hostOf( page.url );
	const description = caption && caption !== host ? caption : '';
	const site = String( page.siteName || host || '' ).trim();
	const [ failed, setFailed ] = useState( false );
	const [ ready, setReady ] = useState( false );
	const missingTitle = __( 'Missing title', 'pendulum-arc' );
	const missingDescription = __( 'Missing description', 'pendulum-arc' );
	if ( page.error ) {
		return (
			<span className="arc-preview-card__fallback-path">
				{ page.path }
			</span>
		);
	}
	return (
		<div className="arc-preview-card">
			<div className="arc-preview-card__media">
				{ src && ! failed ? (
					<img
						src={ src }
						alt=""
						data-hidden={ ready ? undefined : 'true' }
						onLoad={ () => setReady( true ) }
						onError={ () => setFailed( true ) }
					/>
				) : null }
				{ ! src || failed ? (
					<span className="arc-preview-card__fallback">
						<StrokeMark
							name={ failed ? 'unlink' : 'image' }
							size={ 14 }
							strokeWidth={ 1.5 }
						/>
					</span>
				) : null }
			</div>
			<div className="arc-preview-card__body">
				{ site ? (
					<p className="arc-preview-card__site">
						<Highlight text={ site } query={ query } />
					</p>
				) : null }
				<p
					className="arc-preview-card__title"
					data-missing={ title ? undefined : 'true' }
				>
					{ title ? (
						<Highlight text={ title } query={ query } />
					) : (
						missingTitle
					) }
				</p>
				<p
					className="arc-preview-card__detail"
					data-missing={ description ? undefined : 'true' }
				>
					{ description ? (
						<Highlight text={ description } query={ query } />
					) : (
						missingDescription
					) }
				</p>
				{ host && host !== site ? (
					<p className="arc-preview-card__host">
						<Highlight text={ host } query={ query } />
					</p>
				) : null }
			</div>
		</div>
	);
}

function KeyphraseTags( { phrases, query } ) {
	const list = ( phrases || [] )
		.map( ( phrase ) => String( phrase || '' ).trim() )
		.filter( Boolean );
	if ( list.length === 0 ) {
		return null;
	}
	return (
		<span className="arc-keyphrases">
			{ list.map( ( phrase, index ) => (
				<span
					key={ `${ phrase }-${ index }` }
					className="arc-keyphrase"
					data-rank={ index === 0 ? 'primary' : 'secondary' }
				>
					<Icon size={ 12 } strokeWidth={ 2 }>
						<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
						<circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
					</Icon>
					<Highlight text={ phrase } query={ query } />
				</span>
			) ) }
		</span>
	);
}

function SeoScore( { page } ) {
	if ( page.error || page.score === 'Load failed' ) {
		return (
			<span className="arc-load-failed">
				<span>{ __( 'Load failed', 'pendulum-arc' ) }</span>
				{ page.error ? <span>{ page.error }</span> : null }
			</span>
		);
	}
	const mood = page.mood || scoreMood( page.score );
	const phraseMood = page.keyphraseScore
		? scoreMood( page.keyphraseScore )
		: null;
	return (
		<span className="arc-score-stack">
			<span>
				<span className="arc-score-stack__label">
					{ __( 'Page score', 'pendulum-arc' ) }
				</span>
				<ScorePill mood={ mood } value={ page.score } />
			</span>
			<span>
				<span className="arc-score-stack__label">
					{ __( 'Keyphrase score', 'pendulum-arc' ) }
				</span>
				{ page.keyphraseScore ? (
					<ScorePill
						mood={ phraseMood }
						value={ page.keyphraseScore }
					/>
				) : (
					<span className="arc-issue-count" data-heat="idle">
						-
					</span>
				) }
			</span>
		</span>
	);
}

function LinkCount( { page } ) {
	const hidden =
		page.hideLinks ||
		( ! isDesktopViewport( page.viewport ) &&
			Number( page.brokenLinkCount ) === 0 );
	if ( hidden ) {
		return (
			<span className="arc-issue-count" data-heat="idle">
				-
			</span>
		);
	}
	return <IssueCount value={ page.brokenLinkCount } />;
}

function scoreNumber( page ) {
	if ( page.error || page.score === 'Load failed' ) {
		return null;
	}
	const value = Number( page.score );
	return Number.isFinite( value ) ? value : null;
}

function worstIssueAccent( issues, count ) {
	let worst = '';
	let rank = 99;
	const order = { critical: 0, high: 1, medium: 2, low: 3 };
	( issues || [] ).forEach( ( issue ) => {
		const next = order[ issue.severity ];
		if ( next !== undefined && next < rank ) {
			rank = next;
			worst = issue.severity;
		}
	} );
	if ( worst ) {
		return SEVERITY_ACCENT[ worst ];
	}
	const heatName = heat( count );
	return heatName === 'idle' ? 'muted' : heatName;
}

function readExpanded( key ) {
	try {
		return window.localStorage.getItem( key ) === 'full';
	} catch {
		return false;
	}
}

function SeoPagesTable( { block, runId = '' } ) {
	const list = useReportTable( block, 'seo', 'pages', runId );
	const listRef = useRef( list );
	listRef.current = list;
	const columns = ( list.columns || [] ).filter(
		( column ) => column.id !== 'viewport'
	);
	const rows = list.rows;
	const query = list.query;
	const [ sort, setSort ] = useState( { key: 'score', dir: 'asc' } );
	const [ expanded, setExpanded ] = useState( () =>
		readExpanded( PAGE_HEIGHT_KEY )
	);
	const [ pendingUrl, setPendingUrl ] = useState( '' );
	const prepared = rows.map( ( row, index ) => ( {
		row,
		index,
		page: seoPageOf( list.source, row ),
	} ) );
	const dir = sort.dir === 'asc' ? 1 : -1;
	const visible = [ ...prepared ].sort( ( left, right ) => {
		let primary = 0;
		if ( sort.key === 'url' ) {
			primary = String( left.page.path || '' ).localeCompare(
				String( right.page.path || '' ),
				undefined,
				{ sensitivity: 'base' }
			);
		} else if ( sort.key === 'links' ) {
			primary = compareNumber(
				left.page.brokenLinkCount,
				right.page.brokenLinkCount
			);
		} else if ( sort.key === 'issues' ) {
			primary = compareNumber(
				left.page.issueCount,
				right.page.issueCount
			);
		} else {
			primary = compareNumber(
				scoreNumber( left.page ),
				scoreNumber( right.page )
			);
		}
		if ( primary !== 0 ) {
			return primary * dir;
		}
		return compareViewport( left.page.viewport, right.page.viewport );
	} );

	useEffect( () => {
		function onFocus( event ) {
			const url = event.detail && event.detail.url;
			if ( ! url ) {
				return;
			}
			listRef.current.setQuery( '' );
			setPendingUrl( url );
		}
		window.addEventListener( PAGE_FOCUS_EVENT, onFocus );
		return () => window.removeEventListener( PAGE_FOCUS_EVENT, onFocus );
	}, [] );

	useEffect( () => {
		if ( ! pendingUrl ) {
			return;
		}
		focusPageRow( pendingUrl );
		setPendingUrl( '' );
	}, [ pendingUrl, visible.length ] );

	function toggleSort( key ) {
		setSort( ( prev ) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: defaultDirForSortKey( key ) }
		);
	}

	function toggleHeight() {
		setExpanded( ( value ) => {
			const next = ! value;
			try {
				window.localStorage.setItem(
					PAGE_HEIGHT_KEY,
					next ? 'full' : 'capped'
				);
			} catch {
				return next;
			}
			return next;
		} );
	}

	return (
		<TableCard
			block={ block }
			columns={ columns }
			count={ list.total }
			tip={ SEO_PAGES_TIP }
			query={ query }
			onQuery={ list.setQuery }
			sort={ sort }
			onSort={ toggleSort }
			expanded={ expanded }
			onToggleHeight={ toggleHeight }
			pageIndex={ list.pageIndex }
			pager={
				<TablePager
					pageIndex={ list.pageIndex }
					pageCount={ list.pageCount }
					pending={ list.pending }
					onPage={ list.goToPage }
				/>
			}
			emptySearch={
				query.trim()
					? __( 'No rows match this search.', 'pendulum-arc' )
					: block.empty
			}
		>
			{ visible.map( ( item ) => {
				const page = item.page;
				const issues = page.issues || [];
				const issueLabel = String(
					Number( page.issueCount ) || issues.length || 0
				);
				return (
					<tr
						key={ item.row.id || item.index }
						data-page-url={ page.url || undefined }
					>
						{ columns.map( ( column ) => (
							<td
								key={ column.id }
								data-align={ column.align || 'start' }
							>
								{ column.id === 'preview' ? (
									<SeoPreview page={ page } query={ query } />
								) : null }
								{ column.id === 'url' ? (
									<span className="arc-url-cell">
										{ page.title ? (
											<span className="arc-url-cell__title">
												<Highlight
													text={ page.title }
													query={ query }
												/>
											</span>
										) : (
											<span
												className="arc-url-cell__title"
												data-missing="true"
											>
												{ __(
													'Missing title',
													'pendulum-arc'
												) }
											</span>
										) }
										<PathLink
											href={ page.url }
											label={ page.path || page.url }
											query={ query }
										/>
										<KeyphraseTags
											phrases={ page.keyphrases }
											query={ query }
										/>
										{ page.editHref ? (
											<a
												className="arc-page-link arc-url-cell__edit"
												href={ page.editHref }
											>
												<span className="arc-page-link__label">
													{ __(
														'Edit',
														'pendulum-arc'
													) }
												</span>
											</a>
										) : null }
									</span>
								) : null }
								{ column.id === 'score' ? (
									<SeoScore page={ page } />
								) : null }
								{ column.id === 'links' ? (
									<LinkCount page={ page } />
								) : null }
								{ column.id === 'issues' ? (
									<PageIssues
										label={ issueLabel }
										issues={ issues }
										accent={ worstIssueAccent(
											issues,
											page.issueCount
										) }
									/>
								) : null }
							</td>
						) ) }
					</tr>
				);
			} ) }
		</TableCard>
	);
}

function dimensionLabel( dimension ) {
	const value = String( dimension || '' ).trim();
	if ( ! value || value.toLowerCase() === 'other' ) {
		return __( 'Other', 'pendulum-arc' );
	}
	return value.replace( /[-_]/g, ' ' );
}

function pageIssueSections( issues ) {
	const order = [];
	const grouped = new Map();
	issues.forEach( ( issue ) => {
		const key = String( issue.dimension || '' ).trim() || 'other';
		if ( ! grouped.has( key ) ) {
			order.push( key );
			grouped.set( key, [] );
		}
		grouped.get( key ).push( issue );
	} );
	const rank = ( value ) => ( value.toLowerCase() === 'keyphrase' ? 1 : 0 );
	order.sort( ( left, right ) => rank( left ) - rank( right ) );
	return order.map( ( key ) => ( {
		id: key,
		label: dimensionLabel( key ),
		items: grouped.get( key ),
	} ) );
}

function issuesMenuTitle( count ) {
	return sprintf(
		/* translators: %d: number of issues on this page. */
		_n( '%d issue', '%d issues', count, 'pendulum-arc' ),
		count
	);
}

function PageIssues( { label, issues, accent } ) {
	if ( ! issues || issues.length === 0 ) {
		return <IssueCount value={ label } />;
	}
	const count = Number( label );
	const sections = pageIssueSections( issues );
	return (
		<CountBloom
			label={ label }
			title={ issuesMenuTitle(
				Number.isFinite( count ) ? count : issues.length
			) }
			accent={ accent }
			items={ issues }
			width={ 22 }
		>
			{ sections.map( ( section ) => (
				<Fragment key={ section.id }>
					<p className="arc-page-issues__section">
						{ section.label }
					</p>
					{ section.items.map( ( issue, index ) => (
						<div
							key={ issue.key || `${ issue.title }-${ index }` }
							className="arc-issue-menu__item"
							role="none"
						>
							<div
								role="menuitem"
								data-severity={ issue.severity || undefined }
							>
								<IssueRow
									item={ {
										kind: 'coverage',
										key: issue.key,
										title: issue.title,
										summary: issue.summary || '',
										fix: issue.fix || '',
										severity: issue.severity || '',
									} }
								/>
							</div>
						</div>
					) ) }
				</Fragment>
			) ) }
		</CountBloom>
	);
}

function isFeedLink( url, platform ) {
	const id = String( platform || '' ).toLowerCase();
	if ( id === 'rss' || id === 'atom' || id === 'feed' ) {
		return true;
	}
	return /\/(?:feed|rss|atom)(?:\/|$|\.)/i.test( String( url || '' ) );
}

function platformIdOf( url, given ) {
	if ( isFeedLink( url, given ) ) {
		return 'rss';
	}
	const id = String( given || '' ).toLowerCase();
	if ( PLATFORM_LABELS[ id ] ) {
		return id;
	}
	try {
		const host = new URL( url ).hostname.toLowerCase();
		const match = PLATFORM_HOSTS.find(
			( [ domain ] ) => host === domain || host.endsWith( `.${ domain }` )
		);
		if ( match ) {
			return match[ 1 ];
		}
	} catch {
		return id || 'other';
	}
	return id || 'other';
}

function platformName( id, url ) {
	if ( PLATFORM_LABELS[ id ] ) {
		return PLATFORM_LABELS[ id ];
	}
	const host = hostOf( url ).replace( /^www\./, '' );
	return host || id || url;
}

function socialRows( block ) {
	const seen = new Set();
	const rows = [];
	( block.rows || [] ).forEach( ( row ) => {
		const social = row.social || {};
		const href =
			social.url ||
			( row.cells || [] ).map( ( cell ) => cell.href ).find( Boolean ) ||
			'';
		if ( ! href || seen.has( href ) ) {
			return;
		}
		seen.add( href );
		const id = platformIdOf( href, social.platform );
		rows.push( {
			id: row.id || href,
			url: href,
			platform: id,
			name: platformName( id, href ),
			display: displayOf( href ),
			note: PROVIDER_IDS.has( id )
				? __( 'Provider link', 'pendulum-arc' )
				: __( 'Social profile link', 'pendulum-arc' ),
		} );
	} );
	rows.sort( ( left, right ) => {
		const byName = left.name.localeCompare( right.name, undefined, {
			sensitivity: 'base',
		} );
		if ( byName !== 0 ) {
			return byName;
		}
		return left.display.localeCompare( right.display, undefined, {
			sensitivity: 'base',
		} );
	} );
	return rows;
}

function SocialMark( { platform, name } ) {
	return (
		<span className="arc-social-row__mark" aria-hidden="true">
			{ platform === 'rss' ? <RssMark /> : null }
			{ platform !== 'rss' && PLATFORM_LABELS[ platform ]
				? name.slice( 0, 1 )
				: null }
			{ platform !== 'rss' && ! PLATFORM_LABELS[ platform ] ? (
				<StrokeMark name="share" size={ 16 } strokeWidth={ 1.75 } />
			) : null }
		</span>
	);
}

function RssMark() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M6.18 15.64a2.18 2.18 0 1 1 0 4.36 2.18 2.18 0 0 1 0-4.36zM4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83C19.56 11.55 12.45 4.44 4 4.44zm0 5.66v2.83A7.07 7.07 0 0 1 11.07 20h2.83A9.9 9.9 0 0 0 4 10.1z" />
		</svg>
	);
}

function SeoSocialCard( { block } ) {
	const list = useReportTable( block, 'seo', 'socials' );
	const rows = socialRows( list.source );
	const query = list.query;
	return (
		<InventoryCard
			block={ block }
			icon="share"
			count={ list.total }
			tip={ SOCIAL_TIP }
			search={
				list.total > 0 || query ? (
					<SearchField value={ query } onChange={ list.setQuery } />
				) : null
			}
			filtering={ list.remote && query.trim().length > 0 }
			hasContent={ list.total > 0 }
			pageIndex={ list.pageIndex }
			pager={
				<TablePager
					pageIndex={ list.pageIndex }
					pageCount={ list.pageCount }
					pending={ list.pending }
					onPage={ list.goToPage }
				/>
			}
		>
			<ul className="arc-social-list">
				{ rows.map( ( row ) => (
					<li key={ row.id } className="arc-social-row">
						<SocialMark
							platform={ row.platform }
							name={ row.name }
						/>
						<a
							className="arc-social-row__body"
							href={ row.url }
							target="_blank"
							rel="noreferrer"
							title={ row.url }
						>
							<p className="arc-social-row__note">
								<Highlight text={ row.note } query={ query } />
							</p>
							<p className="arc-social-row__url">
								<Highlight
									text={ row.display }
									query={ query }
								/>
							</p>
						</a>
					</li>
				) ) }
			</ul>
		</InventoryCard>
	);
}

function formRows( block ) {
	return ( block.rows || [] ).map( ( row ) => row.form ).filter( Boolean );
}

function ProtectionMarks( { variant } ) {
	const protections = variant.protections || [];
	if ( protections.length > 0 ) {
		return protections.map( ( protection ) => {
			const name = PROTECTION_LABEL[ protection ] || protection;
			return (
				<span
					key={ protection }
					className="arc-pill"
					data-accent="emerald"
					data-size="md"
					title={ sprintf(
						/* translators: %s: captcha or honeypot name. */
						__( 'This form is protected by %s', 'pendulum-arc' ),
						name
					) }
				>
					<span className="arc-pill__label">{ name }</span>
				</span>
			);
		} );
	}
	if ( variant.protectionCheck === 'skipped' ) {
		return (
			<MutedPill
				label={ __( 'Skipped', 'pendulum-arc' ) }
				title={ __(
					'The protection check did not run. The form cap was reached, or the revisit failed.',
					'pendulum-arc'
				) }
			/>
		);
	}
	if ( variant.protectionsKnown === false ) {
		return null;
	}
	return (
		<MutedPill
			label={ __( 'Unprotected', 'pendulum-arc' ) }
			title={ __(
				'No form protection detected, e.g. captcha',
				'pendulum-arc'
			) }
		/>
	);
}

function fieldCountLabel( count ) {
	const value = Number( count ) || 0;
	if ( value === 1 ) {
		return __( '1 field', 'pendulum-arc' );
	}
	return `${ value } ${ __( 'fields', 'pendulum-arc' ) }`;
}

function pageCountLabel( count ) {
	const value = Number( count ) || 0;
	if ( value === 1 ) {
		return __( '1 page', 'pendulum-arc' );
	}
	return `${ value } ${ __( 'pages', 'pendulum-arc' ) }`;
}

function SeoFormsCard( { block } ) {
	const list = useReportTable( block, 'seo', 'forms' );
	const rows = formRows( list.source );
	const query = list.query;
	return (
		<InventoryCard
			block={ block }
			icon="layers"
			count={ list.total }
			tip={ FORMS_TIP }
			search={
				<SearchField value={ query } onChange={ list.setQuery } />
			}
			filtering={ list.remote && query.trim().length > 0 }
			hasContent={ list.total > 0 }
			pageIndex={ list.pageIndex }
			pager={
				<TablePager
					pageIndex={ list.pageIndex }
					pageCount={ list.pageCount }
					pending={ list.pending }
					onPage={ list.goToPage }
				/>
			}
		>
			<FormList forms={ rows } query={ query } />
		</InventoryCard>
	);
}

function FormList( { forms, query = '', notes } ) {
	const lines = ( notes || [] )
		.map( ( line ) => String( line || '' ).trim() )
		.filter( Boolean );
	return (
		<>
			{ lines.length > 0 ? (
				<ul className="arc-form-notes">
					{ lines.map( ( detail ) => (
						<li key={ detail }>{ detail }</li>
					) ) }
				</ul>
			) : null }
			{ forms.length > 0 ? (
				<ul className="arc-form-list">
					{ forms.map( ( form, index ) => (
						<li
							key={ `${ form.label }-${ index }` }
							className="arc-form-row"
						>
							<div className="arc-form-row__head">
								<span className="arc-form-row__name">
									<Highlight
										text={ form.label }
										query={ query }
									/>
								</span>
								<MutedPill
									label={
										PRESENCE_LABEL[ form.presence ] ||
										form.presence
									}
								/>
							</div>
							<ul className="arc-form-variants">
								{ ( form.variants || [] ).map(
									( variant, variantIndex ) => {
										const fields = variant.fields || [];
										const fieldLabel = fieldCountLabel(
											variant.fieldCount || fields.length
										);
										return (
											<li key={ variantIndex }>
												<MutedPill
													label={
														variant.method || 'GET'
													}
												/>
												<ProtectionMarks
													variant={ variant }
												/>
												<MutedPill
													label={ pageCountLabel(
														variant.pageCount
													) }
													title={ (
														variant.pages || []
													).join( ', ' ) }
												/>
												{ fields.length > 0 ? (
													<CountBloom
														label={ fieldLabel }
														accent="muted"
														query={ query }
														items={ fields.map(
															( field ) => ( {
																title: field,
															} )
														) }
													/>
												) : (
													<MutedPill
														label={ fieldLabel }
													/>
												) }
											</li>
										);
									}
								) }
							</ul>
						</li>
					) ) }
				</ul>
			) : null }
		</>
	);
}

function PageShot( { cell } ) {
	const src = cell && cell.image && cell.image.src ? cell.image.src : '';
	if ( ! src ) {
		return (
			<span
				className="arc-page-thumb arc-page-thumb--empty"
				aria-hidden="true"
			>
				<StrokeMark name="image" size={ 16 } strokeWidth={ 1.5 } />
			</span>
		);
	}
	return (
		<img
			className="arc-page-thumb"
			src={ src }
			alt={ cell.image.alt || '' }
		/>
	);
}

function a11yPageOf( block, row ) {
	const urlCell = columnCell( block, row, 'url' ) || {};
	const scoreCell = columnCell( block, row, 'score' ) || {};
	const issuesCell = columnCell( block, row, 'issues' ) || {};
	const page = row.page || {};
	const title = String( page.title || '' );
	const titleMissing =
		page.titleKnown === null || page.titleKnown === undefined;
	const titleKnown =
		page.titleKnown === true || ( titleMissing && title.trim() !== '' );
	return {
		title,
		titleKnown,
		path: page.path || urlCell.text || '',
		url: page.url || urlCell.href || '',
		viewport:
			page.viewport ||
			( columnCell( block, row, 'viewport' ) || {} ).text ||
			'',
		theme: ( columnCell( block, row, 'theme' ) || {} ).text || '',
		score: page.score || scoreCell.text || '-',
		error:
			page.error ||
			( scoreCell.text === 'Load failed'
				? scoreCell.caption || ''
				: null ),
		mood: scoreCell.mood,
		issueCount:
			page.issueCount !== null && page.issueCount !== undefined
				? Number( page.issueCount ) || 0
				: Number( issuesCell.text ) || 0,
		issues: page.issues || [],
		editHref: urlCell.editHref || '',
		preview: columnCell( block, row, 'preview' ),
		incomplete: columnCell( block, row, 'incomplete' ),
	};
}

function viewportGroup( viewport ) {
	if ( isMobileViewport( viewport ) ) {
		return 'mobile';
	}
	if ( isDesktopViewport( viewport ) ) {
		return 'desktop';
	}
	return 'other';
}

function ViewportTabs( { value, onChange, items } ) {
	const listRef = useRef( null );
	const [ indicator, setIndicator ] = useState( { left: 0, width: 0 } );
	const tabs = items || [
		{ value: 'all', label: __( 'All', 'pendulum-arc' ) },
		{ value: 'mobile', label: __( 'Mobile', 'pendulum-arc' ) },
		{ value: 'desktop', label: __( 'Desktop', 'pendulum-arc' ) },
	];

	useEffect( () => {
		const root = listRef.current;
		if ( ! root ) {
			return;
		}
		const active = root.querySelector( '[aria-selected="true"]' );
		if ( ! active ) {
			setIndicator( { left: 0, width: 0 } );
			return;
		}
		setIndicator( {
			left: active.offsetLeft,
			width: active.offsetWidth,
		} );
	}, [ value, tabs.length ] );

	return (
		<div
			ref={ listRef }
			className="arc-segment-tabs"
			role="tablist"
			aria-label={ __( 'Viewport', 'pendulum-arc' ) }
			data-size="sm"
			data-track-radius="tiny"
		>
			<span
				className="arc-segment-tabs__indicator"
				aria-hidden="true"
				style={ {
					transform: `translateX(${ indicator.left }px)`,
					width: indicator.width,
				} }
			/>
			{ tabs.map( ( item ) => (
				<button
					key={ item.value }
					type="button"
					role="tab"
					aria-selected={ value === item.value }
					onClick={ () => onChange( item.value ) }
				>
					{ item.label }
				</button>
			) ) }
		</div>
	);
}

function A11yPagesTable( { block, runId = '' } ) {
	const list = useReportTable( block, 'a11y', 'pages', runId );
	const listRef = useRef( list );
	listRef.current = list;
	const columns = list.columns;
	const rows = list.rows;
	const query = list.query;
	const exactViewports = ( list.viewports || [] ).length > 0;
	const [ group, setGroup ] = useState( 'all' );
	const [ sort, setSort ] = useState( { key: 'score', dir: 'asc' } );
	const [ expanded, setExpanded ] = useState( () =>
		readExpanded( A11Y_PAGE_HEIGHT_KEY )
	);
	const [ pendingUrl, setPendingUrl ] = useState( '' );
	const prepared = rows.map( ( row, index ) => ( {
		row,
		index,
		page: a11yPageOf( list.source, row ),
	} ) );
	const groups = new Set(
		prepared.map( ( item ) => viewportGroup( item.page.viewport ) )
	);
	const legacyTabs =
		! exactViewports &&
		list.pageCount <= 1 &&
		groups.has( 'mobile' ) &&
		groups.has( 'desktop' );
	const filtered = prepared.filter( ( item ) => {
		if (
			legacyTabs &&
			group !== 'all' &&
			viewportGroup( item.page.viewport ) !== group
		) {
			return false;
		}
		return true;
	} );
	const dir = sort.dir === 'asc' ? 1 : -1;
	const visible = [ ...filtered ].sort( ( left, right ) => {
		let primary = 0;
		if ( sort.key === 'url' ) {
			primary = String( left.page.path || '' ).localeCompare(
				String( right.page.path || '' ),
				undefined,
				{ sensitivity: 'base' }
			);
		} else if ( sort.key === 'viewport' ) {
			primary = compareViewport(
				left.page.viewport,
				right.page.viewport
			);
		} else if ( sort.key === 'theme' ) {
			primary = String( left.page.theme || '' ).localeCompare(
				String( right.page.theme || '' ),
				undefined,
				{ sensitivity: 'base' }
			);
		} else if ( sort.key === 'issues' ) {
			primary = compareNumber(
				left.page.issueCount,
				right.page.issueCount
			);
		} else if ( sort.key === 'incomplete' ) {
			primary = compareNumber(
				Number( ( left.page.incomplete || {} ).text ) || 0,
				Number( ( right.page.incomplete || {} ).text ) || 0
			);
		} else {
			primary = compareNumber(
				scoreNumber( left.page ),
				scoreNumber( right.page )
			);
		}
		if ( primary !== 0 ) {
			return primary * dir;
		}
		return compareViewport( left.page.viewport, right.page.viewport );
	} );

	useEffect( () => {
		function onFocus( event ) {
			const url = event.detail && event.detail.url;
			if ( ! url ) {
				return;
			}
			listRef.current.setQuery( '' );
			listRef.current.setViewport( '' );
			setGroup( 'all' );
			setPendingUrl( url );
		}
		window.addEventListener( PAGE_FOCUS_EVENT, onFocus );
		return () => window.removeEventListener( PAGE_FOCUS_EVENT, onFocus );
	}, [] );

	useEffect( () => {
		if ( ! pendingUrl ) {
			return;
		}
		focusPageRow( pendingUrl );
		setPendingUrl( '' );
	}, [ pendingUrl, visible.length ] );

	function toggleSort( key ) {
		setSort( ( prev ) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: defaultDirForSortKey( key ) }
		);
	}

	function toggleHeight() {
		setExpanded( ( value ) => {
			const next = ! value;
			try {
				window.localStorage.setItem(
					A11Y_PAGE_HEIGHT_KEY,
					next ? 'full' : 'capped'
				);
			} catch {
				return next;
			}
			return next;
		} );
	}

	const filtering =
		( legacyTabs && group !== 'all' ) ||
		( exactViewports && list.viewport !== '' );
	let emptySearch = block.empty;
	if ( query.trim() ) {
		emptySearch = __( 'No rows match this search.', 'pendulum-arc' );
	} else if ( filtering ) {
		emptySearch = __( 'No pages match these filters.', 'pendulum-arc' );
	}
	const exactItems = [
		{ value: 'all', label: __( 'All', 'pendulum-arc' ) },
		...( list.viewports || [] ).map( ( value ) => ( {
			value,
			label: value,
		} ) ),
	];
	let viewportTabs = null;
	if ( exactViewports ) {
		viewportTabs = (
			<ViewportTabs
				value={ list.viewport || 'all' }
				onChange={ ( value ) =>
					list.setViewport( value === 'all' ? '' : value )
				}
				items={ exactItems }
			/>
		);
	} else if ( legacyTabs ) {
		viewportTabs = <ViewportTabs value={ group } onChange={ setGroup } />;
	}

	return (
		<TableCard
			block={ block }
			columns={ columns }
			count={
				legacyTabs && group !== 'all' ? visible.length : list.total
			}
			tip={ A11Y_PAGES_TIP }
			query={ query }
			onQuery={ list.setQuery }
			sort={ sort }
			onSort={ toggleSort }
			expanded={ expanded }
			onToggleHeight={ toggleHeight }
			pageIndex={ list.pageIndex }
			pager={
				<TablePager
					pageIndex={ list.pageIndex }
					pageCount={ list.pageCount }
					pending={ list.pending }
					onPage={ list.goToPage }
				/>
			}
			emptySearch={ emptySearch }
			filters={ viewportTabs }
		>
			{ visible.map( ( item ) => {
				const page = item.page;
				const issues = page.issues || [];
				const issueLabel = String(
					Number( page.issueCount ) || issues.length || 0
				);
				return (
					<tr
						key={ item.row.id || item.index }
						data-page-url={ page.url || undefined }
					>
						{ columns.map( ( column ) => (
							<td
								key={ column.id }
								data-align={ column.align || 'start' }
							>
								{ column.id === 'preview' ? (
									<PageShot cell={ page.preview } />
								) : null }
								{ column.id === 'url' ? (
									<span className="arc-url-cell">
										<PageTitleMark
											page={ page }
											query={ query }
										/>
										<PathLink
											href={ page.url }
											label={ page.path || page.url }
											query={ query }
										/>
										{ page.editHref ? (
											<a
												className="arc-page-link arc-url-cell__edit"
												href={ page.editHref }
											>
												<span className="arc-page-link__label">
													{ __(
														'Edit',
														'pendulum-arc'
													) }
												</span>
											</a>
										) : null }
									</span>
								) : null }
								{ column.id === 'viewport' ? (
									<CrawlCell
										kind="a11y"
										column="viewport"
										cell={ {
											text: page.viewport,
										} }
									/>
								) : null }
								{ column.id === 'theme' ? (
									<span className="arc-theme">
										{ page.theme || '-' }
									</span>
								) : null }
								{ column.id === 'score' ? (
									<CrawlCell
										kind="a11y"
										column="score"
										cell={ {
											text: page.score,
											mood: page.mood,
											caption: page.error,
										} }
									/>
								) : null }
								{ column.id === 'issues' ? (
									<PageIssues
										label={ issueLabel }
										issues={ issues }
										accent={ worstIssueAccent(
											issues,
											page.issueCount
										) }
									/>
								) : null }
								{ column.id === 'incomplete' ? (
									<IssueCount
										value={ ( page.incomplete || {} ).text }
									/>
								) : null }
							</td>
						) ) }
					</tr>
				);
			} ) }
		</TableCard>
	);
}

function gapNumber( text ) {
	const match = String( text || '' ).match( /-?\d+(?:\.\d+)?/ );
	if ( ! match || text === '-' ) {
		return null;
	}
	const value = Number( match[ 0 ] );
	return Number.isFinite( value ) ? value : null;
}

function renderedWordCount( text ) {
	const parts = String( text || '' ).split( '/' );
	if ( parts.length < 2 ) {
		return null;
	}
	const value = Number( parts[ 1 ].trim() );
	return Number.isFinite( value ) ? value : null;
}

function aiPageOf( block, row ) {
	const urlCell = columnCell( block, row, 'url' ) || {};
	const scoreCell = columnCell( block, row, 'score' ) || {};
	const issuesCell = columnCell( block, row, 'issues' ) || {};
	const page = row.page || {};
	const gap = columnCell( block, row, 'gap' );
	const words = columnCell( block, row, 'words' );
	const meta = columnCell( block, row, 'aiMeta' );
	return {
		title: String( page.title || '' ).trim(),
		path: page.path || urlCell.text || '',
		url: page.url || urlCell.href || '',
		score: page.score || scoreCell.text || '-',
		error:
			page.error ||
			( scoreCell.text === 'Load failed'
				? scoreCell.caption || ''
				: null ),
		mood: scoreCell.mood,
		issueCount:
			page.issueCount !== null && page.issueCount !== undefined
				? Number( page.issueCount ) || 0
				: Number( issuesCell.text ) || 0,
		issues: ( page.issues || [] ).map( ( issue ) => ( {
			...issue,
			dimension: issue.dimension || __( 'Issues', 'pendulum-arc' ),
		} ) ),
		editHref: urlCell.editHref || '',
		gap,
		words,
		meta,
	};
}

function AiPagesTable( { block, runId = '' } ) {
	const list = useReportTable( block, 'ai', 'pages', runId );
	const listRef = useRef( list );
	listRef.current = list;
	const columns = list.columns;
	const rows = list.rows;
	const query = list.query;
	const [ sort, setSort ] = useState( { key: 'issues', dir: 'desc' } );
	const [ expanded, setExpanded ] = useState( () =>
		readExpanded( AI_PAGE_HEIGHT_KEY )
	);
	const [ pendingUrl, setPendingUrl ] = useState( '' );
	const prepared = rows.map( ( row, index ) => ( {
		row,
		index,
		page: aiPageOf( list.source, row ),
	} ) );
	const dir = sort.dir === 'asc' ? 1 : -1;
	const visible = [ ...prepared ].sort( ( left, right ) => {
		let primary = 0;
		if ( sort.key === 'url' ) {
			primary = String( left.page.path || '' ).localeCompare(
				String( right.page.path || '' ),
				undefined,
				{ sensitivity: 'base' }
			);
		} else if ( sort.key === 'gap' ) {
			primary = compareNumber(
				gapNumber( left.page.gap && left.page.gap.text ),
				gapNumber( right.page.gap && right.page.gap.text )
			);
		} else if ( sort.key === 'words' ) {
			primary = compareNumber(
				renderedWordCount( left.page.words && left.page.words.text ),
				renderedWordCount( right.page.words && right.page.words.text )
			);
		} else if ( sort.key === 'aiMeta' ) {
			const meta = ( page ) => {
				const text = ( page.meta && page.meta.text ) || '';
				return text === '-' ? '' : text;
			};
			primary = meta( left.page ).localeCompare(
				meta( right.page ),
				undefined,
				{ sensitivity: 'base' }
			);
		} else if ( sort.key === 'issues' ) {
			const count = ( page ) =>
				page.error ? Number.MAX_SAFE_INTEGER : page.issueCount;
			primary = compareNumber( count( left.page ), count( right.page ) );
		} else {
			primary = compareNumber(
				scoreNumber( left.page ),
				scoreNumber( right.page )
			);
		}
		if ( primary !== 0 ) {
			return primary * dir;
		}
		return String( left.page.path || '' ).localeCompare(
			String( right.page.path || '' )
		);
	} );

	useEffect( () => {
		function onFocus( event ) {
			const url = event.detail && event.detail.url;
			if ( ! url ) {
				return;
			}
			listRef.current.setQuery( '' );
			setPendingUrl( url );
		}
		window.addEventListener( PAGE_FOCUS_EVENT, onFocus );
		return () => window.removeEventListener( PAGE_FOCUS_EVENT, onFocus );
	}, [] );

	useEffect( () => {
		if ( ! pendingUrl ) {
			return;
		}
		focusPageRow( pendingUrl );
		setPendingUrl( '' );
	}, [ pendingUrl, visible.length ] );

	function toggleSort( key ) {
		setSort( ( prev ) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: defaultDirForSortKey( key ) }
		);
	}

	function toggleHeight() {
		setExpanded( ( value ) => {
			const next = ! value;
			try {
				window.localStorage.setItem(
					AI_PAGE_HEIGHT_KEY,
					next ? 'full' : 'capped'
				);
			} catch {
				return next;
			}
			return next;
		} );
	}

	return (
		<TableCard
			block={ block }
			columns={ columns }
			count={ list.total }
			tip={ AI_PAGES_TIP }
			query={ query }
			onQuery={ list.setQuery }
			sort={ sort }
			onSort={ toggleSort }
			expanded={ expanded }
			onToggleHeight={ toggleHeight }
			pageIndex={ list.pageIndex }
			pager={
				<TablePager
					pageIndex={ list.pageIndex }
					pageCount={ list.pageCount }
					pending={ list.pending }
					onPage={ list.goToPage }
				/>
			}
			emptySearch={
				query.trim()
					? __( 'No rows match this search.', 'pendulum-arc' )
					: block.empty
			}
		>
			{ visible.map( ( item ) => {
				const page = item.page;
				const issues = page.issues || [];
				const issueLabel = String(
					Number( page.issueCount ) || issues.length || 0
				);
				return (
					<tr
						key={ item.row.id || item.index }
						data-page-url={ page.url || undefined }
					>
						{ columns.map( ( column ) => (
							<td
								key={ column.id }
								data-align={ column.align || 'start' }
							>
								{ column.id === 'url' ? (
									<span className="arc-url-cell">
										{ page.title ? (
											<span className="arc-url-cell__title">
												<Highlight
													text={ page.title }
													query={ query }
												/>
											</span>
										) : null }
										<PathLink
											href={ page.url }
											label={ page.path || page.url }
											query={ query }
										/>
										{ page.editHref ? (
											<a
												className="arc-page-link arc-url-cell__edit"
												href={ page.editHref }
											>
												<span className="arc-page-link__label">
													{ __(
														'Edit',
														'pendulum-arc'
													) }
												</span>
											</a>
										) : null }
									</span>
								) : null }
								{ column.id === 'score' ? (
									<CrawlCell
										kind="ai"
										column="score"
										cell={ {
											text: page.score,
											mood: page.mood,
											caption: page.error,
										} }
									/>
								) : null }
								{ column.id === 'gap' && page.gap ? (
									<CrawlCell
										kind="ai"
										column="gap"
										cell={ page.gap }
									/>
								) : null }
								{ column.id === 'words' && page.words ? (
									<CrawlCell
										kind="ai"
										column="words"
										cell={ page.words }
									/>
								) : null }
								{ column.id === 'aiMeta' && page.meta ? (
									<CrawlCell
										kind="ai"
										column="aiMeta"
										cell={ page.meta }
									/>
								) : null }
								{ column.id === 'issues' ? (
									<PageIssueCell
										page={ page }
										label={ issueLabel }
										issues={ issues }
									/>
								) : null }
							</td>
						) ) }
					</tr>
				);
			} ) }
		</TableCard>
	);
}

function PageTitleMark( { page, query } ) {
	if ( ! page.titleKnown ) {
		return null;
	}
	if ( page.title.trim() ) {
		return (
			<span className="arc-url-cell__title">
				<Highlight text={ page.title } query={ query } />
			</span>
		);
	}
	return (
		<span className="arc-url-cell__title" data-missing="true">
			{ __( 'Missing title', 'pendulum-arc' ) }
		</span>
	);
}

function PageIssueCell( { page, label, issues } ) {
	if ( page.error ) {
		return (
			<span className="arc-page-error">
				{ __( 'error', 'pendulum-arc' ) }
			</span>
		);
	}
	return (
		<PageIssues
			label={ label }
			issues={ issues }
			accent={ worstIssueAccent( issues, page.issueCount ) }
		/>
	);
}

function CrawlCell( { kind, column, cell } ) {
	if ( column === 'preview' ) {
		return <PageShot cell={ cell } />;
	}
	if ( column === 'url' ) {
		return (
			<PathLink
				href={ cell.href }
				label={ cell.text }
				editHref={ cell.editHref }
			/>
		);
	}
	if ( column === 'viewport' ) {
		const mobile = isMobileViewport( cell.text );
		return (
			<span className="arc-viewport">
				<StrokeMark
					name={ mobile ? 'phone' : 'monitor' }
					size={ 14 }
					strokeWidth={ 2 }
				/>
				<span>{ cell.text || '-' }</span>
			</span>
		);
	}
	if ( column === 'score' ) {
		if ( cell.text === 'Load failed' ) {
			return (
				<span className="arc-load-failed">
					<span>{ __( 'Load failed', 'pendulum-arc' ) }</span>
					{ cell.caption ? <span>{ cell.caption }</span> : null }
				</span>
			);
		}
		return (
			<ScorePill
				mood={ cell.mood || scoreMood( cell.text ) }
				value={ cell.text }
			/>
		);
	}
	if ( column === 'issues' || column === 'incomplete' ) {
		return <IssueCount value={ cell.text } />;
	}
	if ( kind === 'ai' && column === 'gap' ) {
		return (
			<span className="arc-gap" data-mood={ cell.mood || undefined }>
				{ cell.text }
			</span>
		);
	}
	if ( kind === 'ai' && column === 'words' ) {
		return <span className="arc-words">{ cell.text || '-' }</span>;
	}
	if ( kind === 'ai' && column === 'aiMeta' ) {
		const text = cell.text || '-';
		return (
			<span
				className="arc-mono-cell"
				title={ text === '-' ? undefined : text }
			>
				{ text }
			</span>
		);
	}
	return <span>{ cell.text }</span>;
}

function slotAccent( status ) {
	const value = String( status || '' ).toLowerCase();
	if ( value === 'found' || value === 'present' ) {
		return 'emerald';
	}
	if ( value === 'missing' ) {
		return 'red';
	}
	if ( value.includes( 'wrong' ) ) {
		return 'orange';
	}
	return 'muted';
}

function BrandSlotsTable( { block } ) {
	const rows = block.rows || [];
	const columns = [
		{ id: 'required', label: __( 'Mark', 'pendulum-arc' ), align: 'start' },
		{ id: 'slot', label: __( 'Slot', 'pendulum-arc' ), align: 'start' },
		{ id: 'status', label: __( 'Status', 'pendulum-arc' ), align: 'start' },
		{ id: 'rule', label: __( 'Required', 'pendulum-arc' ), align: 'start' },
		{
			id: 'observed',
			label: __( 'Observed', 'pendulum-arc' ),
			align: 'start',
		},
	];
	return (
		<TableCard block={ block } columns={ columns } count={ rows.length }>
			{ rows.map( ( row, index ) => {
				const slot = row.slot || {};
				return (
					<tr key={ row.id || index }>
						<td>
							{ slot.image ? (
								<img
									className="arc-slot-mark"
									src={ slot.image }
									alt=""
								/>
							) : (
								<span className="arc-slot-mark arc-slot-mark--empty" />
							) }
						</td>
						<td>
							<span className="arc-slot-copy">
								<span className="arc-slot-copy__label">
									{ slot.label }
								</span>
								{ slot.hint ? (
									<span className="arc-slot-copy__hint">
										{ slot.hint }
									</span>
								) : null }
							</span>
						</td>
						<td>
							<span
								className="arc-pill"
								data-accent={ slotAccent( slot.status ) }
								data-size="xs"
							>
								<span className="arc-pill__label">
									{ slot.status }
								</span>
							</span>
						</td>
						<td>{ slot.required || '-' }</td>
						<td>{ slot.observed || '-' }</td>
					</tr>
				);
			} ) }
		</TableCard>
	);
}

const SURFACE_STATUS_ORDER = {
	loginAdmin: [ 'open', 'blocked' ],
	junk: [ 'open', 'blocked', 'missing' ],
};

const JUNK_GROUP_ORDER = [ 'environment', 'database', 'other' ];

const SURFACE_TIPS = {
	loginAdmin: __(
		'Well-known login and admin paths probed on the origin. Each list is open, then blocked, then any other status, and alphabetical within a status. Reachable paths are inventory; exposure findings are highlighted in the list.',
		'pendulum-arc'
	),
	junk: __(
		'Secret files, dumps, debug paths, and archives grouped as environment, database, or other. Each group is open, then blocked, then missing, and alphabetical within a status. An open readable secret path is a serious finding.',
		'pendulum-arc'
	),
	socialProviders: SOCIAL_TIP,
	forms: FORMS_TIP,
};

const SURFACES_BLURB = __(
	'Login, admin, junk and secret files, harvested links, public forms, and detected social providers.',
	'pendulum-arc'
);

function statusAccent( tone ) {
	if ( tone === 'good' ) {
		return 'emerald';
	}
	if ( tone === 'bad' ) {
		return 'red';
	}
	if ( tone === 'info' ) {
		return 'sky';
	}
	if ( tone === 'warn' ) {
		return 'amber';
	}
	return 'muted';
}

function surfaceAlpha( row ) {
	return String( row.note || '' ).trim() || row.display || '';
}

function byStatusThenAlpha( order ) {
	const rank = new Map(
		SURFACE_STATUS_ORDER[ order ].map( ( label, index ) => [
			label,
			index,
		] )
	);
	const fallback = SURFACE_STATUS_ORDER[ order ].length;
	return ( left, right ) => {
		const leftKnown =
			left.statusLabel !== null && left.statusLabel !== undefined;
		const rightKnown =
			right.statusLabel !== null && right.statusLabel !== undefined;
		const leftRank = leftKnown
			? ( rank.get( left.statusLabel ) ?? fallback )
			: fallback;
		const rightRank = rightKnown
			? ( rank.get( right.statusLabel ) ?? fallback )
			: fallback;
		if ( leftRank !== rightRank ) {
			return leftRank - rightRank;
		}
		const name = surfaceAlpha( left ).localeCompare(
			surfaceAlpha( right ),
			undefined,
			{ sensitivity: 'base' }
		);
		if ( name !== 0 ) {
			return name;
		}
		return String( left.display || '' ).localeCompare(
			String( right.display || '' ),
			undefined,
			{ sensitivity: 'base' }
		);
	};
}

function surfaceRowOf( row ) {
	const surface = row.surface;
	if ( ! surface ) {
		return null;
	}
	const cell = ( row.cells || [] )[ 0 ] || {};
	return {
		id: row.id || surface.url,
		kind: surface.kind,
		url: surface.url,
		display: surface.display || surface.url,
		status: surface.status,
		statusLabel: surface.statusLabel,
		statusTone: surface.statusTone,
		note: surface.note || '',
		junkGroup: surface.junkGroup || null,
		pill: cell.pill || '',
		pillTone: cell.pillTone || '',
		summary: cell.caption || '',
		targets: row.targets || [],
	};
}

function IssueAnchors( { targets } ) {
	const list = Array.isArray( targets ) ? targets : [];
	if ( list.length === 0 ) {
		return null;
	}
	return list.map( ( target ) => (
		<span
			key={ target }
			className="arc-issue-anchor"
			data-issue-target={ target }
		/>
	) );
}

function SurfacePills( { row } ) {
	const statusKnown = row.status !== null && row.status !== undefined;
	const status = statusKnown
		? `${ row.status } ${ row.statusLabel || '' }`.trim()
		: '';
	if ( ! row.pill && ! status ) {
		return null;
	}
	return (
		<span className="arc-surface-row__pills">
			{ row.pill ? (
				<span
					className="arc-pill"
					data-accent={ row.pillTone || 'muted' }
					data-size="xs"
				>
					<span className="arc-pill__label">{ row.pill }</span>
				</span>
			) : null }
			{ status ? (
				<span
					className="arc-pill"
					data-accent={ statusAccent( row.statusTone ) }
					data-size="xs"
				>
					<span className="arc-pill__label">{ status }</span>
				</span>
			) : null }
		</span>
	);
}

function SurfaceRow( { row } ) {
	return (
		<li
			className="arc-surface-row"
			data-tint={ row.pill ? row.pillTone || undefined : undefined }
			title={ row.url }
		>
			<IssueAnchors targets={ row.targets } />
			<div className="arc-surface-row__copy">
				{ row.note ? (
					<p className="arc-surface-row__note">{ row.note }</p>
				) : null }
				<p className="arc-surface-row__path">{ row.display }</p>
				{ row.summary ? (
					<p className="arc-surface-row__summary">{ row.summary }</p>
				) : null }
			</div>
			<SurfacePills row={ row } />
		</li>
	);
}

function SurfaceSubList( { label, items } ) {
	return (
		<div>
			<div className="arc-surface-head">
				<p>{ label }</p>
				<span className="arc-pill" data-accent="muted" data-size="xs">
					<span className="arc-pill__label">{ items.length }</span>
				</span>
			</div>
			<ul className="arc-surface-list">
				{ items.map( ( row ) => (
					<SurfaceRow
						key={ `${ row.kind }-${ row.url }` }
						row={ row }
					/>
				) ) }
			</ul>
		</div>
	);
}

function junkGroupLabel( group ) {
	if ( group === 'environment' ) {
		return __( 'Environment', 'pendulum-arc' );
	}
	if ( group === 'database' ) {
		return __( 'Database', 'pendulum-arc' );
	}
	return __( 'Other files', 'pendulum-arc' );
}

function SurfacePathCard( { title, icon, tip, empty, rows, mode } ) {
	return (
		<InventoryCard
			block={ { heading: title, empty } }
			icon={ icon }
			count={ rows.length }
			tip={ tip }
		>
			{ mode === 'junk'
				? JUNK_GROUP_ORDER.map( ( group ) => {
						const items = rows
							.filter( ( row ) => row.junkGroup === group )
							.sort( byStatusThenAlpha( 'junk' ) );
						if ( items.length === 0 ) {
							return null;
						}
						return (
							<SurfaceSubList
								key={ group }
								label={ junkGroupLabel( group ) }
								items={ items }
							/>
						);
					} )
				: [ 'login', 'admin' ].map( ( kind ) => {
						const items = rows
							.filter( ( row ) => row.kind === kind )
							.sort( byStatusThenAlpha( 'loginAdmin' ) );
						if ( items.length === 0 ) {
							return null;
						}
						return (
							<SurfaceSubList
								key={ kind }
								label={ kind }
								items={ items }
							/>
						);
					} ) }
		</InventoryCard>
	);
}

function surfaceSocialRows( rows ) {
	return rows
		.map( ( row ) => {
			const id = platformIdOf( row.url, '' );
			return {
				id: row.id,
				url: row.url,
				platform: id,
				name: platformName( id, row.url ),
				display: row.display || displayOf( row.url ),
				note:
					row.note ||
					( PROVIDER_IDS.has( id )
						? __( 'Provider link', 'pendulum-arc' )
						: __( 'Social profile link', 'pendulum-arc' ) ),
				pill: row.pill,
				pillTone: row.pillTone,
				summary: row.summary,
				status: row.status,
				statusLabel: row.statusLabel,
				statusTone: row.statusTone,
				targets: row.targets,
			};
		} )
		.sort( ( left, right ) => {
			const byName = left.name.localeCompare( right.name, undefined, {
				sensitivity: 'base',
			} );
			if ( byName !== 0 ) {
				return byName;
			}
			return left.display.localeCompare( right.display, undefined, {
				sensitivity: 'base',
			} );
		} );
}

function metricTone( kind, value ) {
	if ( ! value ) {
		return undefined;
	}
	if ( kind === 'open' ) {
		return 'open';
	}
	if ( kind === 'fail' ) {
		return 'fail';
	}
	return undefined;
}

/**
 * Security Surfaces: header metrics and the four inventory panels.
 *
 * @param {Object} props
 * @param {Object} props.block
 */
export function SecuritySurfaces( { block } ) {
	const surfaces = ( block.rows || [] ).map( surfaceRowOf ).filter( Boolean );
	const forms = ( block.rows || [] )
		.map( ( row ) => row.form )
		.filter( Boolean );
	const notes = block.notes || [];
	const open = surfaces.filter( ( row ) => {
		const status = Number( row.status );
		return status >= 200 && status < 300;
	} ).length;
	const issues = surfaces.filter( ( row ) => row.pill ).length;
	const hasInventory = surfaces.length > 0 || forms.length > 0;
	const emptyGroup = __( 'None in this group.', 'pendulum-arc' );
	const loginRows = surfaces.filter(
		( row ) => row.kind === 'login' || row.kind === 'admin'
	);
	const junkRows = surfaces.filter( ( row ) => row.kind === 'junk' );
	const harvested = surfaceSocialRows(
		surfaces.filter(
			( row ) => row.kind === 'social' || row.kind === 'provider'
		)
	);
	const metrics = [
		{
			key: 'total',
			label: __( 'Probed', 'pendulum-arc' ),
			value: surfaces.length,
			kind: 'neutral',
		},
		{
			key: 'forms',
			label: __( 'Forms', 'pendulum-arc' ),
			value: forms.length,
			kind: 'neutral',
		},
		{
			key: 'open',
			label: __( 'Open', 'pendulum-arc' ),
			value: open,
			kind: 'open',
		},
		{
			key: 'issues',
			label: __( 'Issues', 'pendulum-arc' ),
			value: issues,
			kind: 'fail',
		},
	];

	return (
		<div className="arc-surfaces-section">
			<section className="arc-report-hero">
				<svg
					className="arc-report-hero__mark"
					viewBox="0 0 24 24"
					aria-hidden="true"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
					<rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
					<line x1="6" x2="6.01" y1="6" y2="6" />
					<line x1="6" x2="6.01" y1="18" y2="18" />
				</svg>
				<div className="arc-report-hero__body">
					<div className="arc-report-hero__layout">
						<div className="arc-report-hero__copy">
							<p className="arc-report-hero__overline">
								{ __( 'Surfaces', 'pendulum-arc' ) }
							</p>
							<h2 className="arc-report-hero__title">
								{ __( 'Surfaces', 'pendulum-arc' ) }
							</h2>
							<p className="arc-report-hero__detail">
								{ SURFACES_BLURB }
							</p>
						</div>
						<dl className="arc-report-hero__metrics" data-cols="4">
							{ metrics.map( ( metric ) => (
								<div key={ metric.key }>
									<dt>{ metric.label }</dt>
									<dd>
										<span
											className="arc-report-hero__figure"
											data-tone={ metricTone(
												metric.kind,
												metric.value
											) }
										>
											{ metric.value }
										</span>
									</dd>
								</div>
							) ) }
						</dl>
					</div>
				</div>
			</section>
			{ hasInventory ? (
				<div className="arc-surfaces">
					<SurfacePathCard
						title={ __( 'Login and admin', 'pendulum-arc' ) }
						icon="login"
						tip={ SURFACE_TIPS.loginAdmin }
						empty={ emptyGroup }
						rows={ loginRows }
						mode="login"
					/>
					<SurfacePathCard
						title={ __( 'Junk and secrets', 'pendulum-arc' ) }
						icon="file-warning"
						tip={ SURFACE_TIPS.junk }
						empty={ emptyGroup }
						rows={ junkRows }
						mode="junk"
					/>
					<InventoryCard
						block={ {
							heading: __(
								'Social and providers',
								'pendulum-arc'
							),
							empty: emptyGroup,
						} }
						icon="share"
						count={ harvested.length }
						tip={ SURFACE_TIPS.socialProviders }
					>
						<ul className="arc-social-list">
							{ harvested.map( ( row ) => (
								<li
									key={ row.id }
									className="arc-social-row"
									data-tint={
										row.pill
											? row.pillTone || undefined
											: undefined
									}
								>
									<IssueAnchors targets={ row.targets } />
									<SocialMark
										platform={ row.platform }
										name={ row.name }
									/>
									<div
										className="arc-social-row__body"
										data-layout="split"
										title={ row.url }
									>
										<div className="arc-social-row__copy">
											<p className="arc-social-row__note">
												{ row.note }
											</p>
											<p className="arc-social-row__url">
												{ row.display }
											</p>
											{ row.summary ? (
												<p className="arc-surface-row__summary">
													{ row.summary }
												</p>
											) : null }
										</div>
										<SurfacePills row={ row } />
									</div>
								</li>
							) ) }
						</ul>
					</InventoryCard>
					<InventoryCard
						block={ {
							heading: __( 'Forms', 'pendulum-arc' ),
							empty: __(
								'No forms found on crawled pages.',
								'pendulum-arc'
							),
						} }
						icon="form"
						count={ forms.length }
						tip={ SURFACE_TIPS.forms }
						hasContent={ forms.length > 0 || notes.length > 0 }
					>
						<FormList forms={ forms } notes={ notes } />
					</InventoryCard>
				</div>
			) : (
				<p className="arc-surfaces__empty">
					{ block.empty ||
						__(
							'No public login, admin, junk, social, or form surfaces were listed.',
							'pendulum-arc'
						) }
				</p>
			) }
		</div>
	);
}

/**
 * Arc-shaped body for a block the generic table cannot paint.
 * Returns null when this block should keep the generic renderer.
 *
 * @param {Object}      block
 * @param {string|null} service
 * @param {string}      runId
 */
export function renderSection( block, service, runId = '' ) {
	const key = block.id || block.heading;
	if ( service === 'seo' && block.kind === 'table' && block.id === 'pages' ) {
		return <SeoPagesTable key={ key } block={ block } runId={ runId } />;
	}
	if (
		service === 'seo' &&
		block.kind === 'table' &&
		block.id === 'socials'
	) {
		return <SeoSocialCard key={ key } block={ block } />;
	}
	if ( service === 'seo' && block.kind === 'table' && block.id === 'forms' ) {
		const detailed = ( block.rows || [] ).some( ( row ) => row.form );
		if ( ! detailed && ( block.rows || [] ).length > 0 ) {
			return null;
		}
		return <SeoFormsCard key={ key } block={ block } />;
	}
	if (
		service === 'a11y' &&
		block.kind === 'table' &&
		block.id === 'pages'
	) {
		return <A11yPagesTable key={ key } block={ block } runId={ runId } />;
	}
	if ( service === 'ai' && block.kind === 'table' && block.id === 'pages' ) {
		return <AiPagesTable key={ key } block={ block } runId={ runId } />;
	}
	if (
		service === 'brand' &&
		block.kind === 'table' &&
		block.id === 'requirements'
	) {
		const slotted = ( block.rows || [] ).some( ( row ) => row.slot );
		if ( ! slotted && ( block.rows || [] ).length > 0 ) {
			return null;
		}
		return <BrandSlotsTable key={ key } block={ block } />;
	}
	return null;
}
