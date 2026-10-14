/**
 * WordPress dependencies
 */
import { __, _n } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from './icon';

function scoreServices() {
	return [
		{
			key: 'analytics',
			accent: 'sky',
			label: __( 'Analytics', 'pendulum-arc' ),
		},
		{ key: 'seo', accent: 'lime', label: __( 'SEO', 'pendulum-arc' ) },
		{ key: 'a11y', accent: 'emerald', label: __( 'A11Y', 'pendulum-arc' ) },
		{ key: 'ai', accent: 'cyan', label: __( 'AI', 'pendulum-arc' ) },
		{
			key: 'security',
			accent: 'amber',
			label: __( 'Security', 'pendulum-arc' ),
		},
		{ key: 'brand', accent: 'pink', label: __( 'Brand', 'pendulum-arc' ) },
	];
}

/**
 * Same ladder as the portal site score mood.
 *
 * @param {number|null|undefined} score
 */
export function scoreMood( score ) {
	if (
		score === null ||
		score === undefined ||
		Number.isNaN( Number( score ) )
	) {
		return null;
	}
	const value = Math.min( 100, Math.max( 0, Number( score ) ) );
	if ( value >= 90 ) {
		return 'great';
	}
	if ( value >= 75 ) {
		return 'good';
	}
	if ( value >= 50 ) {
		return 'ok';
	}
	if ( value >= 25 ) {
		return 'poor';
	}
	return 'bad';
}

/**
 * @param {number} score
 */
function formatScore( score ) {
	const tenths = Math.round( score * 10 ) / 10;
	return Number.isInteger( tenths ) ? String( tenths ) : tenths.toFixed( 1 );
}

function ServiceMark( { service } ) {
	if ( service === 'analytics' ) {
		return (
			<Icon>
				<path d="M3 3v16a2 2 0 0 0 2 2h16" />
				<path d="M18 17V9" />
				<path d="M13 17V5" />
				<path d="M8 17v-3" />
			</Icon>
		);
	}
	if ( service === 'seo' ) {
		return (
			<Icon>
				<path d="m8 11 2 2 4-4" />
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</Icon>
		);
	}
	if ( service === 'a11y' ) {
		return (
			<Icon>
				<circle cx="16" cy="4" r="1" />
				<path d="m18 19 1-7-6 1" />
				<path d="m5 8 3-3 5.5 3-2.36 3.5" />
				<path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
				<path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
			</Icon>
		);
	}
	if ( service === 'ai' ) {
		return (
			<Icon>
				<path d="M12 8V4H8" />
				<rect width="16" height="12" x="4" y="8" rx="2" />
				<path d="M2 14h2" />
				<path d="M20 14h2" />
				<path d="M15 13v2" />
				<path d="M9 13v2" />
			</Icon>
		);
	}
	if ( service === 'security' ) {
		return (
			<Icon>
				<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
			</Icon>
		);
	}
	return (
		<Icon>
			<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
			<circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
			<circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
			<circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
			<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
		</Icon>
	);
}

function MoodMark( { mood } ) {
	if ( mood === 'great' ) {
		return (
			<Icon size={ 80 } strokeWidth={ 1.5 }>
				<circle cx="12" cy="12" r="10" />
				<path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z" />
				<line x1="9" x2="9.01" y1="9" y2="9" />
				<line x1="15" x2="15.01" y1="9" y2="9" />
			</Icon>
		);
	}
	if ( mood === 'good' ) {
		return (
			<Icon size={ 80 } strokeWidth={ 1.5 }>
				<circle cx="12" cy="12" r="10" />
				<path d="M8 14s1.5 2 4 2 4-2 4-2" />
				<line x1="9" x2="9.01" y1="9" y2="9" />
				<line x1="15" x2="15.01" y1="9" y2="9" />
			</Icon>
		);
	}
	if ( mood === 'ok' ) {
		return (
			<Icon size={ 80 } strokeWidth={ 1.5 }>
				<circle cx="12" cy="12" r="10" />
				<line x1="8" x2="16" y1="15" y2="15" />
				<line x1="9" x2="9.01" y1="9" y2="9" />
				<line x1="15" x2="15.01" y1="9" y2="9" />
			</Icon>
		);
	}
	if ( mood === 'poor' ) {
		return (
			<Icon size={ 80 } strokeWidth={ 1.5 }>
				<circle cx="12" cy="12" r="10" />
				<path d="M16 16s-1.5-2-4-2-4 2-4 2" />
				<line x1="9" x2="9.01" y1="9" y2="9" />
				<line x1="15" x2="15.01" y1="9" y2="9" />
			</Icon>
		);
	}
	return (
		<Icon size={ 80 } strokeWidth={ 1.5 }>
			<circle cx="12" cy="12" r="10" />
			<path d="M16 16s-1.5-2-4-2-4 2-4 2" />
			<path d="M7.5 8 10 9" />
			<path d="m14 9 2.5-1" />
			<path d="M9 10h.01" />
			<path d="M15 10h.01" />
		</Icon>
	);
}

