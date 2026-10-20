/**
 * External dependencies
 */
import apiFetch from '@wordpress/api-fetch';

export function connectWithApiKey( apiKey ) {
	return apiFetch( {
		path: '/pendulum-arc/v1/connect/api-key',
		method: 'POST',
		data: { apiKey },
	} );
}

export function reconnect() {
	return apiFetch( {
		path: '/pendulum-arc/v1/connect/reconnect',
		method: 'POST',
	} );
}

export function startOAuth() {
	return apiFetch( {
		path: '/pendulum-arc/v1/connect/oauth/start',
		method: 'POST',
	} );
}

export function pairSite( siteId ) {
	return apiFetch( {
		path: '/pendulum-arc/v1/connect/pair',
		method: 'POST',
		data: { siteId },
	} );
}

export function createSite( draft ) {
	return apiFetch( {
		path: '/pendulum-arc/v1/connect/site',
		method: 'POST',
		data: draft,
	} );
}

export function disconnect() {
	return apiFetch( {
		path: '/pendulum-arc/v1/connection',
		method: 'DELETE',
	} );
}

export function fetchScores() {
	return apiFetch( { path: '/pendulum-arc/v1/scores' } );
}

export function fetchAnalytics() {
	return apiFetch( { path: '/pendulum-arc/v1/analytics' } );
}

export function fetchReport( service ) {
	return apiFetch( {
		path: `/pendulum-arc/v1/reports/${ encodeURIComponent( service ) }`,
	} );
}

export function fetchRuns() {
	return apiFetch( { path: '/pendulum-arc/v1/runs' } );
}

export function enqueueRun( service ) {
	return apiFetch( {
		path: '/pendulum-arc/v1/runs',
		method: 'POST',
		data: { service },
	} );
}

export function fetchKeyphrases() {
	return apiFetch( { path: '/pendulum-arc/v1/keyphrases' } );
}

export function setKeyphrasesEnabled( enabled ) {
	return apiFetch( {
		path: '/pendulum-arc/v1/keyphrases',
		method: 'POST',
		data: { enabled },
	} );
}

export function syncKeyphrases() {
	return apiFetch( {
		path: '/pendulum-arc/v1/keyphrases/sync',
		method: 'POST',
	} );
}

export function saveConsent( settings ) {
	return apiFetch( {
		path: '/pendulum-arc/v1/consent',
		method: 'POST',
		data: { settings },
	} );
}

export function renewConsent() {
	return apiFetch( {
		path: '/pendulum-arc/v1/consent/renew',
		method: 'POST',
	} );
}

export function resetConsent() {
	return apiFetch( {
		path: '/pendulum-arc/v1/consent/reset',
		method: 'POST',
	} );
}

export function resetConsentStyles() {
	return apiFetch( {
		path: '/pendulum-arc/v1/consent/styles/reset',
		method: 'POST',
	} );
}

export function errorMessage( error, fallback ) {
	if ( error && typeof error.message === 'string' && error.message ) {
		return error.message;
	}
	return fallback;
}

export function fieldErrors( error ) {
	if ( error && error.data && error.data.fields ) {
		return error.data.fields;
	}
	return {};
}
