/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { SiteScoreSummary, useSiteScores } from '../meta';

export function DashboardPage( { bootstrap } ) {
	const scores = useSiteScores();
	const connection = bootstrap.connection || {};

	return (
		<div className="pendulum-arc-screen">
			<SiteScoreSummary
				scores={ scores.scores }
				error={ scores.error }
				loading={ scores.loading }
				portalUrl={ connection.portalUrl || bootstrap.urls.portal }
			/>
			<p className="pendulum-arc-screen__note">
				{ __(
					'Scores are the latest succeeded report Arc has for this site.',
					'pendulum-arc'
				) }
			</p>
		</div>
	);
}
