/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { MetaBox } from '../meta';
import { ArcButton } from '../ui/button';
import { Icon } from '../ui/icon';
import { InviteModal } from './invite-modal';

/**
 * Recommends inviting administrators. Invite stays off until the site is paired.
 *
 * @param {Object}                                 props
 * @param {'connected'|'reconnect'|'disconnected'} props.mode
 */
export function InviteBox( { mode } ) {
	const [ open, setOpen ] = useState( false );
	const connected = mode === 'connected';
	let description = __(
		'This site is not connected. Connect it before inviting administrators.',
		'pendulum-arc'
	);
	if ( mode === 'reconnect' ) {
		description = __(
			'Reconnect this site before inviting administrators.',
			'pendulum-arc'
		);
	}
	if ( connected ) {
		description = __(
			'Choose administrators to invite onto this Arc project. An invited person becomes a member of this project in Arc. They can open every site on the project, view its reports, and generate new ones. They cannot invite other people, change the plan, or remove sites.',
			'pendulum-arc'
		);
	}

	return (
		<MetaBox
			icon="user"
			title={ __( 'Invite', 'pendulum-arc' ) }
			description={ description }
			footer={
				<ArcButton
					variant="connect"
					disabled={ ! connected }
					icon={
						<Icon size={ 18 } strokeWidth={ 2 }>
							<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</Icon>
					}
					onClick={ () => setOpen( true ) }
				>
					{ __( 'Invite', 'pendulum-arc' ) }
				</ArcButton>
			}
		>
			{ open && connected ? (
				<InviteModal onClose={ () => setOpen( false ) } />
			) : null }
		</MetaBox>
	);
}
