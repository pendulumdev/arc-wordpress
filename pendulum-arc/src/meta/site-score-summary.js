/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ArcButton } from '../ui/button';
import { ScoreCard, scoreMood, scoreServices } from '../ui/score-card';

export function SiteScoreSummary( { scores, error, loading, portalUrl } ) {
	const services = scoreServices();
	return (
		<section
			className="arc-scores"
			aria-label={ __( 'Site scores', 'pendulum-arc' ) }
		>
			{ portalUrl ? (
				<div className="arc-scores__bar">
					<ArcButton href={ portalUrl }>
						{ __( 'Open in Arc', 'pendulum-arc' ) }
					</ArcButton>
				</div>
			) : null }
			{ error ? <p className="arc-scores__error">{ error }</p> : null }
			<div className="arc-scores__row">
				{ services.map( ( service ) => {
					const found = ( scores || [] ).find(
						( row ) => row.service === service.key
					);
					const score = found ? found.score : null;
					const hasScore =
						! loading && score !== null && score !== undefined;
					const mood = hasScore ? scoreMood( score ) : null;
					let state = 'empty';
					if ( loading ) {
						state = 'loading';
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
							issues={
								hasScore
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
						/>
					);
				} ) }
			</div>
		</section>
	);
}
