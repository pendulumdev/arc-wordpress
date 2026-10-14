/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { SiteScoreSummary, useSiteScores } from '../meta';
import { GenerationNotice } from '../reports/report-cta';
import { ReportSummary } from '../reports/report-summary';
import { OpenInArc } from '../ui/open-in-arc';

export function DashboardPage( { bootstrap } ) {
	const scores = useSiteScores();
	const connection = bootstrap.connection || {};
	const portalUrl = connection.portalUrl || bootstrap.urls.portal;
	const [ service, setService ] = useState( 'analytics' );
	const [ gap, setGap ] = useState( null );
	const onGap = useCallback( ( next ) => {
		setGap( ( current ) => ( current === next ? current : next ) );
	}, [] );

	return (
		<div className="pendulum-arc-screen">
			<OpenInArc bootstrap={ bootstrap } />
			{ gap ? (
				<GenerationNotice
					generating={ gap === 'generating' }
					connectUrl={ bootstrap.urls.connect }
				/>
			) : null }
			<SiteScoreSummary
				scores={ scores.scores }
				error={ scores.error }
				loading={ scores.loading }
				connectUrl={ bootstrap.urls.connect }
				selected={ service }
				onSelect={ setService }
			/>
			<ReportSummary
				portalUrl={ portalUrl }
				connectUrl={ bootstrap.urls.connect }
				service={ service }
				onService={ setService }
				onGap={ onGap }
			/>
		</div>
	);
}
