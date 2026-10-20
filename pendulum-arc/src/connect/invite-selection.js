/**
 * Ids to invite from the page currently on screen.
 *
 * Checked ids from another page are left out. The modal does not keep them.
 *
 * @param {number[]} pageIds    User ids on the page being viewed.
 * @param {number[]} checkedIds Checked ids, which may include another page.
 * @return {number[]} Ids on this page that are checked.
 */
export function inviteIdsToSend( pageIds, checkedIds ) {
	const onPage = new Set( pageIds );
	const seen = new Set();
	const out = [];
	for ( const id of checkedIds ) {
		if ( ! onPage.has( id ) || seen.has( id ) ) {
			continue;
		}
		seen.add( id );
		out.push( id );
	}
	return out;
}
