/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	accountOnProject,
	analyticsLinked,
	currentSetupAction,
	findAccountOnProject,
	setupProgress,
} from './setup-step-state';

describe( 'setupProgress', () => {
	it( 'ticks install on this screen, and the later steps only after connect', () => {
		expect( setupProgress() ).toEqual( {
			install: true,
			connect: false,
			analytics: false,
			invite: false,
		} );
		expect(
			setupProgress( {
				connected: false,
				analytics: true,
				invited: true,
			} )
		).toEqual( {
			install: true,
			connect: false,
			analytics: false,
			invite: false,
		} );
		expect(
			setupProgress( {
				connected: true,
				analytics: true,
				invited: true,
			} )
		).toEqual( {
			install: true,
			connect: true,
			analytics: true,
			invite: true,
		} );
	} );
} );

describe( 'currentSetupAction', () => {
	it( 'links only the next unfinished step', () => {
		expect(
			currentSetupAction( {
				connect: false,
				analytics: false,
				invite: false,
			} )
		).toBe( 'connect' );
		expect(
			currentSetupAction(
				{ connect: true, analytics: false, invite: false },
				{ analytics: true }
			)
		).toBe( null );
		expect(
			currentSetupAction( {
				connect: true,
				analytics: false,
				invite: false,
			} )
		).toBe( 'analytics' );
		expect(
			currentSetupAction(
				{ connect: true, analytics: true, invite: false },
				{ invite: true }
			)
		).toBe( null );
		expect(
			currentSetupAction( {
				connect: true,
				analytics: true,
				invite: false,
			} )
		).toBe( 'invite' );
		expect(
			currentSetupAction( {
				connect: true,
				analytics: true,
				invite: true,
			} )
		).toBe( null );
	} );
} );

describe( 'analyticsLinked', () => {
	it( 'ticks when Google is connected, including a site that still needs assigning', () => {
		expect(
			analyticsLinked( {
				error: null,
				scores: [ { service: 'analytics', setup: null } ],
			} )
		).toBe( true );
		expect(
			analyticsLinked( {
				scores: [ { service: 'analytics', setup: 'assign_site' } ],
			} )
		).toBe( true );
		expect(
			analyticsLinked( {
				scores: [ { service: 'analytics', setup: 'connect_google' } ],
			} )
		).toBe( false );
		expect(
			analyticsLinked( {
				scores: [ { service: 'analytics', setup: 'not_enabled' } ],
			} )
		).toBe( false );
		expect(
			analyticsLinked( {
				error: 'Scores could not be loaded.',
				scores: [ { service: 'analytics', setup: null } ],
			} )
		).toBe( false );
	} );
} );

describe( 'accountOnProject', () => {
	it( 'ticks when any person has an Arc account and is on this project', () => {
		expect(
			accountOnProject( [
				{ status: 'none', account: 'active' },
				{ status: 'pending', account: 'active' },
				{ status: 'member', account: 'absent' },
			] )
		).toBe( false );
		expect(
			accountOnProject( [
				{ status: 'none', account: 'absent' },
				{ status: 'member', account: 'active' },
			] )
		).toBe( true );
	} );
} );

describe( 'findAccountOnProject', () => {
	it( 'reads the next page when the member is not on the first', async () => {
		const pages = {
			1: {
				users: [ { status: 'none', account: 'active' } ],
				total: 2,
				pageSize: 1,
			},
			2: {
				users: [ { status: 'member', account: 'active' } ],
				total: 2,
				pageSize: 1,
			},
		};
		await expect(
			findAccountOnProject( ( page ) => Promise.resolve( pages[ page ] ) )
		).resolves.toBe( true );
	} );

	it( 'stays open when Arc asks for a reconnect', async () => {
		await expect(
			findAccountOnProject( () =>
				Promise.resolve( { reconnect: true, users: [] } )
			)
		).resolves.toBe( false );
	} );
} );
