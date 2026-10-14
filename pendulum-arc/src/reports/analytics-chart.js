/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	CHART_HEIGHT,
	CHART_PAD,
	CHART_WIDTH,
	chartAxisTicks,
	chartLineX,
} from './chart-axis';

const ACCENTS = {
	emerald: 'var(--arc-accent-emerald)',
	orange: 'var(--arc-accent-orange)',
	cyan: 'var(--arc-accent-cyan)',
	pink: 'var(--arc-accent-pink)',
	sky: 'var(--arc-accent-sky)',
	amber: 'var(--arc-accent-amber)',
	lime: 'var(--arc-accent-lime)',
	red: 'var(--arc-accent-red)',
};

const PALETTE = [
	'var(--arc-accent-cyan)',
	'var(--arc-accent-orange)',
	'var(--arc-accent-pink)',
	'var(--arc-accent-emerald)',
];

const PAD = CHART_PAD;

function accentColor( name, index ) {
	if ( name && ACCENTS[ name ] ) {
		return ACCENTS[ name ];
	}
	return PALETTE[ index % PALETTE.length ];
}

function niceMax( value ) {
	const number = Number( value );
	if ( ! Number.isFinite( number ) || number <= 0 ) {
		return 1;
	}
	const exp = 10 ** Math.floor( Math.log10( number ) );
	return Math.ceil( number / exp ) * exp;
}

function formatTick( value ) {
	if ( value >= 1000 ) {
		return `${ Math.round( value / 100 ) / 10 }k`;
	}
	return String( Math.round( value ) );
}

function formatValue( value, format ) {
	const number = Number( value ) || 0;
	if ( format === 'decimal1' ) {
		return number.toLocaleString( 'en-GB', {
			maximumFractionDigits: 1,
			minimumFractionDigits: 0,
		} );
	}
	if ( format === 'compact' || ! format ) {
		return new Intl.NumberFormat( 'en-GB', {
			notation: 'compact',
			maximumFractionDigits: 1,
		} ).format( number );
	}
	if ( Number.isInteger( number ) ) {
		return number.toLocaleString( 'en-GB' );
	}
	return number.toLocaleString( 'en-GB', { maximumFractionDigits: 1 } );
}

/**
 * One visitor chart. Axes stay when there is nothing to plot.
 *
 * @param {Object}  props
 * @param {Object}  props.chart
 * @param {boolean} [props.pending]
 */
