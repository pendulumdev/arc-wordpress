/**
 * WordPress dependencies
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ColumnMark, StrokeMark } from '../ui/column-icon';
import { Icon } from '../ui/icon';
import { MoodMark, scoreMood } from '../ui/score-card';
import { ReportCta } from './report-cta';
import { ReportLoader } from './report-loading';
import {
	CountBloom,
	InfoTip,
	SortArrows,
	ValueTip,
	compareNumber,
} from './report-chrome';
import { renderSection, SecuritySurfaces } from './report-sections';

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

function isScoreValue( text ) {
	return /^\d+(?:\.\d+)?$/.test( String( text || '' ).trim() );
}

function keyphraseCaption( caption ) {
	const text = String( caption || '' );
	const match = text.match(
		/^Keyphrase\s+(\d+(?:\.\d+)?)(?:\s·\s([\s\S]+))?$/
	);
	if ( ! match ) {
		return { score: '', phrases: text };
	}
	return { score: match[ 1 ], phrases: match[ 2 ] || '' };
}

function ScoreValuePill( { mood, value } ) {
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

function TagMark() {
	return (
		<Icon size={ 12 } strokeWidth={ 2 }>
			<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
			<circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
		</Icon>
	);
}

function SeoScoreStack( { cell } ) {
	const keyphrase = keyphraseCaption( cell.caption );
	const keyphraseMood = keyphrase.score
		? scoreMood( Number( keyphrase.score ) )
		: null;
	return (
		<div className="arc-score-stack">
			<div>
				<p className="arc-score-stack__label">
					{ __( 'Page score', 'pendulum-arc' ) }
				</p>
				<ScoreValuePill mood={ cell.mood } value={ cell.text } />
			</div>
			<div>
				<p className="arc-score-stack__label">
					{ __( 'Keyphrase score', 'pendulum-arc' ) }
				</p>
				{ keyphrase.score && keyphraseMood ? (
					<ScoreValuePill
						mood={ keyphraseMood }
						value={ keyphrase.score }
					/>
				) : (
					<span className="arc-report-cell__text" data-empty="true">
						-
					</span>
				) }
				{ keyphrase.phrases ? (
					<span className="arc-score-stack__phrases">
						{ keyphrase.phrases
							.split( ', ' )
							.filter( Boolean )
							.map( ( phrase, index ) => (
								<span
									className="arc-pill"
									data-accent="cyan"
									data-size="xs"
									key={ `${ phrase }-${ index }` }
								>
									<span className="arc-pill__label">
										<TagMark />
										{ phrase }
									</span>
								</span>
							) ) }
					</span>
				) : null }
			</div>
		</div>
	);
}

function scoreColumnCell( service, block, column, cell ) {
	if (
		block.id !== 'pages' ||
		! column ||
		column.id !== 'score' ||
		! isScoreValue( cell.text )
	) {
		return null;
	}
	if ( service === 'seo' ) {
		return <SeoScoreStack cell={ cell } />;
	}
	if ( service === 'ai' || service === 'a11y' ) {
		return <ScoreValuePill mood={ cell.mood } value={ cell.text } />;
	}
	return null;
}

/**
 * AI words cell. Arc sends `static / rendered` as one string.
 *
 * @param {Object|undefined} column
 * @param {Object}           cell
 */
function wordsColumnCell( column, cell ) {
	if ( ! column || column.id !== 'words' ) {
		return null;
	}
	const match = String( cell.text || '' )
		.trim()
		.match( /^(\d+)\s*\/\s*(\d+)$/ );
	if ( ! match ) {
		return null;
	}
	return (
		<div className="arc-words">
			<p>
				<span className="arc-words__label">
					{ __( 'Static', 'pendulum-arc' ) }
				</span>
				<span className="arc-words__value">{ match[ 1 ] }</span>
			</p>
			<p>
				<span className="arc-words__label">
					{ __( 'Rendered', 'pendulum-arc' ) }
				</span>
				<span className="arc-words__value">{ match[ 2 ] }</span>
			</p>
		</div>
	);
}

function moodAccent( mood ) {
	return MOOD_ACCENT[ mood ] || 'muted';
}

/**
 * Portal pill. `md` is the coloured band. `xs` is the footer chip.
 *
 * @param {Object}                    props
 * @param {string}                    [props.accent]
 * @param {'md'|'xs'}                 [props.size]
 * @param {import('react').ReactNode} props.children
 */
function ReportPill( { accent = 'muted', size = 'md', children } ) {
	return (
		<span className="arc-pill" data-accent={ accent } data-size={ size }>
			<span className="arc-pill__label">{ children }</span>
		</span>
	);
}

function EmphasisNumbers( { text, hot = false } ) {
	let seen = false;
	const parts = String( text ).split( /(\d+(?:\.\d+)?)/ );
	return parts.map( ( part, index ) => {
		if ( ! /^\d/.test( part ) ) {
			return <span key={ index }>{ part }</span>;
		}
		const first = ! seen;
		seen = true;
		return (
			<span
				className="arc-pill__count"
				data-hot={
					hot && first && Number( part ) > 0 ? 'true' : undefined
				}
				key={ index }
			>
				{ part }
			</span>
		);
	} );
}

/**
 * Score column. Mirrors Arc ScoreHeroScore, including brand coverage.
 *
 * @param {Object}  props
 * @param {string}  props.title
 * @param {string}  [props.score]
 * @param {string}  [props.band]
 * @param {string}  [props.mood]
 * @param {boolean} [props.empty]
 * @param {string}  [props.coverage]
 */
function ScoreReadout( { title, score, band, mood, empty, coverage } ) {
	const display = score || '-';
	const unscored = display === 'Not scored';
	return (
		<div className="arc-report-score">
			<p className="arc-report-hero__overline">{ title }</p>
			{ unscored ? (
				<p className="arc-report-hero__title">{ display }</p>
			) : (
				<p
					className="arc-report-hero__figure"
					data-mood={ mood || undefined }
					data-empty={ empty || display === '-' ? 'true' : undefined }
				>
					{ display }
				</p>
			) }
			{ band || coverage ? (
				<div className="arc-report-score__meta">
					{ band ? (
						<ReportPill accent={ moodAccent( mood ) }>
							{ band }
						</ReportPill>
					) : null }
					{ coverage ? (
						<span className="arc-report-score__coverage">
							{ coverage }
						</span>
					) : null }
				</div>
			) : null }
		</div>
	);
}

function runHref( portalUrl, runId ) {
	if ( portalUrl && runId ) {
		return `${ portalUrl.replace( /\/$/, '' ) }/runs/${ runId }`;
	}
	return portalUrl || '';
}

function CellImage( { image, href } ) {
	if ( ! image || ! image.src ) {
		return null;
	}
	const img = <img src={ image.src } alt={ image.alt || '' } />;
	if ( ! href ) {
		return img;
	}
	return (
		<a href={ href } target="_blank" rel="noreferrer">
			{ img }
		</a>
	);
}

function CellText( { cell, href, newTab } ) {
	if ( ! cell.text ) {
		return null;
	}
	const text = (
		<span
			className="arc-report-cell__text"
			data-mood={ cell.mood || undefined }
		>
			{ cell.text }
		</span>
	);
	if ( ! href ) {
		return text;
	}
	return (
		<a
			href={ href }
			target={ newTab ? '_blank' : undefined }
			rel={ newTab ? 'noreferrer' : undefined }
		>
			{ text }
		</a>
	);
}

/**
 * SEO page preview. Same thumb as the portal social card: image plane,
 * title, description. Screenshot-only previews stay a plain thumb.
 *
 * @param {Object|undefined} column
 * @param {Object}           cell
 */
function previewColumnCell( column, cell ) {
	if ( ! column || column.id !== 'preview' ) {
		return null;
	}
	const text = String( cell.text || '' ).trim();
	if ( cell.caption || ( text && text !== 'No screenshot' ) ) {
		return <SocialPreviewCard cell={ cell } />;
	}
	return <PageThumb image={ cell.image } />;
}

