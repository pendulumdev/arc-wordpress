/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { SiteScoreSummary, useSiteScores } from '../meta';
import { ArcButton } from '../ui/button';

export function DashboardWidget( { dashboardUrl, connectUrl, connected } ) {
	const scores = useSiteScores( connected );

	return (
		<div className="pendulum-arc-dashboard-widget__body">
			{ connected ? (
				<SiteScoreSummary
					scores={ scores.scores }
					error={ scores.error }
					loading={ scores.loading }
					connectUrl={ connectUrl }
				/>
			) : (
				<p className="pendulum-arc-dashboard-widget__note">
					{ __(
						'Connect this site to Arc to see scores.',
						'pendulum-arc'
					) }
				</p>
			) }
			<div className="pendulum-arc-dashboard-widget__actions">
				<ArcButton href={ dashboardUrl }>
					{ __( 'Arc dashboard', 'pendulum-arc' ) }
				</ArcButton>
			</div>
		</div>
	);
}
