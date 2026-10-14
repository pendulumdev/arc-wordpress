/**
 * WordPress dependencies
 */
import { Modal, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ArcButton } from '../ui/button';

export function CreateSiteModal( {
	draft,
	projects,
	fieldErrors,
	busy,
	onChange,
	onCancel,
	onSubmit,
} ) {
	const projectOptions = ( projects || [] ).map( ( project ) => ( {
		label: project.name,
		value: project.id,
	} ) );

	return (
		<Modal
			title={ __( 'Add this site to Arc', 'pendulum-arc' ) }
			onRequestClose={ busy ? () => {} : onCancel }
			className="pendulum-arc-modal"
		>
			<p>
				{ __(
					'No Arc site uses this address yet. Confirm the details and Arc will add it to the project you choose.',
					'pendulum-arc'
				) }
			</p>
			<div className="arc-fields">
				<TextControl
					label={ __( 'Site name', 'pendulum-arc' ) }
					value={ draft.name }
					onChange={ ( name ) => onChange( { name } ) }
					help={
						fieldErrors.name ||
						__(
							'Filled from the WordPress site title.',
							'pendulum-arc'
						)
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<TextControl
					label={ __( 'Site URL', 'pendulum-arc' ) }
					value={ draft.baseUrl }
					type="url"
					onChange={ ( baseUrl ) => onChange( { baseUrl } ) }
					help={ fieldErrors.baseUrl || '' }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ projectOptions.length > 1 && (
					<SelectControl
						label={ __( 'Project', 'pendulum-arc' ) }
						value={ draft.projectId }
						options={ [
							{
								label: __( 'Choose a project', 'pendulum-arc' ),
								value: '',
							},
							...projectOptions,
						] }
						onChange={ ( projectId ) => onChange( { projectId } ) }
						help={ fieldErrors.projectId || '' }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
				{ projectOptions.length === 1 && (
					<p>
						{ __( 'Project:', 'pendulum-arc' ) }{ ' ' }
						{ projectOptions[ 0 ].label }
					</p>
				) }
			</div>
			<div className="pendulum-arc-modal__actions">
				<ArcButton onClick={ onCancel } disabled={ busy }>
					{ __( 'Cancel', 'pendulum-arc' ) }
				</ArcButton>
				<ArcButton busy={ busy } onClick={ onSubmit }>
					{ __( 'Create site and connect', 'pendulum-arc' ) }
				</ArcButton>
			</div>
		</Modal>
	);
}
