import { describe, expect, it } from 'vitest';
import { connectReducer, initialConnectState } from './reducer';

describe( 'connect flow', () => {
	it( 'opens the create form when the origin is missing', () => {
		const next = connectReducer( initialConnectState( null ), {
			type: 'verify-result',
			result: {
				status: 'needs_site',
				draft: {
					name: 'Example',
					baseUrl: 'https://example.com/',
					projectId: '',
				},
				projects: [ { id: 'client_a', name: 'A' } ],
			},
		} );
		expect( next.phase ).toBe( 'needs_site' );
		expect( next.draft.name ).toBe( 'Example' );
	} );

	it( 'keeps the create form open while the request is in flight', () => {
		const started = connectReducer(
			{
				phase: 'needs_site',
				error: '',
				fieldErrors: {},
				draft: {
					name: 'Example',
					baseUrl: 'https://example.com/',
					projectId: 'client_a',
				},
				projects: [],
				matches: [],
				portalUrl: '',
			},
			{ type: 'create-start' }
		);
		expect( started.phase ).toBe( 'creating' );
		expect( started.draft.name ).toBe( 'Example' );
	} );

	it( 'asks for a project in Arc when the account has none', () => {
		const next = connectReducer( initialConnectState( null ), {
			type: 'verify-result',
			result: {
				status: 'needs_project',
				portalUrl: 'https://arc.pendulumdev.co.uk',
			},
		} );
		expect( next.phase ).toBe( 'needs_project' );
		expect( next.portalUrl ).toBe( 'https://arc.pendulumdev.co.uk' );
	} );
} );
