/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { reportsAreComplete } from './reports-ready';

function row( service, extra = {} ) {
	return { service, score: 80, setup: null, visitors: null, ...extra };
}

describe( 'reportsAreComplete', () => {
	it( 'is complete when every service has a report', () => {
		expect(
			reportsAreComplete( [
				row( 'analytics', {
					score: null,
					visitors: { newUsers: 0, returningUsers: 0 },
				} ),
				row( 'seo' ),
				row( 'a11y' ),
				row( 'ai' ),
				row( 'security' ),
				row( 'brand' ),
			] )
		).toBe( true );
	} );

	it( 'is not complete while a crawl score is missing', () => {
		expect(
			reportsAreComplete( [
				row( 'analytics', {
					score: null,
					visitors: { newUsers: 1, returningUsers: 2 },
				} ),
				row( 'seo', { score: null } ),
				row( 'a11y' ),
				row( 'ai' ),
				row( 'security' ),
				row( 'brand' ),
			] )
		).toBe( false );
	} );

	it( 'is not complete when Analytics still needs setup', () => {
		expect(
			reportsAreComplete( [
				row( 'analytics', { setup: 'connect_google', visitors: null } ),
				row( 'seo' ),
				row( 'a11y' ),
				row( 'ai' ),
				row( 'security' ),
				row( 'brand' ),
			] )
		).toBe( false );
	} );
} );
