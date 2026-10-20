/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { inviteIdsToSend } from './invite-selection';

describe( 'inviteIdsToSend', () => {
	it( 'sends checked ids from the current page only', () => {
		expect( inviteIdsToSend( [ 1, 2, 3 ], [ 2, 99 ] ) ).toEqual( [ 2 ] );
		expect( inviteIdsToSend( [ 1, 2, 3 ], [ 3, 1 ] ) ).toEqual( [ 3, 1 ] );
		expect( inviteIdsToSend( [ 1, 2, 3 ], [ 4, 5 ] ) ).toEqual( [] );
		expect( inviteIdsToSend( [ 1, 2 ], [ 1, 1, 2 ] ) ).toEqual( [ 1, 2 ] );
	} );
} );
