/**
 * Which setup steps are complete.
 *
 * Install is complete on this screen because the plugin is running.
 * Analytics and Invite stay open until the site is paired.
 *
 * @param {{connected?: boolean, analytics?: boolean, invited?: boolean}} [flags] Known step results.
 * @return {{install: boolean, connect: boolean, analytics: boolean, invite: boolean}} Done flags.
 */
export function setupProgress( flags = {} ) {
	const connected = Boolean( flags.connected );
	return {
		install: true,
		connect: connected,
		analytics: connected && Boolean( flags.analytics ),
		invite: connected && Boolean( flags.invited ),
	};
}

/**
 * Analytics is ticked when this site has a Google connection.
 * Ready (no setup gap) and assign_site both have one. connect_google
 * and not_enabled do not. A failed scores read does not count.
 *
 * @param {{scores?: Array<{service?: string, setup?: string|null}>, error?: string|null}|null} result Scores response.
 * @return {boolean} Whether Analytics has a Google connection.
 */
export function analyticsLinked( result ) {
	if ( ! result || result.error ) {
		return false;
	}
	const scores = Array.isArray( result.scores ) ? result.scores : [];
	const row = scores.find( ( item ) => item && item.service === 'analytics' );
	if ( ! row || ! Object.prototype.hasOwnProperty.call( row, 'setup' ) ) {
		return false;
	}
	return row.setup === null || row.setup === 'assign_site';
}

/**
 * Invite is ticked when any listed person has an Arc account and is on this project.
 *
 * @param {Array<{status?: string, account?: string}>|null|undefined} users Administrator rows.
 * @return {boolean} Whether any row is a project member with an Arc account.
 */
export function accountOnProject( users ) {
	return ( users || [] ).some(
		( user ) =>
			Boolean( user ) &&
			user.status === 'member' &&
			user.account === 'active'
	);
}

/**
 * Walks administrator pages until one member with an Arc account is found.
 *
 * @param {(page: number) => Promise<{users?: Array<{status?: string, account?: string}>, total?: number, pageSize?: number, reconnect?: boolean}>} loadPage One page of administrators.
 * @return {Promise<boolean>} Whether a later page found a member with an Arc account.
 */
export async function findAccountOnProject( loadPage ) {
	for ( let page = 1; page <= 5; page++ ) {
		const result = await loadPage( page );
		if ( ! result || result.reconnect ) {
			return false;
		}
		if ( accountOnProject( result.users ) ) {
			return true;
		}
		const total = Number( result.total ) || 0;
		const pageSize = Number( result.pageSize ) || 100;
		if ( page * pageSize >= total ) {
			return false;
		}
	}
	return false;
}

/**
 * The single step that can be started. A ticked step is not a link.
 * A step that is still being checked is not a link, and neither is anything after it.
 *
 * @param {{connect: boolean, analytics: boolean, invite: boolean}} progress  Done flags.
 * @param {{analytics?: boolean, invite?: boolean}}                 [pending] Steps still loading.
 * @return {'connect'|'analytics'|'invite'|null} The current action, or null.
 */
export function currentSetupAction( progress, pending = {} ) {
	if ( ! progress.connect ) {
		return 'connect';
	}
	if ( pending.analytics ) {
		return null;
	}
	if ( ! progress.analytics ) {
		return 'analytics';
	}
	if ( pending.invite ) {
		return null;
	}
	if ( ! progress.invite ) {
		return 'invite';
	}
	return null;
}
