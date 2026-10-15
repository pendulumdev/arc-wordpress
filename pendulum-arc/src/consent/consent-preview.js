/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { Icon } from '../ui/icon';

/**
 * Keeps the sample banner in the column. Author CSS can pin the real
 * banner to the viewport; this preview never does.
 */
const CONTAIN =
	'.arc-consent-preview .arc-cookie,' +
	'.arc-consent-preview .arc-cookie__reopen,' +
	'.arc-consent-preview .arc-cookie__dialog{' +
	'position:static !important;inset:auto !important;top:auto !important;' +
	'right:auto !important;bottom:auto !important;left:auto !important;' +
	'transform:none !important;z-index:auto !important;' +
	'max-width:none !important;max-height:none !important;' +
	'margin:0 0 1rem !important}' +
	'.arc-consent-preview .arc-cookie,' +
	'.arc-consent-preview .arc-cookie__dialog{width:auto !important}' +
	'.arc-consent-preview .arc-cookie__reopen{width:3rem !important;height:3rem !important}';

/**
 * Preview switch in the card header.
 *
 * @param {Object}     props
 * @param {boolean}    props.pressed
 * @param {() => void} props.onClick
 */
export function PreviewToggle( { pressed, onClick } ) {
	return (
		<button
			type="button"
			className="arc-consent-preview-toggle"
			aria-pressed={ pressed }
			onClick={ onClick }
		>
			<Icon size={ 16 } strokeWidth={ 2 }>
				<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
				<circle cx="12" cy="12" r="3" />
			</Icon>
			{ __( 'Preview', 'pendulum-arc' ) }
		</button>
	);
}

/**
 * Static sample of the banner, the read more copy, and the cookie table.
 * Accept and Decline collapse the banner to the icon. The icon opens it.
 *
 * @param {Object}     props
 * @param {Object}     props.draft
 * @param {string}     props.icon
 * @param {boolean}    props.collapsed
 * @param {() => void} props.onCollapse
 * @param {() => void} props.onOpen
 */
export function ConsentPreview( {
	draft,
	icon,
	collapsed,
	onCollapse,
	onOpen,
} ) {
	const cookies = Array.isArray( draft.cookies ) ? draft.cookies : [];
	const css = draft.disable_styles
		? CONTAIN
		: `${ draft.custom_css || '' }${ CONTAIN }`.replace( /<\/style/gi, '' );
	const colours = {
		'--arc-cookie-accept': draft.accept_colour || '#1a9bb8',
		'--arc-cookie-decline': draft.decline_colour || '#6b7280',
		'--arc-cookie-more': draft.read_more_colour || '#6b7280',
	};

	return (
		<aside
			className="arc-consent-preview"
			aria-label={ __( 'Preview', 'pendulum-arc' ) }
		>
			<style>{ css }</style>
			<div className="arc-cookie-root" style={ colours }>
				{ collapsed ? (
					<button
						type="button"
						className={ reopenClass( draft ) }
						aria-label={
							draft.title || __( 'Cookies', 'pendulum-arc' )
						}
						onClick={ onOpen }
					>
						<img src={ icon } alt="" width="22" height="22" />
					</button>
				) : (
					<div className={ bannerClass( draft ) } role="region">
						<h2 className="arc-cookie__title">{ draft.title }</h2>
						<div
							className="arc-cookie__content"
							dangerouslySetInnerHTML={ {
								__html: draft.content || '',
							} }
						/>
						<div className="arc-cookie__actions">
							<button
								type="button"
								className="arc-cookie__button arc-cookie__button--accept"
								onClick={ onCollapse }
							>
								{ draft.accept_label }
							</button>
							<button
								type="button"
								className="arc-cookie__button arc-cookie__button--decline"
								onClick={ onCollapse }
							>
								{ draft.decline_label }
							</button>
							<ReadMore draft={ draft } />
						</div>
					</div>
				) }
				<div className="arc-cookie__dialog">
					<div
						className="arc-cookie__content"
						dangerouslySetInnerHTML={ {
							__html: draft.read_more_content || '',
						} }
					/>
					<CookieTable cookies={ cookies } />
				</div>
			</div>
		</aside>
	);
}

function bannerClass( draft ) {
	if ( draft.layout === 'static' ) {
		const place = draft.placement === 'header' ? 'header' : 'footer';
		return `arc-cookie arc-cookie--${ place } arc-cookie--static`;
	}
	return `arc-cookie arc-cookie--fixed arc-cookie--pos-${
		draft.fixed_position || 'bottom-left'
	}`;
}

function reopenClass( draft ) {
	if ( draft.layout === 'static' ) {
		const place = draft.placement === 'header' ? 'header' : 'footer';
		return `arc-cookie__reopen arc-cookie--${ place }`;
	}
	return `arc-cookie__reopen arc-cookie--pos-${
		draft.fixed_position || 'bottom-left'
	}`;
}

function ReadMore( { draft } ) {
	if ( draft.read_more === 'no' ) {
		return null;
	}
	if ( draft.read_more === 'link' && draft.read_more_url ) {
		return (
			<a
				className="arc-cookie__button arc-cookie__button--more"
				href={ draft.read_more_url }
				onClick={ ( event ) => event.preventDefault() }
			>
				{ draft.read_more_label }
			</a>
		);
	}
	if ( draft.read_more === 'link' ) {
		return null;
	}
	return (
		<button
			type="button"
			className="arc-cookie__button arc-cookie__button--more"
		>
			{ draft.read_more_label }
		</button>
	);
}

function CookieTable( { cookies } ) {
	return (
		<table className="arc-cookie__table">
			<thead>
				<tr>
					<th scope="col">{ __( 'Choice', 'pendulum-arc' ) }</th>
					<th scope="col">{ __( 'Cookie', 'pendulum-arc' ) }</th>
					<th scope="col">{ __( 'About', 'pendulum-arc' ) }</th>
					<th scope="col">{ __( 'Type', 'pendulum-arc' ) }</th>
				</tr>
			</thead>
			<tbody>
				{ cookies.map( ( row ) => (
					<tr key={ row.id }>
						<td>
							{ row.requirement === 'optional' ? (
								<input
									className="arc-cookie__choice"
									type="checkbox"
									defaultChecked
									aria-label={ row.label || row.name }
								/>
							) : (
								__( 'Required', 'pendulum-arc' )
							) }
						</td>
						<td>
							<span className="arc-cookie__name">
								{ row.label }
							</span>
							<span className="arc-cookie__cookie">
								{ row.name }
							</span>
						</td>
						<td>{ row.description }</td>
						<td>{ row.type }</td>
					</tr>
				) ) }
			</tbody>
		</table>
	);
}
