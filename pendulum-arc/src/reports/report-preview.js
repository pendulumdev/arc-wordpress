/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ColumnMark, StrokeMark } from '../ui/column-icon';
import { Icon } from '../ui/icon';
import { MoodMark, scoreMood } from '../ui/score-card';
import { ReportCta } from './report-cta';
import { ReportLoader } from './report-loading';

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

function ScoreReadout( { title, score, band, mood, empty } ) {
	return (
		<div className="arc-report-score">
			<p className="arc-report-hero__overline">{ title }</p>
			<p
				className="arc-report-hero__figure"
				data-mood={ mood || undefined }
				data-empty={ empty ? 'true' : undefined }
			>
				{ score || '-' }
			</p>
			{ band ? (
				<ReportPill accent={ moodAccent( mood ) }>{ band }</ReportPill>
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
	headers: 'key',
	cookies: 'cookie',
	mixed: 'link',
};

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

function SecurityPill( { label, accent } ) {
	if ( ! label ) {
		return null;
	}
	return (
		<span
			className="arc-pill"
			data-accent={ accent || 'muted' }
			data-size="xs"
		>
			<span className="arc-pill__label">{ label }</span>
		</span>
	);
}

function SecurityPanelBar( { icon, heading, end } ) {
	return (
		<div className="arc-security-panel__bar">
			<span className="arc-security-panel__icon">
				<StrokeMark name={ icon } />
			</span>
			<h3>{ heading }</h3>
			{ end ? (
				<span className="arc-security-panel__end">{ end }</span>
			) : null }
		</div>
	);
}

function HarvestField( { field } ) {
	const missing = MISSING_VALUE.has( field.value || '' );
	return (
		<div
			className="arc-harvest"
			data-wide={ field.wide ? 'true' : undefined }
			data-tint={ field.pillTone || undefined }
		>
			<div className="arc-harvest__top">
				<p className="arc-harvest__label">{ field.label }</p>
				<SecurityPill label={ field.pill } accent={ field.pillTone } />
			</div>
			<p
				className="arc-harvest__value"
				data-missing={ missing ? 'true' : undefined }
				data-mono={ field.group === 'Evidence' ? 'true' : undefined }
			>
				{ field.href ? (
					<a href={ field.href } target="_blank" rel="noreferrer">
						{ field.value }
					</a>
				) : (
					field.value
				) }
			</p>
			{ field.caption ? (
				<p className="arc-harvest__caption">{ field.caption }</p>
			) : null }
		</div>
	);
}

function SecurityCard( { block } ) {
	const groups = fieldGroups( block.fields || [] );
	return (
		<section className="arc-security-panel">
			<SecurityPanelBar
				icon={ SECURITY_ICON[ block.id ] || 'layers' }
				heading={ block.heading }
				end={
					<SecurityPill
						label={ block.badge }
						accent={ BADGE_ACCENT[ block.badgeTone ] || 'muted' }
					/>
				}
			/>
			{ block.note ? (
				<p className="arc-security-panel__empty">{ block.note }</p>
			) : null }
			{ groups.map( ( group ) => (
				<div
					className="arc-security-group"
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
		</section>
	);
}

function HeaderRows( { rows } ) {
	return (
		<ul className="arc-security-rows">
			{ rows.map( ( row ) => {
				const label = row.cells[ 0 ] || {};
				const value = row.cells[ 1 ] || {};
				const missing = MISSING_VALUE.has( value.text || '' );
				return (
					<li
						key={ row.id || label.text }
						data-tint={ value.pillTone || undefined }
						title={ value.caption || undefined }
					>
						<span className="arc-security-rows__label">
							{ label.text }
						</span>
						<span
							className="arc-security-rows__value"
							data-missing={ missing ? 'true' : undefined }
						>
							{ value.text }
						</span>
						<SecurityPill
							label={ value.pill }
							accent={ value.pillTone }
						/>
					</li>
				);
			} ) }
		</ul>
	);
}

function StackRows( { rows, kind } ) {
	return (
		<ul className="arc-security-rows" data-layout="stack">
			{ rows.map( ( row ) => {
				const primary = row.cells[ 0 ] || {};
				const secondary = row.cells[ 1 ] || {};
				const tertiary = row.cells[ 2 ] || {};
				const meta =
					kind === 'cookies'
						? [ secondary.text, tertiary.text ]
								.filter( ( part ) => part && part !== '-' )
								.join( ' · ' )
						: [ secondary.text, tertiary.text ]
								.filter( Boolean )
								.join( ' · ' );
				return (
					<li
						key={ row.id || primary.text }
						data-tint={ primary.pillTone || undefined }
						title={ primary.caption || undefined }
					>
						<div className="arc-security-rows__copy">
							<p
								className="arc-security-rows__name"
								data-mono={
									kind === 'cookies' ? 'true' : undefined
								}
							>
								{ kind === 'mixed' && primary.href ? (
									<a
										href={ primary.href }
										target="_blank"
										rel="noreferrer"
									>
										{ secondary.text || primary.text }
									</a>
								) : (
									primary.text
								) }
							</p>
							{ kind === 'mixed' ? (
								<p
									className="arc-security-rows__meta"
									data-mono="true"
								>
									{ primary.text }
								</p>
							) : null }
							{ meta && kind !== 'mixed' ? (
								<p className="arc-security-rows__meta">
									{ meta }
								</p>
							) : null }
							{ kind === 'mixed' && tertiary.text ? (
								<p className="arc-security-rows__meta">
									{ tertiary.text }
								</p>
							) : null }
						</div>
						<SecurityPill
							label={ primary.pill }
							accent={ primary.pillTone }
						/>
					</li>
				);
			} ) }
		</ul>
	);
}

function securityTableBody( block, rows ) {
	if ( rows.length === 0 ) {
		return <p className="arc-security-panel__empty">{ block.empty }</p>;
	}
	if ( block.id === 'headers' ) {
		return <HeaderRows rows={ rows } />;
	}
	return (
		<StackRows
			rows={ rows }
			kind={ block.id === 'cookies' ? 'cookies' : 'mixed' }
		/>
	);
}

function SecurityTable( { block } ) {
	const rows = block.rows || [];
	return (
		<section className="arc-security-panel">
			<SecurityPanelBar
				icon={ SECURITY_ICON[ block.id ] || 'key' }
				heading={ block.heading }
			/>
			{ securityTableBody( block, rows ) }
		</section>
	);
}

const BRAND_MARK_ICON = {
	'short-mark': 'dot',
	'long-mark': 'layers',
};

function BrandMarkCard( { block } ) {
	const images = block.images || [];
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
			{ block.note ? (
				<p className="arc-security-panel__empty">{ block.note }</p>
			) : null }
			{ images.length > 0 ? (
				<ul className="arc-report-images">
					{ images.map( ( image ) => (
						<li key={ `${ image.src }-${ image.caption || '' }` }>
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
	blocks.forEach( ( block ) => {
		if ( block.id === 'system' || block.id === 'environment' ) {
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
						{ left.map( ( block ) => (
							<SecurityCard
								key={ block.id || block.heading }
								block={ block }
							/>
						) ) }
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
			<SecurityPanelBar icon="globe" heading={ block.heading } />
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
		</section>
	);
}

function AiRobotsCard( { block } ) {
	return (
		<section className="arc-security-panel arc-robots-panel">
			<SecurityPanelBar
				icon="fileCode"
				heading={ block.heading }
				end={
					block.href && block.hrefLabel ? (
						<PanelViewLink
							href={ block.href }
							label={ block.hrefLabel }
						/>
					) : null
				}
			/>
			<div className="arc-robots-body">
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
									accent={ row.present ? 'emerald' : 'muted' }
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
		</section>
	);
}

function AiReport( { blocks } ) {
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
				<ReportBlocks blocks={ rest } service="ai" />
			) : null }
			{ pair(
				origin ? <AiOriginCard block={ origin } /> : null,
				robots ? <AiRobotsCard block={ robots } /> : null,
				true
			) }
			{ pair(
				llms ? <ReportTable block={ llms } service="ai" panel /> : null,
				bots ? <ReportTable block={ bots } service="ai" panel /> : null,
				false
			) }
			{ mcp ? <AiMcpCard block={ mcp } /> : null }
		</div>
	);
}

function ReportBlocks( { blocks, service } ) {
	return (
		<div className="arc-report-blocks">
			{ blocks.map( ( block ) =>
				block.kind === 'card' ? (
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
				)
			) }
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
	if ( report && report.service === 'ai' ) {
		return <AiReport blocks={ blocks } />;
	}
	if ( report && report.service === 'security' ) {
		return <SecurityReport blocks={ blocks } />;
	}
	if ( report && report.service === 'brand' ) {
		return <BrandReport blocks={ blocks } />;
	}
	return (
		<ReportBlocks blocks={ blocks } service={ report && report.service } />
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
				<div className="arc-report-hero__layout">
					<div className="arc-report-hero__copy">
						<div className="arc-report-scores">
							<ScoreReadout
								title={
									hero.title || __( 'Report', 'pendulum-arc' )
								}
								score={ hero.score }
								band={ hero.band }
								mood={ hero.mood }
								empty={ hero.score === '-' }
							/>
							{ hero.peer ? (
								<ScoreReadout
									title={ hero.peer.title }
									score={ hero.peer.score }
									band={ hero.peer.band }
									mood={ hero.peer.mood }
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
						<dl className="arc-report-hero__metrics" data-cols="5">
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
													data-mood={ metric.mood }
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
								<ReportPill accent="cyan" size="xs">
									{ item.label }
								</ReportPill>
								<ReportPill accent="muted" size="xs">
									<EmphasisNumbers text={ item.value } />
								</ReportPill>
							</span>
						) ) }
					</div>
				) : null }
			</section>
			{ reportBody( report, blocks ) }
			<ReportCta href={ href } />
		</div>
	);
}
