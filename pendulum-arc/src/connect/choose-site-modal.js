/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ArcButton } from '../ui/button';

export function ChooseSiteModal( { matches, busy, onChoose, onCancel } ) {
	return (
		<Modal
			title={ __( 'Choose the Arc site', 'pendulum-arc' ) }
			onRequestClose={ busy ? () => {} : onCancel }
			className="pendulum-arc-modal"
		>
			<p>
				{ __(
					'More than one Arc site uses this address. Choose which one this WordPress install should use.',
					'pendulum-arc'
				) }
			</p>
			<ul className="pendulum-arc-matches">
				{ matches.map( ( site ) => (
					<li key={ site.id }>
						<ArcButton
							busy={ busy }
							onClick={ () => onChoose( site.id ) }
						>
							{ site.name || site.baseUrl }
						</ArcButton>
						<span className="pendulum-arc-matches__url">
							{ site.baseUrl }
						</span>
					</li>
				) ) }
			</ul>
			<div className="pendulum-arc-modal__actions">
				<ArcButton onClick={ onCancel } disabled={ busy }>
					{ __( 'Cancel', 'pendulum-arc' ) }
				</ArcButton>
			</div>
		</Modal>
	);
}
