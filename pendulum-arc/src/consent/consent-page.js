/**
 * WordPress dependencies
 */
import { useEffect, useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { keyphraseAlert, pageAlerts, PageAlerts } from '../alerts/page-alerts';
import {
	errorMessage,
	renewConsent,
	resetConsent,
	resetConsentStyles,
	saveConsent,
} from '../api';
import { ArcButton } from '../ui/button';
import { OpenInArc } from '../ui/open-in-arc';
import { ConsentPreview, PreviewToggle } from './consent-preview';

const TABS = [
	[ 'content', __( 'Content', 'pendulum-arc' ) ],
	[ 'behaviour', __( 'Behaviour', 'pendulum-arc' ) ],
	[ 'layout', __( 'Layout', 'pendulum-arc' ) ],
	[ 'buttons', __( 'Buttons', 'pendulum-arc' ) ],
	[ 'advanced', __( 'Advanced', 'pendulum-arc' ) ],
	[ 'shortcodes', __( 'Shortcodes', 'pendulum-arc' ) ],
];

const POSITIONS = [
	[ 'top-left', __( 'Top left', 'pendulum-arc' ) ],
	[ 'top-center', __( 'Top centre', 'pendulum-arc' ) ],
	[ 'top-right', __( 'Top right', 'pendulum-arc' ) ],
	[ 'middle-left', __( 'Middle left', 'pendulum-arc' ) ],
	[ 'center', __( 'Centre', 'pendulum-arc' ) ],
	[ 'middle-right', __( 'Middle right', 'pendulum-arc' ) ],
	[ 'bottom-left', __( 'Bottom left', 'pendulum-arc' ) ],
	[ 'bottom-center', __( 'Bottom centre', 'pendulum-arc' ) ],
	[ 'bottom-right', __( 'Bottom right', 'pendulum-arc' ) ],
];

const SHORTCODES = [
	{
		code: '[arc_cookie_title]',
		help: __( 'The banner title.', 'pendulum-arc' ),
	},
	{
		code: '[arc_cookie_content]',
		help: __( 'The banner text.', 'pendulum-arc' ),
	},
	{
		code: '[arc_cookie_read_more]',
		help: __( 'The read more text.', 'pendulum-arc' ),
	},
	{
		code: '[arc_cookie_list optional="yes" type="analytics"]',
		help: __(
			'Cookie table. optional="yes" is optional cookies, optional="no" is required. type filters the type text. Leave a parameter out to skip that filter.',
			'pendulum-arc'
		),
	},
	{
		code: '[arc_cookie_accept label="" colour=""]',
		help: __(
			'Accept button. Empty label and colour use the Buttons settings.',
			'pendulum-arc'
		),
	},
	{
		code: '[arc_cookie_decline label="" colour=""]',
		help: __(
			'Decline button. Empty label and colour use the Buttons settings.',
			'pendulum-arc'
		),
	},
	{
		code: '[arc_cookie_read_more_button label="" colour=""]',
		help: __(
			'Read more button. Empty label and colour use the Buttons settings.',
			'pendulum-arc'
		),
	},
];

function readEditor( id ) {
	const editor = window.tinymce && window.tinymce.get( id );
	if ( editor ) {
		return editor.getContent();
	}
	const node = document.getElementById( id );
	return node ? node.value : null;
}

function removeEditor( id ) {
	if ( window.wp && window.wp.editor && window.wp.editor.remove ) {
		window.wp.editor.remove( id );
	}
}

function confirmCopy( kind ) {
	if ( kind === 'renew' ) {
		return __( 'Ask every visitor to choose again?', 'pendulum-arc' );
	}
	if ( kind === 'styles' ) {
		return __(
			'Restore custom styles to the default CSS?',
			'pendulum-arc'
		);
	}
	return __(
		'Reset every cookie setting to the defaults and ask visitors to choose again?',
		'pendulum-arc'
	);
}

function payload( draft ) {
	const next = { ...draft };
	delete next.reopen_icon_url;
	return next;
}

function blankCookie() {
	const bytes = new Uint8Array( 4 );
	window.crypto.getRandomValues( bytes );
	const id =
		'c_' +
		Array.from( bytes, ( byte ) =>
			byte.toString( 16 ).padStart( 2, '0' )
		).join( '' );
	return {
		id,
		catalog_id: '',
		name: '',
		label: '',
		description: '',
		requirement: 'optional',
		type: '',
		scripts: '',
		match: 'exact',
	};
}

function Field( { id, label, help, children } ) {
	return (
		<div className="arc-consent-field">
			<label className="arc-consent-field__label" htmlFor={ id }>
				{ label }
			</label>
			{ children }
			{ help ? (
				<span className="arc-consent-field__help">{ help }</span>
			) : null }
		</div>
	);
}

function Toggle( { label, help, checked, onChange } ) {
	const id = useId();
	return (
		<div className="arc-consent-check">
			<input
				id={ id }
				className="arc-check"
				type="checkbox"
				checked={ !! checked }
				onChange={ ( event ) => onChange( event.target.checked ) }
			/>
			<label htmlFor={ id }>
				<span className="arc-consent-field__label">{ label }</span>
				{ help ? (
					<span className="arc-consent-field__help">{ help }</span>
				) : null }
			</label>
		</div>
	);
}

function Radios( { legend, name, value, options, onChange, help } ) {
	const labelId = useId();
	return (
		<div
			className="arc-consent-field"
			role="radiogroup"
			aria-labelledby={ labelId }
		>
			<span id={ labelId } className="arc-consent-field__label">
				{ legend }
			</span>
			<div className="arc-consent-radio-list">
				{ options.map( ( [ id, label ] ) => (
					<label
						key={ id }
						className="arc-choice"
						htmlFor={ `${ name }-${ id }` }
					>
						<input
							id={ `${ name }-${ id }` }
							className="arc-radio"
							type="radio"
							name={ name }
							value={ id }
							checked={ value === id }
							onChange={ () => onChange( id ) }
						/>
						<span>{ label }</span>
					</label>
				) ) }
			</div>
			{ help ? <p className="arc-consent-note">{ help }</p> : null }
		</div>
	);
}

function ColourField( { label, value, onChange } ) {
	const id = useId();
	const picker = /^#[0-9a-fA-F]{6}$/.test( value ) ? value : '#6b7280';
	return (
		<Field id={ id } label={ label }>
			<span className="arc-consent-colour">
				<input
					type="color"
					value={ picker }
					onChange={ ( event ) => onChange( event.target.value ) }
					aria-label={ label }
				/>
				<input
					id={ id }
					type="text"
					value={ value }
					onChange={ ( event ) => onChange( event.target.value ) }
				/>
			</span>
		</Field>
	);
}

export function ConsentPage( { bootstrap } ) {
	const [ tab, setTab ] = useState( 'content' );
	const [ draft, setDraft ] = useState( bootstrap.consent || {} );
	const [ logs ] = useState( bootstrap.logs || [] );
	const [ notice, setNotice ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const [ confirming, setConfirming ] = useState( '' );
	const [ preview, setPreview ] = useState( false );
	const [ collapsed, setCollapsed ] = useState( false );

	useEffect( () => {
		if ( ! preview || tab !== 'content' ) {
			return undefined;
		}
		const pull = () => {
			const content = readEditor( 'arc-cookie-content' );
			const more = readEditor( 'arc-cookie-read-more' );
			setDraft( ( current ) => {
				const nextContent =
					content === null ? current.content : content;
				const nextMore =
					more === null ? current.read_more_content : more;
				if (
					nextContent === current.content &&
					nextMore === current.read_more_content
				) {
					return current;
				}
				return {
					...current,
					content: nextContent,
					read_more_content: nextMore,
				};
			} );
		};
		pull();
		const timer = window.setInterval( pull, 300 );
		return () => window.clearInterval( timer );
	}, [ preview, tab ] );

	useEffect( () => {
		if ( tab !== 'content' || ! window.wp || ! window.wp.editor ) {
			return undefined;
		}
		const editorSettings = {
			tinymce: {
				wpautop: true,
				height: 180,
				toolbar1: 'bold,italic,link,unlink,bullist,numlist',
			},
			quicktags: true,
			mediaButtons: false,
		};
		window.wp.editor.initialize( 'arc-cookie-content', editorSettings );
		window.wp.editor.initialize( 'arc-cookie-read-more', editorSettings );
		return () => {
			const content = readEditor( 'arc-cookie-content' );
			const more = readEditor( 'arc-cookie-read-more' );
			removeEditor( 'arc-cookie-content' );
			removeEditor( 'arc-cookie-read-more' );
			setDraft( ( current ) => ( {
				...current,
				content: content === null ? current.content : content,
				read_more_content:
					more === null ? current.read_more_content : more,
			} ) );
		};
	}, [ tab ] );

	function patch( key, value ) {
		setDraft( ( current ) => ( { ...current, [ key ]: value } ) );
	}

	function updateCookie( id, key, value ) {
		setDraft( ( current ) => ( {
			...current,
			cookies: ( current.cookies || [] ).map( ( cookie ) =>
				cookie.id === id ? { ...cookie, [ key ]: value } : cookie
			),
		} ) );
	}

	function removeCookie( id ) {
		setDraft( ( current ) => {
			const row = ( current.cookies || [] ).find(
				( cookie ) => cookie.id === id
			);
			const dismissed = [ ...( current.dismissed_catalog_ids || [] ) ];
			if (
				row &&
				row.catalog_id &&
				! dismissed.includes( row.catalog_id )
			) {
				dismissed.push( row.catalog_id );
			}
			return {
				...current,
				cookies: ( current.cookies || [] ).filter(
					( cookie ) => cookie.id !== id
				),
				dismissed_catalog_ids: dismissed,
			};
		} );
	}

	function withEditors( source ) {
		if ( tab !== 'content' ) {
			return source;
		}
		const content = readEditor( 'arc-cookie-content' );
		const more = readEditor( 'arc-cookie-read-more' );
		return {
			...source,
			content: content === null ? source.content : content,
			read_more_content: more === null ? source.read_more_content : more,
		};
	}

	async function run( action, success ) {
		setBusy( true );
		setNotice( null );
		try {
			const response = await action();
			setDraft( response.settings );
			if ( window.tinymce ) {
				const contentEditor =
					window.tinymce.get( 'arc-cookie-content' );
				const moreEditor = window.tinymce.get( 'arc-cookie-read-more' );
				if ( contentEditor ) {
					contentEditor.setContent( response.settings.content || '' );
				}
				if ( moreEditor ) {
					moreEditor.setContent(
						response.settings.read_more_content || ''
					);
				}
			}
			setNotice( { status: 'success', message: success } );
		} catch ( error ) {
			setNotice( {
				status: 'error',
				message: errorMessage(
					error,
					__(
						'Arc could not save the cookie settings.',
						'pendulum-arc'
					)
				),
			} );
		} finally {
			setBusy( false );
		}
	}

	const icon = draft.reopen_icon_url || bootstrap.cookieIcon || '';
	const extras = notice
		? [
				{
					id: 'consent',
					tone: notice.status === 'error' ? 'error' : 'info',
					message: notice.message,
					onDismiss: () => setNotice( null ),
				},
			]
		: [];
	const alerts = pageAlerts(
		bootstrap.alerts,
		extras,
		null,
		keyphraseAlert( bootstrap.urls.connect, false )
	);

	return (
		<div
			className={ `pendulum-arc-screen arc-consent${
				preview ? ' arc-consent--split' : ''
			}` }
		>
			<OpenInArc bootstrap={ bootstrap } />
			<PageAlerts alerts={ alerts } />
			<section className="arc-meta">
				<header className="arc-meta__header">
					<div
						className="arc-consent-tabs"
						role="tablist"
						aria-label={ __( 'GDPR Consent', 'pendulum-arc' ) }
					>
						{ TABS.map( ( [ id, label ] ) => (
							<button
								key={ id }
								type="button"
								role="tab"
								className="arc-consent-tab"
								aria-selected={ tab === id }
								onClick={ () => setTab( id ) }
							>
								{ label }
							</button>
						) ) }
					</div>
					<PreviewToggle
						pressed={ preview }
						onClick={ () => setPreview( ( open ) => ! open ) }
					/>
				</header>
				<div className="arc-meta__body">
					<div className="arc-consent-main">
						{ tab === 'content' ? (
							<div className="arc-consent-panel" role="tabpanel">
								<Field
									id="arc-cookie-title-field"
									label={ __( 'Title', 'pendulum-arc' ) }
								>
									<input
										id="arc-cookie-title-field"
										type="text"
										value={ draft.title || '' }
										onChange={ ( event ) =>
											patch( 'title', event.target.value )
										}
									/>
								</Field>
								<Field
									id="arc-cookie-content"
									label={ __( 'Content', 'pendulum-arc' ) }
								>
									<textarea
										id="arc-cookie-content"
										defaultValue={ draft.content || '' }
									/>
								</Field>
								<Field
									id="arc-cookie-read-more"
									label={ __(
										'Read more content',
										'pendulum-arc'
									) }
								>
									<textarea
										id="arc-cookie-read-more"
										defaultValue={
											draft.read_more_content || ''
										}
									/>
								</Field>
								<p className="arc-consent-note">
									{ __(
										'Known cookies are added when this site is already setting them. Removing one keeps it from coming back until you reset.',
										'pendulum-arc'
									) }
								</p>
								<div className="arc-consent-table-wrap">
									<table className="arc-consent-table">
										<thead>
											<tr>
												<th>
													{ __(
														'Cookie name',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Label',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Description',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Requirement',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Type',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Match',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Scripts',
														'pendulum-arc'
													) }
												</th>
												<th>
													<span className="screen-reader-text">
														{ __(
															'Remove',
															'pendulum-arc'
														) }
													</span>
												</th>
											</tr>
										</thead>
										<tbody>
											{ ( draft.cookies || [] ).map(
												( cookie ) => (
													<tr key={ cookie.id }>
														<td>
															<input
																type="text"
																value={
																	cookie.name
																}
																aria-label={ __(
																	'Cookie name',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'name',
																		event
																			.target
																			.value
																	)
																}
															/>
														</td>
														<td>
															<input
																type="text"
																value={
																	cookie.label
																}
																aria-label={ __(
																	'Label',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'label',
																		event
																			.target
																			.value
																	)
																}
															/>
														</td>
														<td>
															<textarea
																value={
																	cookie.description
																}
																aria-label={ __(
																	'Description',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'description',
																		event
																			.target
																			.value
																	)
																}
															/>
														</td>
														<td>
															<select
																value={
																	cookie.requirement
																}
																aria-label={ __(
																	'Requirement',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'requirement',
																		event
																			.target
																			.value
																	)
																}
															>
																<option value="optional">
																	{ __(
																		'Optional',
																		'pendulum-arc'
																	) }
																</option>
																<option value="required">
																	{ __(
																		'Required',
																		'pendulum-arc'
																	) }
																</option>
															</select>
														</td>
														<td>
															<input
																type="text"
																value={
																	cookie.type
																}
																aria-label={ __(
																	'Type',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'type',
																		event
																			.target
																			.value
																	)
																}
															/>
														</td>
														<td>
															<select
																value={
																	cookie.match
																}
																aria-label={ __(
																	'Match',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'match',
																		event
																			.target
																			.value
																	)
																}
															>
																<option value="exact">
																	{ __(
																		'Exact',
																		'pendulum-arc'
																	) }
																</option>
																<option value="prefix">
																	{ __(
																		'Prefix',
																		'pendulum-arc'
																	) }
																</option>
															</select>
														</td>
														<td>
															<textarea
																value={
																	cookie.scripts
																}
																aria-label={ __(
																	'Scripts',
																	'pendulum-arc'
																) }
																onChange={ (
																	event
																) =>
																	updateCookie(
																		cookie.id,
																		'scripts',
																		event
																			.target
																			.value
																	)
																}
															/>
														</td>
														<td>
															<ArcButton
																variant="danger"
																onClick={ () =>
																	removeCookie(
																		cookie.id
																	)
																}
															>
																{ __(
																	'Remove',
																	'pendulum-arc'
																) }
															</ArcButton>
														</td>
													</tr>
												)
											) }
										</tbody>
									</table>
								</div>
								<p className="arc-consent-note">
									{ __(
										'Cookie name is the name, or the start of the name when Match is Prefix. HttpOnly cookies cannot be deleted by the browser. Scripts are one WordPress script handle or script URL per line. Inline scripts that are not enqueued are not blocked. An empty script list still deletes the cookie when it is refused.',
										'pendulum-arc'
									) }
								</p>
								<div>
									<ArcButton
										onClick={ () =>
											setDraft( ( current ) => ( {
												...current,
												cookies: [
													...( current.cookies ||
														[] ),
													blankCookie(),
												],
											} ) )
										}
									>
										{ __( 'Add cookie', 'pendulum-arc' ) }
									</ArcButton>
								</div>
							</div>
						) : null }
						{ tab === 'behaviour' ? (
							<div className="arc-consent-panel" role="tabpanel">
								<Toggle
									label={ __( 'Disable', 'pendulum-arc' ) }
									help={ __(
										'When on, the site shows no banner and does not change script tags. The other settings stay saved.',
										'pendulum-arc'
									) }
									checked={ draft.disabled }
									onChange={ ( value ) =>
										patch( 'disabled', value )
									}
								/>
								<Radios
									legend={ __(
										'Enable read more',
										'pendulum-arc'
									) }
									name="read_more"
									value={ draft.read_more }
									onChange={ ( value ) =>
										patch( 'read_more', value )
									}
									options={ [
										[
											'modal',
											__( 'Modal', 'pendulum-arc' ),
										],
										[
											'link',
											__( 'Link', 'pendulum-arc' ),
										],
										[ 'no', __( 'No', 'pendulum-arc' ) ],
									] }
								/>
								{ draft.read_more === 'link' ? (
									<Field
										id="arc-cookie-read-more-url"
										label={ __(
											'Read more custom link',
											'pendulum-arc'
										) }
										help={ __(
											'A site path such as /privacy, or a full http(s) address. The cookie table on that page uses the shortcodes.',
											'pendulum-arc'
										) }
									>
										<input
											id="arc-cookie-read-more-url"
											type="text"
											value={ draft.read_more_url || '' }
											onChange={ ( event ) =>
												patch(
													'read_more_url',
													event.target.value
												)
											}
										/>
									</Field>
								) : null }
								<Toggle
									label={ __(
										'Enable cookie table list',
										'pendulum-arc'
									) }
									help={ __(
										'Shows the cookie table in the read more modal. Shortcodes can still print the table on a page.',
										'pendulum-arc'
									) }
									checked={ draft.show_cookie_table }
									onChange={ ( value ) =>
										patch( 'show_cookie_table', value )
									}
								/>
								<Toggle
									label={ __(
										'Reload after Accept button click',
										'pendulum-arc'
									) }
									help={ __(
										'Reloads the page after the visitor clicks Accept.',
										'pendulum-arc'
									) }
									checked={ draft.reload_accept }
									onChange={ ( value ) =>
										patch( 'reload_accept', value )
									}
								/>
								<Toggle
									label={ __(
										'Reload after Decline button click',
										'pendulum-arc'
									) }
									help={ __(
										'Reloads the page after the visitor clicks Decline.',
										'pendulum-arc'
									) }
									checked={ draft.reload_decline }
									onChange={ ( value ) =>
										patch( 'reload_decline', value )
									}
								/>
								<Radios
									legend={ __(
										'After accept or decline',
										'pendulum-arc'
									) }
									name="after_choice"
									value={ draft.after_choice }
									onChange={ ( value ) =>
										patch( 'after_choice', value )
									}
									help={ __(
										'Hide removes the banner and the cookie button. Collapse leaves the cookie button. Remain leaves the banner up.',
										'pendulum-arc'
									) }
									options={ [
										[
											'hide',
											__( 'Hide', 'pendulum-arc' ),
										],
										[
											'collapse',
											__( 'Collapse', 'pendulum-arc' ),
										],
										[
											'remain',
											__( 'Remain', 'pendulum-arc' ),
										],
									] }
								/>
								<Toggle
									label={ __(
										'Enable consent logging',
										'pendulum-arc'
									) }
									help={ __(
										'Stores each accept or decline. The latest rows are on the Advanced tab.',
										'pendulum-arc'
									) }
									checked={ draft.logging_enabled }
									onChange={ ( value ) =>
										patch( 'logging_enabled', value )
									}
								/>
							</div>
						) : null }
						{ tab === 'layout' ? (
							<div className="arc-consent-panel" role="tabpanel">
								<Radios
									legend={ __( 'Layout', 'pendulum-arc' ) }
									name="layout"
									value={ draft.layout }
									onChange={ ( value ) =>
										setDraft( ( current ) => ( {
											...current,
											layout: value,
											placement:
												value === 'static' &&
												current.placement !== 'header'
													? 'footer'
													: current.placement,
										} ) )
									}
									help={
										draft.layout === 'static'
											? __(
													'Static scrolls with the page. Place the bar in the header or the footer.',
													'pendulum-arc'
												)
											: __(
													'Fixed places the banner on the viewport. Choose a cell below.',
													'pendulum-arc'
												)
									}
									options={ [
										[
											'fixed',
											__( 'Fixed', 'pendulum-arc' ),
										],
										[
											'static',
											__( 'Static', 'pendulum-arc' ),
										],
									] }
								/>
								{ draft.layout === 'static' ? (
									<Radios
										legend={ __(
											'Placement',
											'pendulum-arc'
										) }
										name="placement"
										value={
											draft.placement === 'header'
												? 'header'
												: 'footer'
										}
										onChange={ ( value ) =>
											patch( 'placement', value )
										}
										options={ [
											[
												'header',
												__( 'Header', 'pendulum-arc' ),
											],
											[
												'footer',
												__( 'Footer', 'pendulum-arc' ),
											],
										] }
									/>
								) : null }
								{ draft.layout === 'fixed' ? (
									<div className="arc-consent-field">
										<span className="arc-consent-field__label">
											{ __(
												'Fixed position',
												'pendulum-arc'
											) }
										</span>
										<div
											className="arc-consent-grid"
											role="radiogroup"
											aria-label={ __(
												'Fixed position',
												'pendulum-arc'
											) }
										>
											{ POSITIONS.map(
												( [ id, label ] ) => (
													<input
														key={ id }
														className="arc-check"
														type="radio"
														name="fixed_position"
														value={ id }
														checked={
															draft.fixed_position ===
															id
														}
														aria-label={ label }
														onChange={ () =>
															patch(
																'fixed_position',
																id
															)
														}
													/>
												)
											) }
										</div>
										<span className="arc-consent-field__help">
											{ __(
												'Each cell is a place on the screen. The top row sits along the top, the middle row sits halfway down, and the bottom row sits along the bottom. Left, centre, and right follow the columns. The banner stays there while the page scrolls.',
												'pendulum-arc'
											) }
										</span>
									</div>
								) : null }
								<Toggle
									label={ __(
										'Disable styles',
										'pendulum-arc'
									) }
									help={ __(
										'When on, the site prints no cookie CSS, including Custom styles. Class names stay so a theme can style the banner.',
										'pendulum-arc'
									) }
									checked={ draft.disable_styles }
									onChange={ ( value ) =>
										patch( 'disable_styles', value )
									}
								/>
							</div>
						) : null }
						{ tab === 'buttons' ? (
							<div className="arc-consent-panel" role="tabpanel">
								<div className="arc-consent-pair">
									<Field
										id="arc-cookie-accept-label"
										label={ __(
											'Accept label',
											'pendulum-arc'
										) }
									>
										<input
											id="arc-cookie-accept-label"
											type="text"
											value={ draft.accept_label || '' }
											onChange={ ( event ) =>
												patch(
													'accept_label',
													event.target.value
												)
											}
										/>
									</Field>
									<ColourField
										label={ __(
											'Accept colour',
											'pendulum-arc'
										) }
										value={ draft.accept_colour || '' }
										onChange={ ( value ) =>
											patch( 'accept_colour', value )
										}
									/>
								</div>
								<div className="arc-consent-pair">
									<Field
										id="arc-cookie-decline-label"
										label={ __(
											'Decline label',
											'pendulum-arc'
										) }
									>
										<input
											id="arc-cookie-decline-label"
											type="text"
											value={ draft.decline_label || '' }
											onChange={ ( event ) =>
												patch(
													'decline_label',
													event.target.value
												)
											}
										/>
									</Field>
									<ColourField
										label={ __(
											'Decline colour',
											'pendulum-arc'
										) }
										value={ draft.decline_colour || '' }
										onChange={ ( value ) =>
											patch( 'decline_colour', value )
										}
									/>
								</div>
								<div className="arc-consent-pair">
									<Field
										id="arc-cookie-read-more-label"
										label={ __(
											'Read more label',
											'pendulum-arc'
										) }
									>
										<input
											id="arc-cookie-read-more-label"
											type="text"
											value={
												draft.read_more_label || ''
											}
											onChange={ ( event ) =>
												patch(
													'read_more_label',
													event.target.value
												)
											}
										/>
									</Field>
									<ColourField
										label={ __(
											'Read more colour',
											'pendulum-arc'
										) }
										value={ draft.read_more_colour || '' }
										onChange={ ( value ) =>
											patch( 'read_more_colour', value )
										}
									/>
								</div>
								<div className="arc-consent-field">
									<span className="arc-consent-field__label">
										{ __(
											'Collapsed button icon',
											'pendulum-arc'
										) }
									</span>
									<div className="arc-consent-icon">
										{ icon ? (
											<img
												src={ icon }
												alt=""
												width="40"
												height="40"
											/>
										) : null }
										<ArcButton
											onClick={ () => {
												if (
													! window.wp ||
													! window.wp.media
												) {
													return;
												}
												const frame = window.wp.media( {
													title: __(
														'Cookie button icon',
														'pendulum-arc'
													),
													button: {
														text: __(
															'Use this icon',
															'pendulum-arc'
														),
													},
													multiple: false,
													library: { type: 'image' },
												} );
												frame.on( 'select', () => {
													const file = frame
														.state()
														.get( 'selection' )
														.first()
														.toJSON();
													const thumb =
														file.sizes &&
														file.sizes.thumbnail
															? file.sizes
																	.thumbnail
																	.url
															: file.url;
													setDraft( ( current ) => ( {
														...current,
														reopen_icon_id: file.id,
														reopen_icon_url: thumb,
													} ) );
												} );
												frame.open();
											} }
										>
											{ __(
												'Select icon',
												'pendulum-arc'
											) }
										</ArcButton>
										{ draft.reopen_icon_id ? (
											<ArcButton
												onClick={ () =>
													setDraft( ( current ) => ( {
														...current,
														reopen_icon_id: 0,
														reopen_icon_url: '',
													} ) )
												}
											>
												{ __(
													'Use default icon',
													'pendulum-arc'
												) }
											</ArcButton>
										) : null }
									</div>
									<p className="arc-consent-note">
										{ __(
											'Empty uses the cookie icon shipped with Arc.',
											'pendulum-arc'
										) }
									</p>
								</div>
							</div>
						) : null }
						{ tab === 'advanced' ? (
							<div className="arc-consent-panel" role="tabpanel">
								<Field
									id="arc-cookie-custom-css"
									label={ __(
										'Custom styles',
										'pendulum-arc'
									) }
									help={ __(
										'This CSS is what the site prints, unless Disable styles is on.',
										'pendulum-arc'
									) }
								>
									<textarea
										id="arc-cookie-custom-css"
										value={ draft.custom_css || '' }
										onChange={ ( event ) =>
											patch(
												'custom_css',
												event.target.value
											)
										}
										rows={ 16 }
									/>
								</Field>
								<div className="arc-consent-actions">
									<ArcButton
										variant="danger"
										disabled={ busy }
										onClick={ () =>
											setConfirming( 'renew' )
										}
									>
										{ __(
											'Renew consent',
											'pendulum-arc'
										) }
									</ArcButton>
									<ArcButton
										variant="danger"
										disabled={ busy }
										onClick={ () =>
											setConfirming( 'reset' )
										}
									>
										{ __( 'Reset', 'pendulum-arc' ) }
									</ArcButton>
									<ArcButton
										variant="danger"
										disabled={ busy }
										onClick={ () =>
											setConfirming( 'styles' )
										}
									>
										{ __( 'Reset styles', 'pendulum-arc' ) }
									</ArcButton>
								</div>
								{ confirming ? (
									<div className="arc-consent-confirm">
										<p>{ confirmCopy( confirming ) }</p>
										<div className="arc-consent-actions">
											<ArcButton
												variant="danger"
												disabled={ busy }
												onClick={ () => {
													const kind = confirming;
													setConfirming( '' );
													if ( kind === 'renew' ) {
														run(
															renewConsent,
															__(
																'Consent version updated. Visitors will be asked again.',
																'pendulum-arc'
															)
														);
														return;
													}
													if ( kind === 'styles' ) {
														run(
															resetConsentStyles,
															__(
																'Custom styles restored to the default CSS.',
																'pendulum-arc'
															)
														);
														return;
													}
													run(
														resetConsent,
														__(
															'Settings reset. Visitors will be asked again.',
															'pendulum-arc'
														)
													);
												} }
											>
												{ __(
													'Confirm',
													'pendulum-arc'
												) }
											</ArcButton>
											<ArcButton
												disabled={ busy }
												onClick={ () =>
													setConfirming( '' )
												}
											>
												{ __(
													'Cancel',
													'pendulum-arc'
												) }
											</ArcButton>
										</div>
									</div>
								) : null }
								<Toggle
									label={ __(
										'Disable identifiable data points',
										'pendulum-arc'
									) }
									help={ __(
										'When on, new log rows do not store an IP address or user agent. Rows already stored are left as they are.',
										'pendulum-arc'
									) }
									checked={ draft.disable_identifiable }
									onChange={ ( value ) =>
										patch( 'disable_identifiable', value )
									}
								/>
								<div className="arc-consent-log-wrap">
									<table className="arc-consent-log">
										<thead>
											<tr>
												<th>
													{ __(
														'Time (UTC)',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Version',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Allowed',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'Refused',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'IP',
														'pendulum-arc'
													) }
												</th>
												<th>
													{ __(
														'User agent',
														'pendulum-arc'
													) }
												</th>
											</tr>
										</thead>
										<tbody>
											{ logs.length ? (
												logs.map( ( row ) => (
													<tr key={ row.id }>
														<td>
															{ row.created_gmt }
														</td>
														<td>
															{
																row.consent_version
															}
														</td>
														<td>
															{ (
																row.allowed ||
																[]
															).join( ', ' ) }
														</td>
														<td>
															{ (
																row.refused ||
																[]
															).join( ', ' ) }
														</td>
														<td>
															{ row.ip || '-' }
														</td>
														<td>
															{ row.user_agent ||
																'-' }
														</td>
													</tr>
												) )
											) : (
												<tr>
													<td colSpan={ 6 }>
														{ __(
															'No consent has been logged.',
															'pendulum-arc'
														) }
													</td>
												</tr>
											) }
										</tbody>
									</table>
								</div>
							</div>
						) : null }
						{ tab === 'shortcodes' ? (
							<div className="arc-consent-panel" role="tabpanel">
								{ SHORTCODES.map( ( item ) => (
									<div
										className="arc-consent-shortcode"
										key={ item.code }
									>
										<div>
											<code>{ item.code }</code>
											<p className="arc-consent-note">
												{ item.help }
											</p>
										</div>
										<ArcButton
											onClick={ () => {
												if (
													navigator.clipboard &&
													navigator.clipboard
														.writeText
												) {
													navigator.clipboard.writeText(
														item.code
													);
													setNotice( {
														status: 'success',
														message: __(
															'Copied.',
															'pendulum-arc'
														),
													} );
												}
											} }
										>
											{ __( 'Copy', 'pendulum-arc' ) }
										</ArcButton>
									</div>
								) ) }
							</div>
						) : null }
					</div>
					{ preview ? (
						<ConsentPreview
							draft={ draft }
							icon={ icon }
							collapsed={ collapsed }
							onCollapse={ () => setCollapsed( true ) }
							onOpen={ () => setCollapsed( false ) }
						/>
					) : null }
				</div>
			</section>
			{ tab !== 'shortcodes' ? (
				<div className="arc-consent-actions">
					<ArcButton
						variant="connect"
						busy={ busy }
						disabled={ busy }
						onClick={ () =>
							run(
								() =>
									saveConsent(
										payload( withEditors( draft ) )
									),
								__( 'Settings saved.', 'pendulum-arc' )
							)
						}
					>
						{ __( 'Save settings', 'pendulum-arc' ) }
					</ArcButton>
				</div>
			) : null }
		</div>
	);
}
