/**
 * WordPress dependencies
 */
import { useCallback, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	googleAccountMissing,
	googleAlert,
	keyphraseAlert,
	pageAlerts,
	PageAlerts,
} from '../alerts/page-alerts';
import { useGoogleConnect } from '../google/use-google-connect';
import { SiteScoreSummary, useSiteScores } from '../meta';
import { GenerationNotice } from '../reports/report-cta';
import { PageSelectionProvider } from '../reports/page-selection';
import { reportsAreComplete } from '../reports/reports-ready';
import { ReportSummary } from '../reports/report-summary';
import { isSiteMissingError } from '../ui/error-alert';
import { OpenInArc } from '../ui/open-in-arc';

export function DashboardPage( { bootstrap } ) {
	return (
		<PageSelectionProvider>
			<DashboardScreen bootstrap={ bootstrap } />
		</PageSelectionProvider>
	);
}

function DashboardScreen( { bootstrap } ) {
	const { scores: scoreRows, error, loading, reload } = useSiteScores();
	const connection = bootstrap.connection || {};
	const portalUrl = connection.portalUrl || bootstrap.urls.portal;
	const [ service, setService ] = useState( 'analytics' );
	const [ refreshKey, setRefreshKey ] = useState( 0 );
	const [ activity, setActivity ] = useState( {} );
	const [ reportActivity, setReportActivity ] = useState( null );
	const google = useGoogleConnect();
	const onGeneration = useCallback( ( key, status ) => {
		setReportActivity( ( current ) => {
			const next =
				status === 'queued' || status === 'running'
					? { service: key, status }
					: null;
			if ( ! current && ! next ) {
				return current;
			}
			if (
				current &&
				next &&
				current.service === next.service &&
				current.status === next.status
			) {
				return current;
			}
			return next;
		} );
	}, [] );
	const cardActivity = { ...activity };
	if ( reportActivity ) {
		cardActivity[ reportActivity.service ] = reportActivity.status;
	}
	const openGeneration =
		reportActivity && reportActivity.service === service
			? reportActivity.status
			: activity[ service ] || null;
	const onSettled = useCallback( () => {
		reload();
		setRefreshKey( ( current ) => current + 1 );
	}, [ reload ] );

	const googleMissing =
		loading || error ? null : googleAccountMissing( scoreRows );
	const alerts = pageAlerts(
		bootstrap.alerts,
		google.notice ? [ google.notice ] : [],
		null,
		keyphraseAlert( bootstrap.urls.connect, false ),
		googleMissing,
		googleAlert( {
			onAction: google.start,
			disabled: google.pending,
		} )
	);

	return (
		<div className="pendulum-arc-screen">
			<OpenInArc bootstrap={ bootstrap } />
			<PageAlerts alerts={ alerts } />
			{ isSiteMissingError( error ) ? null : (
				<GenerationNotice
					connectUrl={ bootstrap.urls.connect }
					complete={ ! loading && reportsAreComplete( scoreRows ) }
					onSettled={ onSettled }
					onBusy={ setActivity }
					service={ service }
					generation={ openGeneration }
					onRecrawled={ onSettled }
				/>
			) }
			<SiteScoreSummary
				scores={ scoreRows }
				error={ error }
				loading={ loading }
				connectUrl={ bootstrap.urls.connect }
				portalUrl={ portalUrl }
				onGoogleConnect={ google.start }
				googlePending={ google.pending }
				activity={ cardActivity }
				selected={ service }
				onSelect={ setService }
			/>
			<ReportSummary
				portalUrl={ portalUrl }
				connectUrl={ bootstrap.urls.connect }
				service={ service }
				onService={ setService }
				refreshKey={ refreshKey }
				onGeneration={ onGeneration }
				onSettled={ onSettled }
			/>
		</div>
	);
}