function SocialPreviewCard( { cell } ) {
	const src = cell.image && cell.image.src ? cell.image.src : '';
	const title = String( cell.text || '' ).trim();
	const description = String( cell.caption || '' ).trim();
	const [ failed, setFailed ] = useState( false );
	const [ ready, setReady ] = useState( false );
	const missingTitle = __( 'Missing title', 'pendulum-arc' );
	const missingDescription = __( 'Missing description', 'pendulum-arc' );
	return (
		<div
			className="arc-preview-card"
			title={ [
				title || missingTitle,
				description || missingDescription,
			].join( '\n' ) }
		>
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
					<span
						className="arc-preview-card__fallback"
						title={
							failed
								? __( 'Image failed to load', 'pendulum-arc' )
								: __( 'Missing image', 'pendulum-arc' )
						}
					>
						<StrokeMark
							name={ failed ? 'unlink' : 'image' }
							size={ 14 }
							strokeWidth={ 1.5 }
						/>
					</span>
				) : null }
			</div>
			<div className="arc-preview-card__body">
				<p
					className="arc-preview-card__title"
					data-missing={ title ? undefined : 'true' }
				>
					{ title || missingTitle }
				</p>
				<p
					className="arc-preview-card__detail"
					data-missing={ description ? undefined : 'true' }
				>
					{ description || missingDescription }
				</p>
			</div>
		</div>
	);
}

function PageThumb( { image } ) {
	const src = image && image.src ? image.src : '';
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
		<img className="arc-page-thumb" src={ src } alt={ image.alt || '' } />
	);
}

/**
 * Underlined page link. Opens in a new tab with an arrow on the right.
 *
 * @param {Object}                    props
 * @param {string}                    props.href
 * @param {import('react').ReactNode} props.children
 */
function PageLink( { href, children } ) {
	return (
		<a
			className="arc-page-link"
			href={ href }
			target="_blank"
			rel="noreferrer"
		>
			<span className="arc-page-link__label">{ children }</span>
			<StrokeMark name="external" size={ 12 } strokeWidth={ 2 } />
		</a>
	);
}

/**
 * Page-analysis URL cell. View uses the crawled URL already on the cell.
 *
 * @param {Object}           block
 * @param {Object|undefined} column
 * @param {Object}           cell
 */
function pageUrlCell( block, column, cell ) {
	if ( block.id !== 'pages' || ! column || column.id !== 'url' ) {
		return null;
	}
	const viewHref = cell.href || '';
	const editHref = cell.editHref || '';
	return (
		<div className="arc-report-cell">
			<CellText cell={ cell } />
			{ viewHref ? (
				<PageLink href={ viewHref }>
					{ __( 'View', 'pendulum-arc' ) }
				</PageLink>
			) : null }
			{ editHref ? (
				<PageLink href={ editHref }>
					{ __( 'Edit', 'pendulum-arc' ) }
				</PageLink>
			) : null }
		</div>
	);
}

function ReportCell( { cell } ) {
	const viewHref = cell.href || '';
	const editHref = cell.editHref || '';
	const textHref = editHref || viewHref;
	return (
		<div className="arc-report-cell">
			<CellImage image={ cell.image } href={ viewHref } />
			<CellText cell={ cell } href={ textHref } newTab={ ! editHref } />
			{ cell.caption ? (
				<span className="arc-report-cell__caption">
					{ cell.caption }
				</span>
			) : null }
		</div>
	);
}

const AGENT_TABLE_ICON = {
	llms: 'fileCode',
	bots: 'bot',
};