export function AnalyticsChart( { chart, pending } ) {
	const [ tip, setTip ] = useState( null );
	const width = CHART_WIDTH;
	const height = CHART_HEIGHT;
	const innerW = width - PAD.left - PAD.right;
	const innerH = height - PAD.top - PAD.bottom;
	const series = chart.empty ? [] : chart.series || [];
	const labels = chart.empty ? [] : chart.labels || [];
	const peak = series.reduce( ( max, row ) => {
		const local = ( row.values || [] ).reduce(
			( high, value ) => Math.max( high, Number( value ) || 0 ),
			0
		);
		return Math.max( max, local );
	}, 0 );
	const yMax = niceMax( peak );
	const y = ( value ) => PAD.top + innerH - ( value / yMax ) * innerH;
	const x = ( index ) => chartLineX( index, labels.length );
	const ticks = [ 0, yMax / 2, yMax ];
	const band =
		labels.length <= 1 ? innerW : innerW / Math.max( labels.length - 1, 1 );
	const showTip = ( event, index ) => {
		const svg = event.currentTarget.ownerSVGElement;
		if ( ! svg || ! svg.parentElement ) {
			return;
		}
		const rect = svg.getBoundingClientRect();
		const host = svg.parentElement.getBoundingClientRect();
		const anchor =
			chart.kind === 'bar'
				? PAD.left +
					index * ( innerW / Math.max( labels.length, 1 ) ) +
					innerW / Math.max( labels.length, 1 ) / 2
				: x( index );
		const left =
			( anchor / width ) * rect.width + ( rect.left - host.left ) + 8;
		setTip( {
			index,
			x: Math.min( Math.max( left, 8 ), Math.max( 8, host.width - 148 ) ),
			y: 12,
			title: String( labels[ index ] ),
			rows: series.map( ( row, seriesIndex ) => ( {
				label:
					chart.kind === 'bar' && series.length === 1
						? chart.valueLabel || row.label
						: row.label,
				value: formatValue(
					( row.values || [] )[ index ],
					chart.valueFormat
				),
				color: accentColor( row.color, seriesIndex ),
			} ) ),
		} );
	};
	const xLabels = chartAxisTicks( labels, chart.kind );

	return (
		<section className="arc-chart">
			<h3 className="arc-chart__title">{ chart.title }</h3>
			<p className="arc-chart__summary">{ chart.summary }</p>
			<div className="arc-chart__plot">
				<svg
					viewBox={ `0 0 ${ width } ${ height }` }
					role="img"
					aria-label={ chart.title }
				>
					{ ticks.map( ( tick ) => (
						<g key={ tick }>
							<line
								x1={ PAD.left }
								x2={ width - PAD.right }
								y1={ y( tick ) }
								y2={ y( tick ) }
								className="arc-chart__grid"
							/>
							<text
								x={ PAD.left - 6 }
								y={ y( tick ) + 4 }
								className="arc-chart__tick"
								textAnchor="end"
							>
								{ formatTick( tick ) }
							</text>
						</g>
					) ) }
					<line
						x1={ PAD.left }
						x2={ PAD.left }
						y1={ PAD.top }
						y2={ PAD.top + innerH }
						className="arc-chart__axis"
					/>
					<line
						x1={ PAD.left }
						x2={ width - PAD.right }
						y1={ PAD.top + innerH }
						y2={ PAD.top + innerH }
						className="arc-chart__axis"
					/>
					{ xLabels.map( ( item ) => (
						<text
							key={ item.index }
							x={ item.x }
							y={ height - 8 }
							className="arc-chart__tick"
							textAnchor="middle"
						>
							{ item.full !== item.label ? (
								<title>{ item.full }</title>
							) : null }
							{ item.label }
						</text>
					) ) }
					{ chart.kind === 'bar'
						? series.map( ( row, seriesIndex ) => {
								const column =
									innerW / Math.max( labels.length, 1 );
								const barW = Math.max( 4, column * 0.62 );
								return ( row.values || [] ).map(
									( value, index ) => (
										<rect
											key={ `${ row.id }-${ index }` }
											x={
												PAD.left +
												index * column +
												( column - barW ) / 2
											}
											y={ y( Number( value ) || 0 ) }
											width={ barW }
											height={ Math.max(
												0,
												PAD.top +
													innerH -
													y( Number( value ) || 0 )
											) }
											fill={ accentColor(
												row.color,
												seriesIndex
											) }
											rx="2"
										/>
									)
								);
							} )
						: series.map( ( row, seriesIndex ) => {
								const color = accentColor(
									row.color,
									seriesIndex
								);
								const points = ( row.values || [] )
									.map(
										( value, index ) =>
											`${ x( index ) },${ y( Number( value ) || 0 ) }`
									)
									.join( ' ' );
								return (
									<polyline
										key={ row.id }
										points={ points }
										fill="none"
										stroke={ color }
										strokeWidth="2"
									/>
								);
							} ) }
					{ labels.map( ( label, index ) => {
						const active = tip && tip.index === index;
						if ( chart.kind === 'bar' ) {
							const step = innerW / Math.max( labels.length, 1 );
							return (
								<rect
									key={ `hit-${ label }-${ index }` }
									x={ PAD.left + index * step }
									y={ PAD.top }
									width={ step }
									height={ innerH }
									fill="transparent"
									className="arc-chart__hit"
									onMouseEnter={ ( event ) =>
										showTip( event, index )
									}
									onMouseLeave={ () => setTip( null ) }
								/>
							);
						}
						const cx = x( index );
						const half = Math.max( band / 2, 8 );
						const left = Math.max( PAD.left, cx - half );
						const right = Math.min( width - PAD.right, cx + half );
						return (
							<g key={ `hit-${ label }-${ index }` }>
								{ active ? (
									<line
										x1={ cx }
										x2={ cx }
										y1={ PAD.top }
										y2={ PAD.top + innerH }
										className="arc-chart__guide"
									/>
								) : null }
								{ active
									? series.map( ( row, seriesIndex ) => (
											<circle
												key={ `${ row.id }-dot-${ index }` }
												cx={ cx }
												cy={ y(
													Number(
														( row.values || [] )[
															index
														]
													) || 0
												) }
												r="4"
												fill={ accentColor(
													row.color,
													seriesIndex
												) }
											/>
										) )
									: null }
								<rect
									x={ left }
									y={ PAD.top }
									width={ Math.max( right - left, 1 ) }
									height={ innerH }
									fill="transparent"
									className="arc-chart__hit"
									onMouseEnter={ ( event ) =>
										showTip( event, index )
									}
									onMouseLeave={ () => setTip( null ) }
								/>
							</g>
						);
					} ) }
				</svg>
				{ tip ? (
					<div
						className="arc-chart__tip"
						style={ { left: tip.x, top: tip.y } }
					>
						<p className="arc-chart__tip-title">{ tip.title }</p>
						<ul>
							{ tip.rows.map( ( row, index ) => (
								<li key={ `${ row.label }-${ index }` }>
									<span
										className="arc-chart__tip-swatch"
										style={ { background: row.color } }
									/>
									<span>{ row.label }</span>
									<span className="arc-chart__tip-value">
										{ row.value }
									</span>
								</li>
							) ) }
						</ul>
					</div>
				) : null }
				{ chart.empty && ! pending ? (
					<p className="arc-chart__empty">
						{ __( 'Not enough data', 'pendulum-arc' ) }
					</p>
				) : null }
			</div>
			{ series.length > 1 ? (
				<ul className="arc-chart__legend">
					{ series.map( ( row, index ) => (
						<li key={ row.id }>
							<span
								style={ {
									background: accentColor( row.color, index ),
								} }
							/>
							{ row.label }
						</li>
					) ) }
				</ul>
			) : null }
		</section>
	);
}
