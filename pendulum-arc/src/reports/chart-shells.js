/**
 * The four Visitor Analytics graphs. Shown even when Arc has no points.
 */
export function chartShells() {
	return [
		{
			id: 'new-vs-returning',
			title: 'New vs returning users',
			summary:
				'Daily new users versus returning users in the reporting window.',
			kind: 'line',
			valueLabel: 'Users',
		},
		{
			id: 'organic-sessions',
			title: 'Organic search sessions',
			summary:
				'Sessions from organic search each day - on-site SEO traffic, not Search Console impressions.',
			kind: 'line',
			valueLabel: 'Sessions',
		},
		{
			id: 'sessions-device',
			title: 'Sessions by device',
			summary:
				'Session volume by device category - a cue for mobile rendering and layout priorities.',
			kind: 'bar',
			valueLabel: 'Sessions',
		},
		{
			id: 'sessions-channel',
			title: 'Sessions by channel',
			summary:
				'How sessions split across GA4 default channel groups for the reporting period.',
			kind: 'bar',
			valueLabel: 'Sessions',
		},
	];
}

/**
 * @param {Array<Object>|undefined} charts Charts from Arc.
 */
export function mergeCharts( charts ) {
	const byId = new Map(
		( charts || [] ).map( ( chart ) => [ chart.id, chart ] )
	);
	return chartShells().map( ( shell ) => {
		const found = byId.get( shell.id );
		const labels =
			found && Array.isArray( found.labels ) ? found.labels : [];
		const series =
			found && Array.isArray( found.series ) ? found.series : [];
		const plotted =
			labels.length > 0 &&
			series.some(
				( row ) => Array.isArray( row.values ) && row.values.length > 0
			);
		return {
			...shell,
			...( found || {} ),
			labels: plotted ? labels : [],
			series: plotted ? series : [],
			empty: ! plotted,
		};
	} );
}
