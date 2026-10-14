/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { CHART_PAD, CHART_WIDTH, chartAxisTicks } from './chart-axis';

describe( 'chart axis ticks', () => {
	it( 'keeps device and channel names readable', () => {
		expect(
			chartAxisTicks( [ 'Desktop', 'Mobile' ], 'bar' ).map(
				( tick ) => tick.label
			)
		).toEqual( [ 'Desktop', 'Mobile' ] );

		expect(
			chartAxisTicks(
				[ 'Direct', 'Organic Search', 'Referral', 'Unassigned' ],
				'bar'
			).map( ( tick ) => tick.label )
		).toEqual( [ 'Direct', 'Organic Search', 'Referral', 'Unassigned' ] );
	} );

	it( 'places one label under each bar', () => {
		const ticks = chartAxisTicks(
			[ 'Direct', 'Organic Search', 'Referral', 'Unassigned' ],
			'bar'
		);
		expect( ticks.map( ( tick ) => tick.index ) ).toEqual( [ 0, 1, 2, 3 ] );
		const gaps = ticks
			.slice( 1 )
			.map( ( tick, index ) => tick.x - ticks[ index ].x );
		expect( new Set( gaps.map( ( gap ) => Math.round( gap ) ) ).size ).toBe(
			1
		);
		expect( ticks[ 0 ].x ).toBeGreaterThan( CHART_PAD.left );
		expect( ticks[ ticks.length - 1 ].x ).toBeLessThan(
			CHART_WIDTH - CHART_PAD.right
		);
	} );

	it( 'shortens daily dates and leaves other line labels whole', () => {
		const ticks = chartAxisTicks(
			[ '2026-10-01', '2026-10-08', '2026-10-14' ],
			'line'
		);
		expect( ticks.map( ( tick ) => tick.label ) ).toEqual( [
			'10-01',
			'10-08',
			'10-14',
		] );
		expect( ticks.map( ( tick ) => tick.full ) ).toEqual( [
			'2026-10-01',
			'2026-10-08',
			'2026-10-14',
		] );

		expect(
			chartAxisTicks( [ 'Desktop', 'Mobile' ], 'line' ).map(
				( tick ) => tick.label
			)
		).toEqual( [ 'Desktop', 'Mobile' ] );
	} );

	it( 'truncates a crowded bar label from the end', () => {
		const labels = Array.from( { length: 12 }, ( _, index ) =>
			index === 0 ? 'Organic Search' : `Channel ${ index }`
		);
		const first = chartAxisTicks( labels, 'bar' )[ 0 ];
		expect( first.label.startsWith( 'Org' ) ).toBe( true );
		expect( first.label.endsWith( '...' ) ).toBe( true );
		expect( first.label ).not.toContain( 'ic Search' );
		expect( first.full ).toBe( 'Organic Search' );
	} );
} );
