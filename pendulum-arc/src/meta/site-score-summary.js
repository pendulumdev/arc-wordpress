/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ErrorAlert } from '../ui/error-alert';
import { ScoreCard, scoreMood, scoreServices } from '../ui/score-card';

export function SiteScoreSummary( {
	scores,
	error,
	loading,
	connectUrl,
	portalUrl = '',
	onGoogleConnect,
	googlePending = false,
	activity = null,
	selected,
	onSelect,
} ) {
	const services = scoreServices();
	return (
		<section
			className="arc-scores"
			aria-label={ __( 'Site scores', 'pendulum-arc' ) }
		>
			{ error ? (
				<ErrorAlert message={ error } connectUrl={ connectUrl } />
			) : null }
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
					const setup =
						found &&
						( found.setup === 'connect_google' ||
							found.setup === 'assign_site' ||
							found.setup === 'not_enabled' )
							? found.setup
							: null;
					const googleSetup =
						setup === 'connect_google' || setup === 'assign_site';
					const flight = activity ? activity[ service.key ] : null;
					const pending = flight === 'queued' || flight === 'running';
					const hasKeyphrase =
						found &&
						found.keyphraseScore !== null &&
						found.keyphraseScore !== undefined;
					const hasScore =
						! loading &&
						! setup &&
						! hasVisitors &&
						score !== null &&
						score !== undefined;
					const scored = hasScore || hasKeyphrase;
					const mood =
						! pending && hasScore ? scoreMood( score ) : null;
					let state = 'empty';
					if ( loading ) {
						state = 'loading';
					} else if ( setup ) {
						state = 'setup';
					} else if ( hasVisitors ) {
						state = 'visitors';
					} else if ( pending || scored ) {
						state = 'score';
					}
					return (
						<ScoreCard
							key={ service.key }
							service={ service.key }
							accent={ service.accent }
							label={ service.label }
							state={ state }
							score={
								! loading && ! pending && hasScore
									? score
									: null
							}
							band={
								! loading && ! pending && hasScore
									? found.band
									: null
							}
							mood={ mood }
							visitors={ hasVisitors ? visitors : null }
							issues={
								! loading && ( scored || hasVisitors )
									? {
											issueCount: found.issueCount || 0,
											manualCount: found.manualCount || 0,
											severity:
												found.issueSeverity || null,
										}
									: null
							}
							setup={ setup }
							actionHref={
								setup && ! googleSetup ? portalUrl : ''
							}
							onAction={
								googleSetup ? onGoogleConnect : undefined
							}
							actionPending={ googleSetup && googlePending }
							keyphrase={
								service.key === 'seo'
									? {
											score:
												! loading &&
												! pending &&
												hasKeyphrase
													? found.keyphraseScore
													: null,
											band:
												! loading &&
												! pending &&
												hasKeyphrase
													? found.keyphraseBand
													: null,
											placeholder: true,
										}
									: null
							}
							pending={ pending && state !== 'setup' }
							selected={ selected === service.key }
							onSelect={ onSelect }
						/>
					);
				} ) }
			</div>
		</section>
	);
}
