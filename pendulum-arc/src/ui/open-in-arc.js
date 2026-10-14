/**
 * WordPress dependencies
 */
import { createPortal } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ArcButton } from './button';

/**
 * Open in Arc, portaled into the page title row.
 *
 * @param {Object} props
 * @param {Object} props.bootstrap
 */
export function OpenInArc( { bootstrap } ) {
	const connection = bootstrap.connection || {};
	const portalUrl =
		connection.portalUrl || ( bootstrap.urls && bootstrap.urls.portal );
	const actions = document.getElementById( 'pendulum-arc-title-actions' );
	if ( ! actions || ! portalUrl ) {
		return null;
	}
	return createPortal(
		<ArcButton href={ portalUrl } variant="connect">
			{ __( 'Open in Arc', 'pendulum-arc' ) }
		</ArcButton>,
		actions
	);
}
