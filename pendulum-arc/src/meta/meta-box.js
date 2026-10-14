/**
 * Internal dependencies
 */
import { Icon } from '../ui/icon';

function BoxIcon( { name } ) {
	if ( name === 'key' ) {
		return (
			<Icon size={ 16 } strokeWidth={ 2 }>
				<circle cx="7.5" cy="15.5" r="5.5" />
				<path d="m21 2-9.6 9.6" />
				<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
			</Icon>
		);
	}
	if ( name === 'user' ) {
		return (
			<Icon size={ 16 } strokeWidth={ 2 }>
				<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</Icon>
		);
	}
	if ( name === 'reports' ) {
		return (
			<Icon size={ 16 } strokeWidth={ 2 }>
				<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
				<path d="M14 2v4a2 2 0 0 0 2 2h4" />
				<path d="M10 9H8" />
				<path d="M16 13H8" />
				<path d="M16 17H8" />
			</Icon>
		);
	}
	return (
		<Icon size={ 16 } strokeWidth={ 2 }>
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</Icon>
	);
}

/**
 * Arc panel. `icon` is link, key, user, or reports.
 *
 * @param {Object}                        props
 * @param {string}                        props.title
 * @param {'link'|'key'|'user'|'reports'} [props.icon]
 * @param {string}                        [props.description]
 * @param {import('react').ReactNode}     props.children
 * @param {import('react').ReactNode}     [props.footer]
 */
export function MetaBox( {
	title,
	icon = 'link',
	description,
	children,
	footer,
} ) {
	return (
		<section className="arc-meta">
			<header className="arc-meta__header">
				<span className="arc-meta__icon" aria-hidden="true">
					<BoxIcon name={ icon } />
				</span>
				<h2 className="arc-meta__title">{ title }</h2>
			</header>
			<div className="arc-meta__body">
				{ description ? (
					<p className="arc-meta__description">{ description }</p>
				) : null }
				{ children }
				{ footer ? (
					<div className="arc-meta__footer">{ footer }</div>
				) : null }
			</div>
		</section>
	);
}
