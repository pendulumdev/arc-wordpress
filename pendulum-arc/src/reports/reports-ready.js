const REPORT_SERVICES = [
	'analytics',
	'seo',
	'a11y',
	'ai',
	'security',
	'brand',
];

/**
 * True when every dashboard service already has a report.
 * Analytics counts when visitor totals are present, including zeros.
 * A setup gap (Google not connected, Analytics not enabled) is not complete.
 *
 * @param {Array<{service?: string, score?: number|null, setup?: string|null, visitors?: object|null}>|undefined} scores
 */
export function reportsAreComplete( scores ) {
	if ( ! Array.isArray( scores ) ) {
		return false;
	}
	return REPORT_SERVICES.every( ( service ) => {
		const row = scores.find( ( item ) => item && item.service === service );
		if ( ! row || row.setup ) {
			return false;
		}
		if ( service === 'analytics' ) {
			const visitors = row.visitors;
			return (
				visitors != null &&
				visitors.newUsers !== null &&
				visitors.newUsers !== undefined &&
				visitors.returningUsers !== null &&
				visitors.returningUsers !== undefined
			);
		}
		return row.score !== null && row.score !== undefined;
	} );
}
