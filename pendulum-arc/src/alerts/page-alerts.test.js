/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { countedAlerts, googleAccountMissing, pageAlerts } from './alert-list';

const keyphrases = {
	id: 'keyphrases',
	tone: 'info',
	message: 'Keyphrases on this site differ from Arc.',
	count: true,
};

describe( 'pageAlerts', () => {
	it( 'counts the keyphrase alert and not other notices', () => {
		const alerts = pageAlerts(
			[
				{
					id: 'flash',
					tone: 'error',
					message: 'Arc sign-in was cancelled.',
					count: false,
				},
				keyphrases,
			],
			[
				{
					id: 'consent',
					tone: 'info',
					message: 'Saved.',
					count: true,
				},
			],
			null,
			null
		);
		expect( countedAlerts( alerts ) ).toBe( 1 );
		expect( alerts.find( ( alert ) => alert.id === 'consent' ).count ).toBe(
			false
		);
	} );

	it( 'drops the keyphrase alert when the lists match', () => {
		expect( pageAlerts( [ keyphrases ], [], false, keyphrases ) ).toEqual(
			[]
		);
	} );

	it( 'adds the keyphrase alert when the list has diverged', () => {
		expect( pageAlerts( [], [], true, keyphrases ) ).toEqual( [
			keyphrases,
		] );
	} );

	it( 'shows the Google notice without counting it', () => {
		const google = {
			id: 'google',
			tone: 'info',
			message: 'Connect your Google account.',
			count: false,
		};
		const alerts = pageAlerts(
			[ keyphrases ],
			[],
			null,
			null,
			true,
			google
		);
		expect( alerts.map( ( alert ) => alert.id ) ).toEqual( [
			'keyphrases',
			'google',
		] );
		expect( countedAlerts( alerts ) ).toBe( 1 );
		expect(
			googleAccountMissing( [
				{ service: 'analytics', setup: 'connect_google' },
			] )
		).toBe( true );
		expect(
			googleAccountMissing( [
				{ service: 'analytics', setup: 'assign_site' },
			] )
		).toBe( false );
	} );

	it( 'hides the Google notice once an account is connected', () => {
		const alerts = pageAlerts(
			[
				{
					id: 'google',
					tone: 'info',
					message: 'Connect your Google account.',
					count: false,
				},
			],
			[],
			null,
			null,
			false,
			null
		);
		expect( alerts ).toEqual( [] );
	} );
} );
