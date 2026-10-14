/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { SiteScoreSummary, useSiteScores } from '../meta';
import { ReportSummary } from '../reports/report-summary';
import { OpenInArc } from '../ui/open-in-arc';

export function DashboardPage( { bootstrap } ) {
	const scores = useSiteScores();
	const connection = bootstrap.connection || {};
	const portalUrl = connection.portalUrl || bootstrap.urls.portal;
	const [ service, setService ] = useState( 'analytics' );

	return (
		<div className="pendulum-arc-screen">
			<OpenInArc bootstrap={ bootstrap } />
			<SiteScoreSummary
				scores={ scores.scores }
				error={ scores.error }
				loading={ scores.loading }
				selected={ service }
				onSelect={ setService }
			/>
			<ReportSummary
				portalUrl={ portalUrl }
				service={ service }
				onService={ setService }
			/>
		</div>
	);
}
