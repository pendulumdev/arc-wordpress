/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useGoogleConnect } from '../google/use-google-connect';
import { SiteScoreSummary, useSiteScores } from '../meta';
import { ArcButton } from '../ui/button';

export function DashboardWidget( {
	dashboardUrl,
	connectUrl,
	portalUrl,
	connected,
} ) {
	const scores = useSiteScores( connected );
	const google = useGoogleConnect();

	return (
		<div className="pendulum-arc-dashboard-widget__body">
			{ connected ? (
				<SiteScoreSummary
					scores={ scores.scores }
					error={ scores.error }
					loading={ scores.loading }
					connectUrl={ connectUrl }
					portalUrl={ portalUrl }
					onGoogleConnect={ google.start }
					googlePending={ google.pending }
				/>
			) : (
				<p className="pendulum-arc-dashboard-widget__note">
					{ __(
						'Connect this site to Arc to see scores.',
						'pendulum-arc'
					) }
				</p>
			) }
			{ google.notice ? (
				<p className="pendulum-arc-dashboard-widget__note">
					{ google.notice.message }{ ' ' }
					{ google.notice.onAction ? (
						<button
							type="button"
							className="arc-report-alert__action"
							onClick={ google.notice.onAction }
						>
							{ google.notice.hrefLabel }
						</button>
					) : null }
				</p>
			) : null }
			<div className="pendulum-arc-dashboard-widget__actions">
				<ArcButton href={ dashboardUrl }>
					{ __( 'Arc dashboard', 'pendulum-arc' ) }
				</ArcButton>
			</div>
		</div>
	);
}