function ReportTable( { block, service, panel = false } ) {
	const profiles = ( block.rows || [] ).some(
		( row ) => row.kind === 'profile'
	);
	const [ kind, setKind ] = useState(
		block.id === 'socials' && profiles ? 'profile' : 'all'
	);
	const rows =
		block.id === 'socials' && kind !== 'all'
			? ( block.rows || [] ).filter( ( row ) => row.kind === kind )
			: block.rows || [];
	const empty =
		block.id === 'socials' && kind === 'content'
			? __( 'No social content links found in this run.', 'pendulum-arc' )
			: block.empty;

	const count =
		rows.length > 0 ? (
			<span className="arc-pill" data-accent="muted" data-size="xs">
				<span className="arc-pill__label">{ rows.length }</span>
			</span>
		) : null;

	return (
		<section
			className={
				panel
					? 'arc-security-panel arc-agents-table'
					: 'arc-report-block arc-table-card'
			}
			data-span={ panel ? undefined : block.span || 'full' }
		>
			{ panel ? (
				<SecurityPanelBar
					icon={ AGENT_TABLE_ICON[ block.id ] || 'file' }
					heading={ block.heading }
					end={ count }
				/>
			) : (
				<div className="arc-table-card__bar">
					<h3>{ block.heading }</h3>
					{ count }
					{ block.id === 'socials' ? (
						<div className="arc-report-filters">
							{ [
								[ 'profile', __( 'Platform', 'pendulum-arc' ) ],
								[ 'content', __( 'Content', 'pendulum-arc' ) ],
								[ 'all', __( 'All', 'pendulum-arc' ) ],
							].map( ( [ value, label ] ) => (
								<button
									key={ value }
									type="button"
									aria-pressed={ kind === value }
									onClick={ () => setKind( value ) }
								>
									{ label }
								</button>
							) ) }
						</div>
					) : null }
				</div>
			) }
			{ rows.length === 0 ? (
				<p className="arc-table-card__empty">{ empty }</p>
			) : (
				<div
					className={
						block.id === 'pages'
							? 'arc-table-card__scroll arc-table-card__scroll--pages'
							: 'arc-table-card__scroll'
					}
				>
					<table className="arc-report-table">
						<thead>
							<tr>
								{ ( block.columns || [] ).map( ( column ) => (
									<th
										key={ column.id || column.label }
										data-align={ column.align || 'start' }
									>
										<span className="arc-report-table__label">
											<ColumnMark id={ column.id } />
											{ column.label }
										</span>
									</th>
								) ) }
							</tr>
						</thead>
						<tbody>
							{ rows.map( ( row, index ) => (
								<tr key={ row.id || index }>
									{ ( row.cells || [] ).map(
										( cell, cellIndex ) => (
											<td
												key={ cellIndex }
												data-align={
													block.columns[ cellIndex ]
														?.align || 'start'
												}
											>
												{ scoreColumnCell(
													service,
													block,
													block.columns[ cellIndex ],
													cell
												) ||
													wordsColumnCell(
														block.columns[
															cellIndex
														],
														cell
													) ||
													previewColumnCell(
														block.columns[
															cellIndex
														],
														cell
													) ||
													pageUrlCell(
														block,
														block.columns[
															cellIndex
														],
														cell
													) || (
														<ReportCell
															cell={ cell }
														/>
													) }
											</td>
										)
									) }
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }
		</section>
	);
}

function ReportCard( { block } ) {
	return (
		<section
			className="arc-report-block"
			data-span={ block.span || 'full' }
		>
			<div className="arc-report-card">
				<div className="arc-report-card__bar">
					<h3>{ block.heading }</h3>
					{ block.badge ? (
						<span
							className="arc-report-badge"
							data-mood={ block.badgeTone || undefined }
						>
							{ block.badge }
						</span>
					) : null }
					{ block.href && block.hrefLabel ? (
						<a href={ block.href } target="_blank" rel="noreferrer">
							{ block.hrefLabel }
						</a>
					) : null }
				</div>
				{ block.note ? (
					<p className="arc-report-card__note">{ block.note }</p>
				) : null }
				{ block.text ? (
					<pre className="arc-report-card__text">{ block.text }</pre>
				) : null }
				{ ( block.fields || [] ).length > 0 ? (
					<dl className="arc-report-fields">
						{ block.fields.map( ( field ) => (
							<div key={ `${ field.label }-${ field.value }` }>
								<dt>{ field.label }</dt>
								<dd data-mood={ field.tone || undefined }>
									{ field.href ? (
										<a
											href={ field.href }
											target="_blank"
											rel="noreferrer"
										>
											{ field.value }
										</a>
									) : (
										field.value
									) }
								</dd>
							</div>
						) ) }
					</dl>
				) : null }
				{ ( block.images || [] ).length > 0 ? (
					<ul className="arc-report-images">
						{ block.images.map( ( image ) => (
							<li
								key={ `${ image.src }-${ image.caption || '' }` }
							>
								<a
									href={ image.href || image.src }
									target="_blank"
									rel="noreferrer"
								>
									<img
										src={ image.src }
										alt={ image.alt || '' }
									/>
								</a>
								{ image.caption ? (
									<span>{ image.caption }</span>
								) : null }
							</li>
						) ) }
					</ul>
				) : null }
				{ ( block.links || [] ).length > 0 ? (
					<ul className="arc-report-links">
						{ block.links.map( ( link ) => (
							<li key={ link.href }>
								<a
									href={ link.href }
									target="_blank"
									rel="noreferrer"
								>
									{ link.label }
								</a>
							</li>
						) ) }
					</ul>
				) : null }
			</div>
		</section>
	);
}

const SECURITY_ICON = {
	system: 'layers',
	environment: 'globe',
	plugins: 'puzzle',
	headers: 'key',
	cookies: 'cookie',
	mixed: 'link',
};

const SECURITY_TIP = {
	system: __(
		'Detected web system (for example WordPress, Next, or Shopify), version when extractable, confidence, and evidence.',
		'pendulum-arc'
	),
	plugins: __(
		'Public plugins or extensions when the parent system is at least medium confidence. Each row is the slug, version, and evidence. A visible plugin path is highlighted on those rows.',
		'pendulum-arc'
	),
	environment: __(
		'Public DNS (NS, CNAME, A/AAAA), IP, optional hosting provider guess, and the tech stack under the nameservers. Each row is a language, framework, server, or edge, with the signal that named it.',
		'pendulum-arc'
	),
	headers: __(
		'Security-related response headers on crawl pages. A row that passes shows a Pass pill. Missing policy headers and leaked Server or X-Powered-By values are highlighted when they fail the catalog.',
		'pendulum-arc'
	),
	cookies: __(
		'Set-Cookie headers on the resolved HTML crawl. The count is those pages. The same name and flags are one row, and the page count lists every path. Weak Secure, HttpOnly, or SameSite settings are highlighted on the matching rows.',
		'pendulum-arc'
	),
	mixed: __(
		'HTTP resources loaded on HTTPS pages. Active mixed content (scripts) and passive (images, media) are listed with the page path where they were observed.',
		'pendulum-arc'
	),
};

const CONFIDENCE_TIP = __(
	'How sure this product fingerprint is. High means a strong public match. Version confidence is recorded separately.',
	'pendulum-arc'
);

const BADGE_ACCENT = {
	good: 'emerald',
	warn: 'amber',
	bad: 'red',
	muted: 'muted',
};

const MISSING_VALUE = new Set( [
	'',
	'-',
	'None',
	'Unknown',
	'Not extracted',
	'Not sent',
] );

/**
 * @param {Array<{ group?: string|null }>} fields
 */
function fieldGroups( fields ) {
	const groups = [];
	fields.forEach( ( field ) => {
		const name = field.group || '';
		const current = groups[ groups.length - 1 ];
		if ( ! current || current.name !== name ) {
			groups.push( { name, fields: [ field ] } );
		} else {
			current.fields.push( field );
		}
	} );
	return groups;
}

function SecurityPill( { label, accent, size = 'xs' } ) {
	if ( ! label ) {
		return null;
	}
	return (
		<span
			className="arc-pill"
			data-accent={ accent || 'muted' }
			data-size={ size }
		>
			<span className="arc-pill__label">{ label }</span>
		</span>
	);
}

function SecurityPanelBar( {
	icon,
	heading,
	after = null,
	tip = '',
	end = null,
} ) {
	return (
		<div className="arc-security-panel__bar">
			<span className="arc-security-panel__icon">
				<StrokeMark name={ icon } />
			</span>
			<h3>{ heading }</h3>
			{ tip ? <InfoTip title={ heading } body={ tip } /> : null }
			{ after }
			{ end ? (
				<span className="arc-security-panel__end">{ end }</span>
			) : null }
		</div>
	);
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

const PRODUCT_MARKS = {
	wordpress: {
		fill: '#21759B',
		d: 'M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.03 1.232-.105 1.232-.105.582-.075.514-.93-.067-.899 0 0-1.755.135-2.88.135-1.064 0-2.85-.15-2.85-.15-.585-.03-.661.855-.075.885 0 0 .54.061 1.125.09l1.68 4.605-2.37 7.08L5.354 6.9c.649-.03 1.234-.1 1.234-.1.585-.075.516-.93-.065-.896 0 0-1.746.138-2.874.138-.2 0-.438-.008-.69-.015C4.911 3.15 8.235 1.215 12 1.215c2.809 0 5.365 1.072 7.286 2.833-.046-.003-.091-.009-.141-.009-1.06 0-1.812.923-1.812 1.914 0 .89.513 1.643 1.06 2.531.411.72.89 1.643.89 2.977 0 .915-.354 1.994-.821 3.479l-1.075 3.585-3.9-11.61.001.014zM12 22.784c-1.059 0-2.081-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149-1.12.393-2.325.609-3.582.609M1.211 12c0-1.564.336-3.05.935-4.39L7.29 21.709C3.694 19.96 1.212 16.271 1.211 12M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0',
	},
};

function HarvestMark( { name } ) {
	const product = PRODUCT_MARKS[ name ];
	if ( product ) {
		return (
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path fill={ product.fill } d={ product.d } />
			</svg>
		);
	}
	if ( name === 'tag' ) {
		return <StrokeMark name="tag" size={ 16 } />;
	}
	if ( name === 'html' || name === 'asset' ) {
		return <StrokeMark name="file" size={ 16 } />;
	}
	if ( name === 'path' ) {
		return <StrokeMark name="link" size={ 16 } />;
	}
	if ( name === 'header' ) {
		return <StrokeMark name="file" size={ 16 } />;
	}
	if ( name === 'generator' || name === 'js' || name === 'language' ) {
		return <StrokeMark name="type" size={ 16 } />;
	}
	if ( name === 'robots' ) {
		return <StrokeMark name="bot" size={ 16 } />;
	}
	if ( name === 'framework' ) {
		return <StrokeMark name="layers" size={ 16 } />;
	}
	if ( name === 'server' ) {
		return <StrokeMark name="box" size={ 16 } />;
	}
	if ( name === 'edge' ) {
		return <StrokeMark name="globe" size={ 16 } />;
	}
	return (
		<span className="arc-harvest__unknown" aria-hidden="true">
			?
		</span>
	);
}

function HarvestField( { field } ) {
	const missing = MISSING_VALUE.has( field.value || '' );
	const signal = Boolean( field.meta && field.caption );
	return (
		<div
			className="arc-harvest"
			data-wide={ field.wide ? 'true' : undefined }
			data-tint={ field.pillTone || undefined }
		>
			<IssueAnchors targets={ field.targets } />
			{ field.mark ? (
				<span className="arc-harvest__mark">
					<HarvestMark name={ field.mark } />
				</span>
			) : null }
			<div className="arc-harvest__body">
				<div className="arc-harvest__top">
					<p className="arc-harvest__label">{ field.label }</p>
					<SecurityPill
						label={ field.pill }
						accent={ field.pillTone }
					/>
				</div>
				<p
					className="arc-harvest__value"
					data-missing={ missing ? 'true' : undefined }
					data-mono={
						field.group === 'Evidence' ? 'true' : undefined
					}
				>
					{ field.href ? (
						<a href={ field.href } target="_blank" rel="noreferrer">
							{ field.value }
						</a>
					) : (
						field.value
					) }
					{ field.meta ? (
						<span className="arc-harvest__meta">
							{ field.meta }
						</span>
					) : null }
				</p>
				{ signal ? (
					<p className="arc-harvest__signal">{ field.caption }</p>
				) : null }
				{ field.caption && ! signal ? (
					<p className="arc-harvest__caption">{ field.caption }</p>
				) : null }
			</div>
		</div>
	);
}

function confidenceLabel( level ) {
	return sprintf(
		/* translators: %s: confidence level, such as high. */
		__( 'Confidence: %s', 'pendulum-arc' ),
		level
	);
}

function SecurityCard( { block } ) {
	const groups = fieldGroups( block.fields || [] );
	return (
		<section className="arc-security-panel">
			<SecurityPanelBar
				icon={ SECURITY_ICON[ block.id ] || 'layers' }
				heading={ block.heading }
				after={
					block.id === 'system' && block.badge ? (
						<span title={ CONFIDENCE_TIP }>
							<SecurityPill
								label={ confidenceLabel( block.badge ) }
								accent={
									BADGE_ACCENT[ block.badgeTone ] || 'muted'
								}
								size="md"
							/>
						</span>
					) : null
				}
				tip={ SECURITY_TIP[ block.id ] || '' }
			/>
			<div className="arc-security-panel__body">
				{ block.note ? (
					<p className="arc-security-panel__empty">{ block.note }</p>
				) : null }
				{ groups.map( ( group ) => (
					<div
						className="arc-security-group"
						data-stack={
							group.name === 'Evidence' ||
							group.name === 'Tech stack'
								? 'column'
								: undefined
						}
						key={ group.name || 'fields' }
					>
						{ group.name ? (
							<p className="arc-security-group__label">
								{ group.name }
							</p>
						) : null }
						<div className="arc-harvest-grid">
							{ group.fields.map( ( field ) => (
								<HarvestField
									key={ `${ field.label }-${ field.value }` }
									field={ field }
								/>
							) ) }
						</div>
					</div>
				) ) }
			</div>
		</section>
	);
}

function lensParts( row, kind ) {
	const cells = row.cells || [];
	const first = cells[ 0 ] || {};
	const second = cells[ 1 ] || {};
	const third = cells[ 2 ] || {};
	if ( kind === 'headers' ) {
		const caption = second.caption || '';
		return {
			name: first.text,
			value: second.text,
			href: '',
			note:
				caption.indexOf( 'Report-only' ) === 0
					? __( 'Report-only', 'pendulum-arc' )
					: '',
			pill: second.pill,
			tone: second.pillTone,
			title: caption,
		};
	}
	if ( kind === 'plugins' ) {
		return {
			name: first.text,
			value: second.text,
			href: '',
			note: '',
			pill: second.pill,
			tone: second.pillTone,
			title: second.caption || '',
		};
	}
	if ( kind === 'cookies' ) {
		return {
			name: first.text,
			value: third.text,
			href: '',
			note: second.text,
			pill: first.pill,
			tone: first.pillTone,
			title: first.caption || '',
		};
	}
	return {
		name: second.text,
		value: first.text,
		href: first.href || '',
		note: third.text,
		pill: first.pill,
		tone: first.pillTone,
		title: first.caption || '',
	};
}

function valueTipLines( parts ) {
	const value = String( parts.value || '' ).trim();
	const summary = String( parts.title || '' ).trim();
	const lines = [];
	if ( value && ! MISSING_VALUE.has( value ) ) {
		lines.push( value );
	}
	if ( summary && summary !== value ) {
		lines.push( summary );
	}
	return lines;
}

function headerTipLines( parts ) {
	let summary = String( parts.title || '' ).trim();
	if ( summary === 'Report-only' ) {
		summary = '';
	} else if ( summary.indexOf( 'Report-only - ' ) === 0 ) {
		summary = summary.slice( 'Report-only - '.length ).trim();
	}
	return valueTipLines( { value: parts.value, title: summary } );
}

function cookieTipLines( parts ) {
	const flags = String( parts.value || '' ).trim();
	const pages = String( parts.note || '' ).trim();
	const summary = String( parts.title || '' ).trim();
	const lines = [];
	if ( flags && ! MISSING_VALUE.has( flags ) ) {
		lines.push( flags );
	}
	if ( pages.includes( ', ' ) ) {
		lines.push( pages );
	}
	if ( summary && summary !== flags ) {
		lines.push( summary );
	}
	return lines;
}

function lensTipLines( kind, parts ) {
	if ( kind === 'headers' ) {
		return headerTipLines( parts );
	}
	if ( kind === 'cookies' ) {
		return cookieTipLines( parts );
	}
	if ( kind === 'plugins' || kind === 'mixed' ) {
		return valueTipLines( parts );
	}
	return [];
}

function LensList( { rows, kind } ) {
	return (
		<ul className="arc-lens-list">
			{ rows.map( ( row ) => {
				const parts = lensParts( row, kind );
				const missing = MISSING_VALUE.has( parts.value || '' );
				const tipLines = lensTipLines( kind, parts );
				const value = parts.href ? (
					<a href={ parts.href } target="_blank" rel="noreferrer">
						{ parts.value }
					</a>
				) : (
					parts.value
				);
				return (
					<li
						key={ row.id || parts.name }
						className="arc-lens-row"
						data-tint={ parts.tone || undefined }
						title={
							tipLines.length > 0
								? undefined
								: parts.title || undefined
						}
					>
						<IssueAnchors targets={ row.targets } />
						<p className="arc-lens-row__name">{ parts.name }</p>
						<p
							className="arc-lens-row__value"
							data-missing={ missing ? 'true' : undefined }
						>
							{ tipLines.length > 0 ? (
								<ValueTip lines={ tipLines }>
									{ value }
								</ValueTip>
							) : (
								value
							) }
						</p>
						<p className="arc-lens-row__note">{ parts.note }</p>
						<span className="arc-lens-row__pill">
							<SecurityPill
								label={ parts.pill }
								accent={ parts.tone }
							/>
						</span>
					</li>
				);
			} ) }
		</ul>
	);
}

function lensKind( id ) {
	if ( id === 'headers' || id === 'cookies' || id === 'plugins' ) {
		return id;
	}
	return 'mixed';
}

function securityTableBody( block, rows ) {
	if ( rows.length === 0 ) {
		return <p className="arc-security-panel__empty">{ block.empty }</p>;
	}
	return <LensList rows={ rows } kind={ lensKind( block.id ) } />;
}

function SecurityTable( { block } ) {
	const rows = block.rows || [];
	const scored = block.id === 'headers' || block.id === 'cookies';
	return (
		<section
			className="arc-security-panel"
			data-lens={ scored ? 'score' : undefined }
		>
			<SecurityPanelBar
				icon={ SECURITY_ICON[ block.id ] || 'key' }
				heading={ block.heading }
				after={
					<SecurityPill
						label={ String( rows.length ) }
						accent="muted"
						size="md"
					/>
				}
				tip={ SECURITY_TIP[ block.id ] || '' }
			/>
			<div className="arc-security-panel__scroll">
				{ securityTableBody( block, rows ) }
			</div>
		</section>
	);
}

const BRAND_MARK_ICON = {
	'short-mark': 'dot',
	'long-mark': 'layers',
};

function BrandMarkCard( { block } ) {
	const images = block.images || [];
	const mark = block.mark || null;
	const familyNote = mark && mark.present && block.note ? block.note : '';
	return (
		<section className="arc-security-panel">
			<SecurityPanelBar
				icon={ BRAND_MARK_ICON[ block.id ] || 'image' }
				heading={ block.heading }
				end={
					<SecurityPill
						label={ block.badge }
						accent={ BADGE_ACCENT[ block.badgeTone ] || 'muted' }
					/>
				}
			/>
			<div className="arc-security-panel__body">
				{ block.note && ! familyNote ? (
					<p className="arc-security-panel__empty">{ block.note }</p>
				) : null }
				{ images.length > 0 ? (
					<ul className="arc-mark-grid">
						{ images.map( ( image ) => (
							<li
								key={ `${ image.src }-${ image.caption || '' }` }
							>
								<a
									href={ image.href || image.src }
									target="_blank"
									rel="noreferrer"
								>
									<img
										src={ image.src }
										alt={ image.alt || '' }
									/>
								</a>
								{ image.caption ? (
									<span>{ image.caption }</span>
								) : null }
							</li>
						) ) }
					</ul>
				) : null }
				{ familyNote ? (
					<p className="arc-mark-note">{ familyNote }</p>
				) : null }
			</div>
		</section>
	);
}

function BrandReport( { blocks } ) {
	const marks = [];
	const rest = [];
	blocks.forEach( ( block ) => {
		if ( block.id === 'short-mark' || block.id === 'long-mark' ) {
			marks.push( block );
		} else {
			rest.push( block );
		}
	} );
	return (
		<div className="arc-agents">
			{ marks.length ? (
				<div className="arc-agents__pair">
					{ marks.map( ( block ) => (
						<div
							className="arc-agents__slot"
							key={ block.id || block.heading }
						>
							<BrandMarkCard block={ block } />
						</div>
					) ) }
				</div>
			) : null }
			{ rest.length ? (
				<ReportBlocks blocks={ rest } service="brand" />
			) : null }
		</div>
	);
}

function SecurityReport( { blocks } ) {
	const left = [];
	const right = [];
	const rest = [];
	let surfaces = null;
	blocks.forEach( ( block ) => {
		if ( block.id === 'surfaces' ) {
			surfaces = block;
		} else if (
			block.id === 'system' ||
			block.id === 'environment' ||
			block.id === 'plugins'
		) {
			left.push( block );
		} else if (
			block.id === 'headers' ||
			block.id === 'cookies' ||
			block.id === 'mixed'
		) {
			right.push( block );
		} else {
			rest.push( block );
		}
	} );
	return (
		<>
			<div
				className="arc-security"
				data-cols={ left.length && right.length ? '2' : '1' }
			>
				{ left.length ? (
					<div className="arc-security__col">
						{ left.map( ( block ) =>
							block.kind === 'table' ? (
								<SecurityTable
									key={ block.id || block.heading }
									block={ block }
								/>
							) : (
								<SecurityCard
									key={ block.id || block.heading }
									block={ block }
								/>
							)
						) }
					</div>
				) : null }
				{ right.length ? (
					<div className="arc-security__col">
						{ right.map( ( block ) =>
							block.kind === 'card' ? (
								<SecurityCard
									key={ block.id || block.heading }
									block={ block }
								/>
							) : (
								<SecurityTable
									key={ block.id || block.heading }
									block={ block }
								/>
							)
						) }
					</div>
				) : null }
			</div>
			{ surfaces ? <SecuritySurfaces block={ surfaces } /> : null }
			{ rest.length ? <ReportBlocks blocks={ rest } /> : null }
		</>
	);
}

const ORIGIN_MARK = {
	good: 'check',
	warn: 'alert',
	bad: 'x',
	muted: 'help',
};

const AGENT_IDS = [ 'origin', 'robots', 'llms', 'bots', 'mcp' ];

const ORIGIN_TIP = __(
	'Audit origin for this run and origin-file probes (sitemap, llms.txt, llms-full, and related). Rows link out when a URL was found.',
	'pendulum-arc'
);

const ROBOTS_TIP = __(
	'robots.txt body captured in this run, plus sitemap URLs declared in that file.',
	'pendulum-arc'
);

const BOTS_TIP = __(
	'Per-user-agent allow, disallow, inherited, or unknown status from robots policy for AI crawlers. Filter by explicit allow or disallow. Inherited and unknown stay on All.',
	'pendulum-arc'
);

const LLMS_TIP = __(
	'Curated links from llms.txt. Optional sections are marked. Broken URLs show probe status. Format issues list separately when the file did not parse cleanly.',
	'pendulum-arc'
);

const MCP_TIP = __(
	'Optional discovery manifest some agent tooling probes for. Not required for every site. Shown when found or when known paths were checked.',
	'pendulum-arc'
);

function pathLabel( url ) {
	try {
		const parsed = new URL( url );
		return `${ parsed.pathname }${ parsed.search }${ parsed.hash }` || '/';
	} catch {
		return url;
	}
}

function PanelViewLink( { href, label } ) {
	return (
		<a
			className="arc-panel-view"
			href={ href }
			target="_blank"
			rel="noreferrer"
		>
			{ label }
			<StrokeMark name="external" size={ 12 } strokeWidth={ 2 } />
		</a>
	);
}

function OriginRow( { field } ) {
	const tone = field.tone || 'muted';
	const inner = (
		<>
			<span className="arc-origin-row__mark" data-tone={ tone }>
				<StrokeMark
					name={ ORIGIN_MARK[ tone ] || 'help' }
					size={ 14 }
					strokeWidth={ 2.25 }
				/>
			</span>
			<p className="arc-origin-row__label">{ field.label }</p>
			<p className="arc-origin-row__value" data-tone={ tone }>
				<span>{ field.value }</span>
				{ field.caption ? (
					<span className="arc-origin-row__detail">
						{ field.caption }
					</span>
				) : null }
			</p>
		</>
	);
	if ( ! field.href ) {
		return (
			<div className="arc-origin-row" data-tone={ tone }>
				{ inner }
			</div>
		);
	}
	return (
		<a
			className="arc-origin-row"
			data-tone={ tone }
			href={ field.href }
			target="_blank"
			rel="noreferrer"
		>
			{ inner }
		</a>
	);
}

function AiOriginCard( { block } ) {
	return (
		<section className="arc-security-panel">
			<SecurityPanelBar
				icon="globe"
				heading={ block.heading }
				tip={ ORIGIN_TIP }
			/>
			<div className="arc-security-panel__body">
				{ block.href ? (
					<a
						className="arc-origin-url"
						href={ block.href }
						target="_blank"
						rel="noreferrer"
					>
						<span>{ block.hrefLabel || block.href }</span>
						<StrokeMark name="external" size={ 14 } />
					</a>
				) : null }
				<div className="arc-origin-rows">
					{ ( block.fields || [] ).map( ( field ) => (
						<OriginRow
							key={ `${ field.label }-${ field.value }` }
							field={ field }
						/>
					) ) }
				</div>
			</div>
		</section>
	);
}

function AiRobotsCard( { block } ) {
	return (
		<section className="arc-security-panel arc-robots-panel">
			<SecurityPanelBar
				icon="fileCode"
				heading={ block.heading }
				tip={ ROBOTS_TIP }
				end={
					block.href && block.hrefLabel ? (
						<PanelViewLink
							href={ block.href }
							label={ block.hrefLabel }
						/>
					) : null
				}
			/>
			<div className="arc-security-panel__body arc-robots-body">
				{ block.text ? (
					<pre>{ block.text }</pre>
				) : (
					<p className="arc-security-panel__empty">{ block.note }</p>
				) }
				{ ( block.links || [] ).length > 0 ? (
					<div className="arc-robots-sitemaps">
						<p className="arc-security-group__label">Sitemaps</p>
						<ul>
							{ block.links.map( ( link ) => (
								<li key={ link.href }>
									<a
										href={ link.href }
										target="_blank"
										rel="noreferrer"
										title={ link.label }
									>
										<span>{ pathLabel( link.href ) }</span>
										<StrokeMark
											name="external"
											size={ 12 }
											strokeWidth={ 2 }
										/>
									</a>
								</li>
							) ) }
						</ul>
					</div>
				) : null }
			</div>
		</section>
	);
}

function mcpParts( block ) {
	const fields = block.fields || [];
	const grouped = fields.some(
		( field ) => field.group === 'Identity' || field.group === 'Tools'
	);
	const name = fields.find(
		( field ) =>
			field.label === 'Name' &&
			( ! grouped || field.group === 'Identity' )
	);
	const description = fields.find(
		( field ) =>
			field.label === 'Description' &&
			( ! grouped || field.group === 'Identity' )
	);
	const tools = grouped
		? fields.filter( ( field ) => field.group === 'Tools' )
		: fields.filter(
				( field ) =>
					field.label !== 'Name' && field.label !== 'Description'
			);
	return { name, description, tools };
}

function mcpIntro( name, description, emptyTools, note ) {
	if ( name ) {
		return (
			<div className="arc-mcp-identity">
				<p className="arc-mcp-identity__name">{ name.value }</p>
				{ description ? (
					<p className="arc-mcp-identity__detail">
						{ description.value }
					</p>
				) : null }
			</div>
		);
	}
	if ( emptyTools ) {
		return <p className="arc-security-panel__empty">{ note }</p>;
	}
	return null;
}

function mcpCandidate( link ) {
	if ( link.label.startsWith( 'Found ' ) ) {
		return {
			href: link.href,
			present: true,
			url: link.label.slice( 'Found '.length ),
		};
	}
	if ( link.label.startsWith( 'Miss ' ) ) {
		return {
			href: link.href,
			present: false,
			url: link.label.slice( 'Miss '.length ),
		};
	}
	return null;
}

function AiMcpCard( { block } ) {
	const { name, description, tools } = mcpParts( block );
	const note = block.note || '';
	const showingMatch = note.match( /^Showing \d+ of (\d+)/ );
	const showing = Boolean( showingMatch );
	const emptyTools = note === 'No tools listed in the discovery manifest.';
	const parseError = note && ! showing && ! emptyTools ? note : '';
	const candidates = ( block.links || [] )
		.map( mcpCandidate )
		.filter( Boolean );
	return (
		<section className="arc-security-panel">
			<SecurityPanelBar
				icon="plug"
				heading={ block.heading }
				tip={ MCP_TIP }
				end={
					block.href && block.hrefLabel ? (
						<PanelViewLink
							href={ block.href }
							label={ block.hrefLabel }
						/>
					) : (
						<SecurityPill
							label={ block.badge }
							accent={
								BADGE_ACCENT[ block.badgeTone ] || 'muted'
							}
						/>
					)
				}
			/>
			<div className="arc-security-panel__body">
				{ mcpIntro( name, description, emptyTools, note ) }
				{ parseError ? (
					<div className="arc-mcp-error" role="status">
						<span className="arc-origin-row__mark" data-tone="warn">
							<StrokeMark
								name="alert"
								size={ 13 }
								strokeWidth={ 2 }
							/>
						</span>
						<div>
							<p className="arc-mcp-error__label">Parse error</p>
							<p>{ parseError }</p>
						</div>
					</div>
				) : null }
				{ candidates.length > 0 ? (
					<div className="arc-mcp-block">
						<p className="arc-security-group__label">Candidates</p>
						<ul className="arc-security-rows" data-layout="stack">
							{ candidates.map( ( row ) => (
								<li key={ row.href }>
									<p
										className="arc-security-rows__meta"
										data-mono="true"
									>
										{ pathLabel( row.url || row.href ) }
									</p>
									<SecurityPill
										label={ row.present ? 'Found' : 'Miss' }
										accent={
											row.present ? 'emerald' : 'muted'
										}
									/>
								</li>
							) ) }
						</ul>
					</div>
				) : null }
				{ tools.length > 0 ? (
					<div className="arc-mcp-block">
						<div className="arc-mcp-tools__bar">
							<p className="arc-security-group__label">
								<StrokeMark
									name="wrench"
									size={ 11 }
									strokeWidth={ 2 }
								/>
								Tools
							</p>
							<SecurityPill
								label={
									showingMatch
										? showingMatch[ 1 ]
										: String( tools.length )
								}
								accent="muted"
							/>
						</div>
						<ul className="arc-security-rows" data-layout="stack">
							{ tools.map( ( tool ) => (
								<li key={ tool.label }>
									<div className="arc-security-rows__copy">
										<p
											className="arc-security-rows__name"
											data-mono="true"
										>
											{ tool.label }
										</p>
										{ tool.value && tool.value !== '-' ? (
											<p className="arc-mcp-tool__detail">
												{ tool.value }
											</p>
										) : null }
									</div>
								</li>
							) ) }
						</ul>
						{ showing ? (
							<p className="arc-mcp-showing">{ note }</p>
						) : null }
					</div>
				) : null }
			</div>
		</section>
	);
}

const BOT_STATUS = {
	allow: __( 'Allow', 'pendulum-arc' ),
	disallow: __( 'Disallow', 'pendulum-arc' ),
	inherited: __( 'Inherited', 'pendulum-arc' ),
	unknown: __( 'Unknown', 'pendulum-arc' ),
};

function botOf( row ) {
	if ( row.bot && row.bot.ua ) {
		return row.bot;
	}
	const cells = row.cells || [];
	return {
		ua: ( cells[ 0 ] && cells[ 0 ].text ) || '',
		status: row.kind || 'unknown',
		category: ( cells[ 2 ] && cells[ 2 ].text ) || '',
		rule: '',
		source: '',
	};
}

function botRuleLine( bot ) {
	const source = bot.source ? `src ${ bot.source }` : '';
	return [ bot.rule, source ].filter( Boolean ).join( ' · ' );
}

function botFilterEmpty( filter, fallback ) {
	if ( filter === 'allow' ) {
		return __( 'No bots explicitly allowed in this run.', 'pendulum-arc' );
	}
	if ( filter === 'disallow' ) {
		return __(
			'No bots explicitly disallowed in this run.',
			'pendulum-arc'
		);
	}
	return fallback;
}

function botTone( status ) {
	if ( status === 'allow' ) {
		return 'good';
	}
	if ( status === 'disallow' ) {
		return 'bad';
	}
	return 'muted';
}

function botAccent( status ) {
	if ( status === 'allow' ) {
		return 'emerald';
	}
	if ( status === 'disallow' ) {
		return 'red';
	}
	return 'muted';
}

function botMark( status ) {
	if ( status === 'allow' ) {
		return 'check';
	}
	if ( status === 'disallow' ) {
		return 'ban';
	}
	return 'help';
}

function linkStatusLabel( link ) {
	if ( ! link.broken ) {
		return __( 'OK', 'pendulum-arc' );
	}
	if ( link.status ) {
		return `HTTP ${ link.status }`;
	}
	return __( 'Broken', 'pendulum-arc' );
}

function llmsOf( row ) {
	if ( row.llms && ( row.llms.title || row.llms.url ) ) {
		return row.llms;
	}
	const cells = row.cells || [];
	const link = cells[ 0 ] || {};
	const section = ( cells[ 1 ] && cells[ 1 ].text ) || '';
	const status = cells[ 2 ] || {};
	return {
		title: link.text || link.href || '',
		url: link.href || '',
		notes: link.caption || '',
		section: section === '-' ? '' : section,
		optional: /\boptional\b/i.test( section ),
		broken: status.text === 'Broken',
		status: null,
	};
}

function SegmentTabs( { label, value, onChange, items } ) {
	const listRef = useRef( null );
	const [ indicator, setIndicator ] = useState( { left: 0, width: 0 } );

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
	}, [ value, items.length ] );

	return (
		<div
			ref={ listRef }
			className="arc-segment-tabs"
			role="tablist"
			aria-label={ label }
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
			{ items.map( ( item ) => (
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

function AgentTableBar( { heading, count, tip, filters, end } ) {
	return (
		<div className="arc-agents-toolbar">
			<span className="arc-agents-toolbar__label">{ heading }</span>
			{ tip ? <InfoTip title={ heading } body={ tip } /> : null }
			<span className="arc-pill" data-accent="muted" data-size="xs">
				<span className="arc-pill__label">{ count }</span>
			</span>
			{ filters }
			{ end ? (
				<span className="arc-agents-toolbar__end">{ end }</span>
			) : null }
		</div>
	);
}

function SortHeader( { id, label, sort, onSort } ) {
	return (
		<button
			type="button"
			className="arc-sort"
			data-active={ sort.key === id ? 'true' : undefined }
			onClick={ () => onSort( id ) }
		>
			<span className="arc-report-table__label">
				<ColumnMark id={ id } />
				{ label }
			</span>
			<SortArrows active={ sort.key === id } dir={ sort.dir } />
		</button>
	);
}

function toggleSortKey( key ) {
	return ( prev ) =>
		prev.key === key
			? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
			: { key, dir: key === 'ua' || key === 'title' ? 'asc' : 'desc' };
}

function AiBotsTable( { block } ) {
	const rows = ( block.rows || [] ).map( botOf );
	const [ filter, setFilter ] = useState( 'all' );
	const [ sort, setSort ] = useState( { key: 'ua', dir: 'asc' } );
	const filtered =
		filter === 'all'
			? rows
			: rows.filter( ( bot ) => bot.status === filter );
	const dir = sort.dir === 'asc' ? 1 : -1;
	const visible = [ ...filtered ].sort( ( left, right ) => {
		let primary = 0;
		if ( sort.key === 'status' ) {
			primary = String( left.status ).localeCompare( right.status );
		} else if ( sort.key === 'category' ) {
			primary = String( left.category || '' ).localeCompare(
				String( right.category || '' )
			);
		} else {
			primary = String( left.ua ).localeCompare( right.ua );
		}
		return primary * dir;
	} );
	const empty = botFilterEmpty( filter, block.empty );

	return (
		<section className="arc-security-panel arc-agents-table">
			<AgentTableBar
				heading={ block.heading }
				count={ visible.length }
				tip={ BOTS_TIP }
				filters={
					<SegmentTabs
						label={ __( 'Bot access', 'pendulum-arc' ) }
						value={ filter }
						onChange={ setFilter }
						items={ [
							{
								value: 'all',
								label: __( 'All', 'pendulum-arc' ),
							},
							{
								value: 'allow',
								label: __( 'Allow', 'pendulum-arc' ),
							},
							{
								value: 'disallow',
								label: __( 'Disallow', 'pendulum-arc' ),
							},
						] }
					/>
				}
			/>
			{ visible.length === 0 ? (
				<p className="arc-table-card__empty">{ empty }</p>
			) : (
				<div className="arc-agents-table__scroll">
					<table className="arc-report-table">
						<thead>
							<tr>
								<th>
									<span className="arc-report-table__label">
										<ColumnMark id="access" />
										{ __( 'Access', 'pendulum-arc' ) }
									</span>
								</th>
								<th>
									<SortHeader
										id="bot"
										label={ __( 'Bot', 'pendulum-arc' ) }
										sort={ {
											key: sort.key === 'ua' ? 'bot' : '',
											dir: sort.dir,
										} }
										onSort={ () =>
											setSort( toggleSortKey( 'ua' ) )
										}
									/>
								</th>
								<th>
									<SortHeader
										id="status"
										label={ __( 'Status', 'pendulum-arc' ) }
										sort={ sort }
										onSort={ () =>
											setSort( toggleSortKey( 'status' ) )
										}
									/>
								</th>
								<th>
									<SortHeader
										id="category"
										label={ __(
											'Category',
											'pendulum-arc'
										) }
										sort={ sort }
										onSort={ () =>
											setSort(
												toggleSortKey( 'category' )
											)
										}
									/>
								</th>
							</tr>
						</thead>
						<tbody>
							{ visible.map( ( bot ) => {
								const rule = botRuleLine( bot );
								const tone = botTone( bot.status );
								const accent = botAccent( bot.status );
								return (
									<tr key={ bot.ua }>
										<td>
											<span
												className="arc-origin-row__mark"
												data-tone={
													tone === 'muted'
														? undefined
														: tone
												}
											>
												<StrokeMark
													name={ botMark(
														bot.status
													) }
													size={ 14 }
													strokeWidth={ 2 }
												/>
											</span>
										</td>
										<td>
											<span className="arc-bot-name">
												<span title={ bot.ua }>
													{ bot.ua }
												</span>
												{ rule ? (
													<span
														className="arc-bot-rule"
														title={ rule }
													>
														{ rule }
													</span>
												) : null }
											</span>
										</td>
										<td>
											<SecurityPill
												label={
													BOT_STATUS[ bot.status ] ||
													bot.status
												}
												accent={ accent }
											/>
										</td>
										<td>
											{ bot.category &&
											bot.category !== '-' ? (
												<span className="arc-bot-meta">
													{ bot.category }
												</span>
											) : (
												<span
													className="arc-report-cell__text"
													data-empty="true"
												>
													-
												</span>
											) }
										</td>
									</tr>
								);
							} ) }
						</tbody>
					</table>
				</div>
			) }
		</section>
	);
}

function AiLlmsTable( { block } ) {
	const rows = ( block.rows || [] ).map( llmsOf );
	const [ sort, setSort ] = useState( { key: 'section', dir: 'asc' } );
	const dir = sort.dir === 'asc' ? 1 : -1;
	const visible = [ ...rows ].sort( ( left, right ) => {
		let primary = 0;
		if ( sort.key === 'title' ) {
			primary = String( left.title ).localeCompare( right.title );
		} else if ( sort.key === 'status' ) {
			primary = compareNumber(
				left.broken ? left.status || 999 : 0,
				right.broken ? right.status || 999 : 0
			);
		} else {
			primary = String( left.section || '' ).localeCompare(
				String( right.section || '' )
			);
		}
		return primary * dir;
	} );
	const issues = block.formatIssues || [];

	return (
		<section className="arc-security-panel arc-agents-table">
			<AgentTableBar
				heading={ block.heading }
				count={ visible.length }
				tip={ LLMS_TIP }
				end={
					<>
						{ issues.length > 0 ? (
							<CountBloom
								label={ String( issues.length ) }
								title={ __( 'Format issues', 'pendulum-arc' ) }
								accent="amber"
								width={ 18 }
								items={ issues.map( ( issue ) => ( {
									title: issue,
								} ) ) }
							/>
						) : null }
						{ block.fileHref ? (
							<PanelViewLink
								href={ block.fileHref }
								label={ __( 'View', 'pendulum-arc' ) }
							/>
						) : null }
					</>
				}
			/>
			{ visible.length === 0 ? (
				<p className="arc-table-card__empty">{ block.empty }</p>
			) : (
				<div className="arc-agents-table__scroll">
					<table className="arc-report-table">
						<thead>
							<tr>
								<th>
									<SortHeader
										id="link"
										label={ __( 'Link', 'pendulum-arc' ) }
										sort={ {
											key:
												sort.key === 'title'
													? 'link'
													: '',
											dir: sort.dir,
										} }
										onSort={ () =>
											setSort( toggleSortKey( 'title' ) )
										}
									/>
								</th>
								<th>
									<SortHeader
										id="section"
										label={ __(
											'Section',
											'pendulum-arc'
										) }
										sort={ sort }
										onSort={ () =>
											setSort(
												toggleSortKey( 'section' )
											)
										}
									/>
								</th>
								<th>
									<SortHeader
										id="status"
										label={ __( 'Status', 'pendulum-arc' ) }
										sort={ sort }
										onSort={ () =>
											setSort( toggleSortKey( 'status' ) )
										}
									/>
								</th>
							</tr>
						</thead>
						<tbody>
							{ visible.map( ( link ) => (
								<tr key={ `${ link.url }-${ link.title }` }>
									<td>
										<span className="arc-llms-link">
											{ link.url ? (
												<a
													className="arc-page-link"
													href={ link.url }
													target="_blank"
													rel="noreferrer"
												>
													<span className="arc-page-link__label">
														{ link.title ||
															link.url }
													</span>
													<StrokeMark
														name="external"
														size={ 12 }
														strokeWidth={ 2 }
													/>
												</a>
											) : (
												<span className="arc-page-link__label">
													{ link.title }
												</span>
											) }
											{ link.notes ? (
												<span
													className="arc-bot-rule"
													title={ link.notes }
												>
													{ link.notes }
												</span>
											) : null }
										</span>
									</td>
									<td>
										{ link.section ? (
											<span className="arc-bot-meta">
												{ link.section }
												{ link.optional ? (
													<span className="arc-llms-optional">
														(
														{ __(
															'optional',
															'pendulum-arc'
														) }
														)
													</span>
												) : null }
											</span>
										) : (
											<span
												className="arc-report-cell__text"
												data-empty="true"
											>
												-
											</span>
										) }
									</td>
									<td>
										<SecurityPill
											label={ linkStatusLabel( link ) }
											accent={
												link.broken ? 'red' : 'emerald'
											}
										/>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }
		</section>
	);
}

function AiReport( { blocks, runId = '' } ) {
	const agents = [];
	const rest = [];
	blocks.forEach( ( block ) => {
		if ( AGENT_IDS.includes( block.id ) ) {
			agents.push( block );
		} else {
			rest.push( block );
		}
	} );
	const byId = ( id ) => agents.find( ( block ) => block.id === id );
	const origin = byId( 'origin' );
	const robots = byId( 'robots' );
	const llms = byId( 'llms' );
	const bots = byId( 'bots' );
	const mcp = byId( 'mcp' );
	const pair = ( left, right, match ) => {
		if ( ! left && ! right ) {
			return null;
		}
		return (
			<div
				className="arc-agents__pair"
				data-match={ match && left && right ? 'true' : undefined }
			>
				{ left ? (
					<div className="arc-agents__slot">{ left }</div>
				) : null }
				{ right ? (
					<div className="arc-agents__slot">{ right }</div>
				) : null }
			</div>
		);
	};
	return (
		<div className="arc-agents">
			{ rest.length ? (
				<ReportBlocks blocks={ rest } service="ai" runId={ runId } />
			) : null }
			{ pair(
				origin ? <AiOriginCard block={ origin } /> : null,
				robots ? <AiRobotsCard block={ robots } /> : null,
				true
			) }
			{ pair(
				llms ? <AiLlmsTable block={ llms } /> : null,
				bots ? <AiBotsTable block={ bots } /> : null,
				false
			) }
			{ mcp ? <AiMcpCard block={ mcp } /> : null }
		</div>
	);
}

function ReportBlocks( { blocks, service, runId = '' } ) {
	return (
		<div className="arc-report-blocks">
			{ blocks.map( ( block ) => {
				const section = renderSection( block, service, runId );
				if ( section ) {
					return section;
				}
				return block.kind === 'card' ? (
					<ReportCard
						key={ block.id || block.heading }
						block={ block }
					/>
				) : (
					<ReportTable
						key={ block.id || block.heading }
						block={ block }
						service={ service }
					/>
				);
			} ) }
		</div>
	);
}

function hyphenField( label, extra ) {
	return {
		label,
		value: '-',
		tone: null,
		href: null,
		caption: null,
		pill: null,
		pillTone: null,
		group: extra && extra.group ? extra.group : null,
		wide: Boolean( extra && extra.wide ),
	};
}

function emptyTable( id, heading, empty, columns ) {
	return {
		kind: 'table',
		id,
		heading,
		empty,
		span: 'half',
		columns,
		rows: [],
	};
}

/**
 * Section shells used when the API has not sent blocks yet. A real report
 * replaces these.
 *
 * @param {Object|null|undefined} report
 */
function contentBlocks( report ) {
	const blocks = ( report && report.blocks ) || [];
	if ( blocks.length > 0 || ! report ) {
		return blocks;
	}
	if ( report.service === 'security' ) {
		return [
			{
				kind: 'card',
				id: 'system',
				heading: __( 'System', 'pendulum-arc' ),
				span: 'half',
				fields: [
					hyphenField( __( 'Product', 'pendulum-arc' ) ),
					hyphenField( __( 'Version', 'pendulum-arc' ) ),
					hyphenField( __( 'Evidence', 'pendulum-arc' ), {
						group: __( 'Evidence', 'pendulum-arc' ),
					} ),
				],
			},
			{
				kind: 'card',
				id: 'environment',
				heading: __( 'Environment', 'pendulum-arc' ),
				span: 'half',
				fields: [
					hyphenField( __( 'Provider', 'pendulum-arc' ) ),
					hyphenField( __( 'IP', 'pendulum-arc' ) ),
					hyphenField( __( 'A / AAAA', 'pendulum-arc' ) ),
					hyphenField( __( 'CNAME', 'pendulum-arc' ) ),
					hyphenField( __( 'NS', 'pendulum-arc' ), { wide: true } ),
				],
			},
			emptyTable(
				'headers',
				__( 'Response headers', 'pendulum-arc' ),
				__( 'No response headers recorded.', 'pendulum-arc' ),
				[
					{ id: 'header', label: __( 'Header', 'pendulum-arc' ) },
					{ id: 'value', label: __( 'Value', 'pendulum-arc' ) },
				]
			),
			emptyTable(
				'cookies',
				__( 'Cookies', 'pendulum-arc' ),
				__( 'No Set-Cookie on crawl pages.', 'pendulum-arc' ),
				[
					{ id: 'name', label: __( 'Cookie', 'pendulum-arc' ) },
					{ id: 'page', label: __( 'Page', 'pendulum-arc' ) },
					{ id: 'flags', label: __( 'Flags', 'pendulum-arc' ) },
				]
			),
			{
				...emptyTable(
					'mixed',
					__( 'Mixed content', 'pendulum-arc' ),
					__(
						'No mixed content observed on HTTPS crawl pages.',
						'pendulum-arc'
					),
					[
						{
							id: 'resource',
							label: __( 'Resource', 'pendulum-arc' ),
						},
						{ id: 'kind', label: __( 'Kind', 'pendulum-arc' ) },
						{ id: 'page', label: __( 'Page', 'pendulum-arc' ) },
					]
				),
				span: 'full',
			},
		];
	}
	if ( report.service === 'brand' ) {
		const missing = {
			kind: 'card',
			badge: __( 'Missing', 'pendulum-arc' ),
			badgeTone: 'bad',
			note: __( 'Not found in this harvest.', 'pendulum-arc' ),
			span: 'half',
			fields: [],
			images: [],
		};
		return [
			{
				...missing,
				id: 'short-mark',
				heading: __( 'Short mark (tab icon)', 'pendulum-arc' ),
			},
			{
				...missing,
				id: 'long-mark',
				heading: __( 'Long mark (wordmark)', 'pendulum-arc' ),
			},
			{
				kind: 'table',
				id: 'requirements',
				heading: __( 'Requirements', 'pendulum-arc' ),
				empty: __(
					'This run did not emit an asset manifest.',
					'pendulum-arc'
				),
				span: 'full',
				columns: [
					{
						id: 'required',
						label: __( 'Required icon', 'pendulum-arc' ),
					},
					{ id: 'status', label: __( 'Status', 'pendulum-arc' ) },
					{ id: 'rule', label: __( 'Required', 'pendulum-arc' ) },
					{
						id: 'observed',
						label: __( 'Observed', 'pendulum-arc' ),
					},
				],
				rows: [],
			},
		];
	}
	return blocks;
}

/** Brand UI dimensions, same order as the portal score header. */
const BRAND_HEADER_LABELS = [
	__( 'Mark', 'pendulum-arc' ),
	__( 'Type', 'pendulum-arc' ),
	__( 'Naming', 'pendulum-arc' ),
	__( 'Presence', 'pendulum-arc' ),
	__( 'Palette', 'pendulum-arc' ),
];

/**
 * Metric row for the score header. An empty brand shell still shows the
 * dimension labels with a hyphen, matching the other report headers.
 *
 * @param {Object|null|undefined} report
 * @param {Object}                hero
 */
function headerMetrics( report, hero ) {
	const rows = Array.isArray( hero.metrics ) ? hero.metrics : [];
	if ( rows.length > 0 ) {
		return rows;
	}
	if ( ! report || report.service !== 'brand' ) {
		return rows;
	}
	return BRAND_HEADER_LABELS.map( ( label ) => ( {
		label,
		value: '-',
	} ) );
}

/**
 * @param {Object|null|undefined} report
 * @param {Array}                 blocks
 */
function reportBody( report, blocks ) {
	const runId = report && report.runId ? report.runId : '';
	if ( report && report.service === 'ai' ) {
		return <AiReport blocks={ blocks } runId={ runId } />;
	}
	if ( report && report.service === 'security' ) {
		return <SecurityReport blocks={ blocks } />;
	}
	if ( report && report.service === 'brand' ) {
		return <BrandReport blocks={ blocks } />;
	}
	return (
		<ReportBlocks
			blocks={ blocks }
			service={ report && report.service }
			runId={ runId }
		/>
	);
}

/**
 * Crawl report header and first section. No page inspector.
 *
 * @param {Object} props
 * @param {Object} props.report
 * @param {string} [props.portalUrl]
 */
export function ReportPreview( { report, portalUrl } ) {
	const href = runHref( portalUrl, report && report.runId );
	if ( report && report.loading ) {
		return (
			<div className="arc-visitor" aria-busy="true">
				<ReportLoader />
			</div>
		);
	}
	const hero = ( report && report.hero ) || {};
	const blocks = contentBlocks( report );
	const summary = report && report.runId ? hero.summary : null;
	const metrics = headerMetrics( report, hero );

	const scores = hero.peer ? 'pair' : 'solo';

	return (
		<div className="arc-visitor" data-ready="true">
			<section className="arc-report-hero">
				{ hero.mood ? (
					<span
						className="arc-report-hero__watermark"
						data-mood={ hero.mood }
						aria-hidden="true"
					>
						<MoodMark mood={ hero.mood } size={ 160 } />
					</span>
				) : null }
				<div className="arc-report-hero__body">
					<div
						className="arc-report-hero__layout"
						data-scores={ scores }
					>
						<div className="arc-report-hero__copy">
							<div className="arc-report-scores">
								<ScoreReadout
									title={
										hero.title ||
										__( 'Report', 'pendulum-arc' )
									}
									score={ hero.score }
									band={ hero.band }
									mood={ hero.mood }
									empty={ hero.score === '-' }
									coverage={ hero.coverage }
								/>
								{ hero.peer ? (
									<ScoreReadout
										title={ hero.peer.title }
										score={ hero.peer.score }
										band={ hero.peer.band }
										mood={ hero.peer.mood }
									/>
								) : null }
								{ hero.peer ? (
									<div
										className="arc-report-scores__spacer"
										aria-hidden="true"
									/>
								) : null }
							</div>
							{ hero.note ? (
								<p className="arc-report-hero__detail">
									{ hero.note }
								</p>
							) : null }
						</div>
						{ metrics.length > 0 ? (
							<dl
								className="arc-report-hero__metrics"
								data-cols={ String( metrics.length ) }
							>
								{ metrics.map( ( metric ) => (
									<div key={ metric.label }>
										<dt>{ metric.label }</dt>
										<dd>
											<span className="arc-report-hero__value">
												<span
													className="arc-report-hero__figure"
													data-mood={
														metric.mood || undefined
													}
													data-tone={
														metric.tone || undefined
													}
													data-empty={
														metric.value === '-'
															? 'true'
															: undefined
													}
												>
													{ metric.value }
												</span>
												{ metric.mood ? (
													<span
														className="arc-report-hero__face"
														data-mood={
															metric.mood
														}
													>
														<MoodMark
															mood={ metric.mood }
															size={ 18 }
														/>
													</span>
												) : null }
											</span>
										</dd>
									</div>
								) ) }
							</dl>
						) : null }
					</div>
					{ summary || ( hero.inventory || [] ).length > 0 ? (
						<div className="arc-report-hero__pills">
							{ summary ? (
								<ReportPill accent="muted" size="xs">
									<EmphasisNumbers text={ summary } hot />
								</ReportPill>
							) : null }
							{ ( hero.inventory || [] ).map( ( item ) => (
								<span
									className="arc-report-hero__chip"
									key={ item.label }
								>
									<ReportPill accent="lime" size="xs">
										{ item.label }
									</ReportPill>
									<ReportPill accent="muted" size="xs">
										<EmphasisNumbers text={ item.value } />
									</ReportPill>
								</span>
							) ) }
						</div>
					) : null }
				</div>
			</section>
			{ reportBody( report, blocks ) }
			<ReportCta href={ href } />
		</div>
	);
}
