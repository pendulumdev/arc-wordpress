/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ScoreCard, scoreMood, scoreServices } from '../ui/score-card';

export function SiteScoreSummary( {
	scores,
	error,
	loading,
	selected,
	onSelect,
} ) {
	const services = scoreServices();
	return (
		<section
			className="arc-scores"
			aria-label={ __( 'Site scores', 'pendulum-arc' ) }
		>
			{ error ? <p className="arc-scores__error">{ error }</p> : null }
			<div className="arc-scores__row">
				{ services.map( ( service ) => {
					const found = ( scores || [] ).find(
						( row ) => row.service === service.key
					);
					const score = found ? found.score : null;
					const visitors =
						found &&
						found.visitors &&
						found.visitors.newUsers !== null &&
						found.visitors.newUsers !== undefined &&
						found.visitors.returningUsers !== null &&
						found.visitors.returningUsers !== undefined
							? found.visitors
							: null;
					const hasVisitors = ! loading && Boolean( visitors );
					const hasScore =
						! loading &&
						! hasVisitors &&
						score !== null &&
						score !== undefined;
					const mood = hasScore ? scoreMood( score ) : null;
					let state = 'empty';
					if ( loading ) {
						state = 'loading';
					} else if ( hasVisitors ) {
						state = 'visitors';
					} else if ( hasScore ) {
						state = 'score';
					}
					return (
						<ScoreCard
							key={ service.key }
							service={ service.key }
							accent={ service.accent }
							label={ service.label }
							state={ state }
							score={ hasScore ? score : null }
							band={ hasScore ? found.band : null }
							mood={ mood }
							visitors={ hasVisitors ? visitors : null }
							issues={
								hasScore || hasVisitors
									? {
											issueCount: found.issueCount || 0,
											manualCount: found.manualCount || 0,
											severity:
												found.issueSeverity || null,
										}
									: null
							}
							keyphrase={
								hasScore &&
								found.keyphraseScore !== null &&
								found.keyphraseScore !== undefined
									? {
											score: found.keyphraseScore,
											band: found.keyphraseBand,
										}
									: null
							}
							selected={ selected === service.key }
							onSelect={ onSelect }
						/>
					);
				} ) }
			</div>
		</section>
	);
}
