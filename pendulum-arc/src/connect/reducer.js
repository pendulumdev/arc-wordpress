export function initialConnectState( pending ) {
	const base = {
		phase: 'idle',
		error: '',
		fieldErrors: {},
		draft: null,
		projects: [],
		matches: [],
		portalUrl: '',
	};
	if ( ! pending || ! pending.status ) {
		return base;
	}
	if ( pending.status === 'needs_site' ) {
		return {
			...base,
			phase: 'needs_site',
			draft: pending.draft || { name: '', baseUrl: '', projectId: '' },
			projects: pending.projects || [],
		};
	}
	if ( pending.status === 'choose_site' ) {
		return {
			...base,
			phase: 'choose_site',
			matches: pending.matches || [],
		};
	}
	if ( pending.status === 'needs_project' ) {
		return {
			...base,
			phase: 'needs_project',
			portalUrl: pending.portalUrl || '',
		};
	}
	return base;
}

export function connectReducer( state, action ) {
	switch ( action.type ) {
		case 'verify-start':
			return { ...state, phase: 'verifying', error: '', fieldErrors: {} };
		case 'create-start':
			return { ...state, phase: 'creating', error: '', fieldErrors: {} };
		case 'pair-start':
			return { ...state, phase: 'pairing', error: '' };
		case 'verify-result':
			return resultState( state, action.result );
		case 'verify-error':
		case 'pair-error':
			return { ...state, phase: 'idle', error: action.message };
		case 'draft':
			return {
				...state,
				draft: { ...( state.draft || {} ), ...action.patch },
				fieldErrors: {},
			};
		case 'create-error':
			return {
				...state,
				phase: 'needs_site',
				error: action.message,
				fieldErrors: action.fieldErrors || {},
			};
		case 'dismiss':
			return { ...state, phase: 'idle', error: '' };
		default:
			return state;
	}
}

function resultState( state, result ) {
	if ( ! result ) {
		return { ...state, phase: 'idle' };
	}
	if ( result.status === 'connected' ) {
		return { ...state, phase: 'connected', error: '' };
	}
	if ( result.status === 'needs_site' ) {
		return {
			...state,
			phase: 'needs_site',
			error: '',
			fieldErrors: {},
			draft: result.draft,
			projects: result.projects || [],
		};
	}
	if ( result.status === 'choose_site' ) {
		return {
			...state,
			phase: 'choose_site',
			error: '',
			matches: result.matches || [],
		};
	}
	if ( result.status === 'needs_project' ) {
		return {
			...state,
			phase: 'needs_project',
			error: '',
			portalUrl: result.portalUrl || '',
		};
	}
	return { ...state, phase: 'idle', error: result.message || '' };
}
