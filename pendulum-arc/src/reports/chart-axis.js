/**
 * Shared chart geometry so axis labels and plotted marks use one scale.
 */
export const CHART_WIDTH = 640;
export const CHART_HEIGHT = 220;
export const CHART_PAD = { top: 16, right: 12, bottom: 28, left: 36 };

const INNER_W = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;

/**
 * @param {number} index
 * @param {number} count
 */
export function chartLineX( index, count ) {
	if ( count <= 1 ) {
		return CHART_PAD.left + INNER_W / 2;
	}
	return CHART_PAD.left + ( index / ( count - 1 ) ) * INNER_W;
}

/**
 * YYYY-MM-DD becomes MM-DD. Anything else is left whole.
 *
 * @param {string} label
 */
function shortDate( label ) {
	if ( /^\d{4}-\d{2}-\d{2}/.test( label ) ) {
		return label.slice( 5, 10 );
	}
	return label;
}

/**
 * @param {string} label
 * @param {number} max
 */
function truncateLabel( label, max ) {
	if ( label.length <= max ) {
		return label;
	}
	if ( max <= 3 ) {
		return label.slice( 0, max );
	}
	return `${ label.slice( 0, max - 3 ) }...`;
}

/**
 * X-axis ticks. Line charts show a short date. Bar charts keep the category
 * name and sit under each bar. Category names are never chopped from the front.
 *
 * @param {Array<string|number>|undefined} labels
 * @param {string}                         kind
 * @return {Array<{index: number, label: string, full: string, x: number}>} Ticks to draw.
 */
export function chartAxisTicks( labels, kind ) {
	const items = ( labels || [] ).map( ( label ) => String( label ?? '' ) );
	if ( items.length === 0 ) {
		return [];
	}

	if ( kind === 'bar' ) {
		const column = INNER_W / items.length;
		const maxChars = Math.max( 4, Math.floor( column / 6.5 ) );
		return items.map( ( label, index ) => ( {
			index,
			full: label,
			label: truncateLabel( label, maxChars ),
			x: CHART_PAD.left + index * column + column / 2,
		} ) );
	}

	const indexes = [
		0,
		Math.floor( ( items.length - 1 ) / 2 ),
		items.length - 1,
	].filter( ( value, index, all ) => all.indexOf( value ) === index );

	return indexes.map( ( index ) => ( {
		index,
		full: items[ index ],
		label: shortDate( items[ index ] ),
		x: chartLineX( index, items.length ),
	} ) );
}