function formatCount( count ) {
	return count > 99 ? '99+' : String( count );
}

function KeyMark() {
	return (
		<Icon size={ 15 } strokeWidth={ 2.25 }>
			<circle cx="7.5" cy="15.5" r="5.5" />
			<path d="m21 2-9.6 9.6" />
			<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
		</Icon>
	);
}

function IssuePill( { issueCount, manualCount, severity } ) {
	const issues = Number( issueCount ) || 0;
	const manual = Number( manualCount ) || 0;
	if ( issues === 0 && manual === 0 ) {
		return (
			<span className="arc-issues arc-issues--clear">
				<Icon size={ 11 } strokeWidth={ 2.25 }>
					<path d="M7 10v12" />
					<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
				</Icon>
				<span>{ __( 'Perfect', 'pendulum-arc' ) }</span>
			</span>
		);
	}
	const issueWord = _n( 'issue', 'issues', issues, 'pendulum-arc' );
	return (
		<span
			className="arc-issues"
			data-severity={ issues > 0 ? severity || 'medium' : undefined }
		>
			{ issues > 0 ? (
				<span className="arc-issues__count">
					<span className="arc-issues__figure">
						{ formatCount( issues ) }
					</span>
					<span>{ issueWord }</span>
				</span>
			) : null }
			{ manual > 0 ? (
				<span className="arc-issues__manual">
					<span>{ formatCount( manual ) }</span>
					{ issues === 0 ? (
						<span>{ __( 'manual', 'pendulum-arc' ) }</span>
					) : null }
				</span>
			) : null }
		</span>
	);
}

/**
 * One service card. `empty` is no report. `score` shows the number, band,
 * issue pill, and the SEO keyphrase when Arc sent one.
 *
 * @param {Object}                                                                   props
 * @param {string}                                                                   props.service
 * @param {string}                                                                   props.accent
 * @param {string}                                                                   props.label
 * @param {'empty'|'loading'|'score'}                                                props.state
 * @param {number|null}                                                              [props.score]
 * @param {string|null}                                                              [props.band]
 * @param {string|null}                                                              [props.mood]
 * @param {{issueCount?: number, manualCount?: number, severity?: string|null}|null} [props.issues]
 * @param {{score?: number|null, band?: string|null}|null}                           [props.keyphrase]
 */
export function ScoreCard( {
	service,
	accent,
	label,
	state,
	score,
	band,
	mood,
	issues = null,
	keyphrase = null,
} ) {
	const moodLabel = {
		great: __( 'Excellent', 'pendulum-arc' ),
		good: __( 'Good', 'pendulum-arc' ),
		ok: __( 'Needs work', 'pendulum-arc' ),
		poor: __( 'Critical gaps', 'pendulum-arc' ),
		bad: __( 'Critical gaps', 'pendulum-arc' ),
	}[ mood ];
	let hint = __( 'No report yet', 'pendulum-arc' );
	if ( state === 'loading' ) {
		hint = __( 'Loading scores…', 'pendulum-arc' );
	} else if ( state === 'score' ) {
		hint = band || moodLabel || '';
	}
	const keyphraseScore =
		keyphrase && keyphrase.score !== null && keyphrase.score !== undefined
			? keyphrase.score
			: null;
	const keyphraseMood =
		keyphraseScore === null ? null : scoreMood( keyphraseScore );
	return (
		<article
			className="arc-score-card"
			data-service={ service }
			data-accent={ accent }
			data-state={ state === 'score' ? 'score' : 'empty' }
			data-mood={ mood || undefined }
		>
			<div className="arc-score-card__face">
				<div className="arc-score-card__title">
					<ServiceMark service={ service } />
					<span className="arc-score-card__name">{ label }</span>
				</div>
				<div className="arc-score-card__body">
					<span className="arc-score-card__hue" aria-hidden="true" />
					{ state === 'score' && mood ? (
						<span className="arc-score-card__mood">
							<MoodMark mood={ mood } />
						</span>
					) : null }
					<div className="arc-score-card__content">
						{ state === 'score' &&
						score !== null &&
						score !== undefined ? (
							<p className="arc-score-card__value">
								{ formatScore( score ) }
							</p>
						) : null }
						<p className="arc-score-card__hint">{ hint }</p>
						{ state === 'score' && keyphraseScore !== null ? (
							<div
								className="arc-score-card__keyphrase"
								data-mood={ keyphraseMood || undefined }
							>
								<p className="arc-score-card__keyphrase-value">
									{ formatScore( keyphraseScore ) }
									<KeyMark />
								</p>
								{ keyphrase.band ? (
									<p className="arc-score-card__keyphrase-band">
										{ keyphrase.band }
									</p>
								) : null }
							</div>
						) : null }
					</div>
					{ state === 'score' ? (
						<span className="arc-score-card__issues">
							<IssuePill
								issueCount={ issues ? issues.issueCount : 0 }
								manualCount={ issues ? issues.manualCount : 0 }
								severity={ issues ? issues.severity : null }
							/>
						</span>
					) : null }
				</div>
			</div>
		</article>
	);
}

export { scoreServices };
