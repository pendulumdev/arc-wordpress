/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { AnalyticsChart } from './analytics-chart';
import { mergeCharts } from './chart-shells';
import { ReportCta } from './report-cta';

function formatMetric( metric ) {
	const value = Number( metric.value );
	if ( ! Number.isFinite( value ) ) {
		return '-';
	}
	if ( metric.key === 'engagementRate' || metric.key === 'ctr' ) {
		return `${ ( value * 100 ).toFixed( 1 ) }%`;
	}
	return Math.round( value ).toLocaleString( 'en-GB' );
}

function metricDelta( metric ) {
	const current = Number( metric.value );
	const previous = Number( metric.previousValue );
	if ( ! Number.isFinite( current ) || ! Number.isFinite( previous ) ) {
		return null;
	}
	const diff = current - previous;
	if ( diff === 0 ) {
		return { text: __( 'flat vs prior', 'pendulum-arc' ), tone: 'flat' };
	}
	const sign = diff > 0 ? '+' : '';
	const formatted =
		metric.key === 'engagementRate' || metric.key === 'ctr'
			? `${ ( diff * 100 ).toFixed( 1 ) }%`
			: Math.round( diff ).toLocaleString( 'en-GB' );
	return {
		text: `${ sign }${ formatted } vs prior`,
		tone: diff > 0 ? 'up' : 'down',
	};
}

function formatRate( value ) {
	const number = Number( value );
	if ( ! Number.isFinite( number ) ) {
		return '-';
	}
	return `${ ( number * 100 ).toFixed( 1 ) }%`;
}

const METRIC_SHELLS = [
	{ key: 'sessions', label: __( 'Sessions', 'pendulum-arc' ) },
	{ key: 'users', label: __( 'Users', 'pendulum-arc' ) },
	{ key: 'engaged', label: __( 'Engaged sessions', 'pendulum-arc' ) },
	{ key: 'engagementRate', label: __( 'Engagement rate', 'pendulum-arc' ) },
];

function heroMetrics( report ) {
	const found = new Map(
		( ( report && report.metrics ) || [] ).map( ( metric ) => [
			metric.key,
			metric,
		] )
	);
	return METRIC_SHELLS.map(
		( shell ) =>
			found.get( shell.key ) || {
				...shell,
				value: null,
				previousValue: null,
			}
	);
}

/**
 * @param {Object} props
 * @param {Object} props.report
 * @param {string} [props.portalUrl]
 */
export function VisitorAnalytics( { report, portalUrl } ) {
	const charts = mergeCharts( report && report.charts );
	const metrics = heroMetrics( report );
	const pages = ( report && report.landingPages ) || [];
	const runId = report && report.runId ? report.runId : '';
	const href =
		portalUrl && runId
			? `${ portalUrl.replace( /\/$/, '' ) }/runs/${ runId }`
			: portalUrl || '';

	return (
		<div className="arc-visitor">
			<section className="arc-report-hero">
				<svg
					className="arc-report-hero__mark"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path d="M3 3v18h18" />
					<path d="M7 14l4-4 3 3 5-6" />
				</svg>
				<div className="arc-report-hero__layout">
					<div className="arc-report-hero__copy">
						<p className="arc-report-hero__overline">
							{ ( report && report.overline ) ||
								__( 'Whos Visiting?', 'pendulum-arc' ) }
						</p>
						<h2 className="arc-report-hero__title">
							{ ( report && report.title ) ||
								__( 'Visitor Analytics', 'pendulum-arc' ) }
						</h2>
						{ report && report.rangeLabel ? (
							<p className="arc-report-hero__range">
								{ report.rangeLabel }
							</p>
						) : null }
						<p className="arc-report-hero__detail">
							{ ( report && report.detail ) ||
								__(
									'Sessions, users, engagement, and landing pages from your bound GA4 property for this date range.',
									'pendulum-arc'
								) }
						</p>
					</div>
					<dl className="arc-report-hero__metrics">
						{ metrics.map( ( metric ) => {
							const delta = metricDelta( metric );
							const empty = ! Number.isFinite(
								Number( metric.value )
							);
							return (
								<div key={ metric.key }>
									<dt>{ metric.label }</dt>
									<dd>
										<span
											className="arc-report-hero__figure"
											data-empty={
												empty ? 'true' : undefined
											}
										>
											{ formatMetric( metric ) }
										</span>
										{ delta ? (
											<span
												className="arc-report-hero__delta"
												data-tone={ delta.tone }
											>
												{ delta.text }
											</span>
										) : null }
									</dd>
								</div>
							);
						} ) }
					</dl>
				</div>
				{ report &&
				( report.connectionMeta || report.searchConsoleMeta ) ? (
					<p className="arc-report-hero__meta">
						{ report.connectionMeta ? (
							<span className="arc-report-hero__pair">
								<span>GA4</span>
								<span className="arc-report-hero__id">
									{ report.connectionMeta }
								</span>
							</span>
						) : null }
						{ report.searchConsoleMeta ? (
							<span className="arc-report-hero__pair">
								<span>
									{ __( 'Search Console', 'pendulum-arc' ) }
								</span>
								<span className="arc-report-hero__id">
									{ report.searchConsoleMeta }
								</span>
							</span>
						) : null }
					</p>
				) : null }
			</section>
			<div className="arc-chart-grid">
				{ charts.map( ( chart ) => (
					<AnalyticsChart
						key={ chart.id }
						chart={ chart }
						pending={ Boolean( report && report.loading ) }
					/>
				) ) }
			</div>
			<section className="arc-landing">
				<h3>{ __( 'Top landing pages', 'pendulum-arc' ) }</h3>
				{ ! ( report && report.loading ) && pages.length === 0 ? (
					<p className="arc-landing__empty">
						{ __( 'Not enough data', 'pendulum-arc' ) }
					</p>
				) : null }
				{ ! ( report && report.loading ) && pages.length > 0 ? (
					<table>
						<thead>
							<tr>
								<th>{ __( 'Page', 'pendulum-arc' ) }</th>
								<th>{ __( 'Sessions', 'pendulum-arc' ) }</th>
								<th>{ __( 'Engagement', 'pendulum-arc' ) }</th>
								<th>
									<span className="screen-reader-text">
										{ __( 'View', 'pendulum-arc' ) }
									</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{ pages.map( ( page ) => (
								<tr key={ page.path }>
									<td>
										{ page.editUrl ? (
											<a href={ page.editUrl }>
												{ page.path }
											</a>
										) : (
											page.path
										) }
									</td>
									<td>
										{ Number(
											page.sessions || 0
										).toLocaleString( 'en-GB' ) }
									</td>
									<td>
										{ formatRate( page.engagementRate ) }
									</td>
									<td>
										{ page.viewUrl ? (
											<a
												className="arc-landing__view"
												href={ page.viewUrl }
												target="_blank"
												rel="noreferrer"
											>
												{ __( 'View', 'pendulum-arc' ) }
											</a>
										) : null }
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) : null }
			</section>
			<ReportCta href={ href } />
		</div>
	);
}
