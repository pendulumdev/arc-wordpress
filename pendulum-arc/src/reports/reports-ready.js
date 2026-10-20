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
 * No Google connection means Analytics is not required for this notice.
 * Any other setup gap (property not assigned, Analytics not enabled) is not complete.
 *
 * @param {Array<{service?: string, score?: number|null, setup?: string|null, visitors?: object|null}>|undefined} scores
 */
export function reportsAreComplete( scores ) {
	if ( ! Array.isArray( scores ) ) {
		return false;
	}
	return REPORT_SERVICES.every( ( service ) => {
		const row = scores.find( ( item ) => item && item.service === service );
		if ( ! row ) {
			return false;
		}
		if ( service === 'analytics' && row.setup === 'connect_google' ) {
			return true;
		}
		if ( row.setup ) {
			return false;
		}
		if ( service === 'analytics' ) {
			const visitors = row.visitors;
			return (
				visitors !== null &&
				visitors !== undefined &&
				visitors.newUsers !== null &&
				visitors.newUsers !== undefined &&
				visitors.returningUsers !== null &&
				visitors.returningUsers !== undefined
			);
		}
		return row.score !== null && row.score !== undefined;
	} );
}
