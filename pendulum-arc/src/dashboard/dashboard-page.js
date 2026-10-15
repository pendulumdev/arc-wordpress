/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { SiteScoreSummary, useSiteScores } from '../meta';
import { GenerationNotice } from '../reports/report-cta';
import { reportsAreComplete } from '../reports/reports-ready';
import { ReportSummary } from '../reports/report-summary';
import { isSiteMissingError } from '../ui/error-alert';
import { OpenInArc } from '../ui/open-in-arc';

export function DashboardPage( { bootstrap } ) {
	const { scores: scoreRows, error, loading, reload } = useSiteScores();
	const connection = bootstrap.connection || {};
	const portalUrl = connection.portalUrl || bootstrap.urls.portal;
	const [ service, setService ] = useState( 'analytics' );
	const [ refreshKey, setRefreshKey ] = useState( 0 );
	const onSettled = useCallback( () => {
		reload();
		setRefreshKey( ( current ) => current + 1 );
	}, [ reload ] );

	return (
		<div className="pendulum-arc-screen">
			<OpenInArc bootstrap={ bootstrap } />
			{ isSiteMissingError( error ) ? null : (
				<GenerationNotice
					connectUrl={ bootstrap.urls.connect }
					complete={ ! loading && reportsAreComplete( scoreRows ) }
					onSettled={ onSettled }
				/>
			) }
			<SiteScoreSummary
				scores={ scoreRows }
				error={ error }
				loading={ loading }
				connectUrl={ bootstrap.urls.connect }
				portalUrl={ portalUrl }
				selected={ service }
				onSelect={ setService }
			/>
			<ReportSummary
				portalUrl={ portalUrl }
				connectUrl={ bootstrap.urls.connect }
				service={ service }
				onService={ setService }
				refreshKey={ refreshKey }
			/>
		</div>
	);
}
