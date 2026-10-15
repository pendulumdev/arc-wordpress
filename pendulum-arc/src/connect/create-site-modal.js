/**
 * WordPress dependencies
 */
import { Modal, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ArcButton } from '../ui/button';
import { ErrorAlert } from '../ui/error-alert';

export function CreateSiteModal( {
	draft,
	projects,
	fieldErrors,
	error,
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
			{ error ? <ErrorAlert message={ error } /> : null }
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
					className={
						fieldErrors.name ? 'arc-field--error' : undefined
					}
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
					className={
						fieldErrors.baseUrl ? 'arc-field--error' : undefined
					}
					onChange={ ( baseUrl ) => onChange( { baseUrl } ) }
					help={ fieldErrors.baseUrl || '' }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ projectOptions.length > 0 && (
					<SelectControl
						label={ __( 'Project', 'pendulum-arc' ) }
						value={
							draft.projectId ||
							( projectOptions.length === 1
								? projectOptions[ 0 ].value
								: '' )
						}
						options={
							projectOptions.length === 1
								? projectOptions
								: [
										{
											label: __(
												'Choose a project',
												'pendulum-arc'
											),
											value: '',
										},
										...projectOptions,
									]
						}
						className={
							fieldErrors.projectId
								? 'arc-field--error'
								: undefined
						}
						onChange={ ( projectId ) => onChange( { projectId } ) }
						help={ fieldErrors.projectId || '' }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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
