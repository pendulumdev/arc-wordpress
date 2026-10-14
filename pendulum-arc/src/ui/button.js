/**
 * Portal button. Secondary is the default. Danger is the red cancel variant.
 *
 * @param {Object}                                      props
 * @param {string}                                      [props.href]     Renders an anchor when set.
 * @param {string}                                      [props.type]     Button type. Ignored when href is set.
 * @param {'primary'|'secondary'|'connect'|'danger'}    [props.variant]
 * @param {boolean}                                     [props.disabled]
 * @param {boolean}                                     [props.busy]
 * @param {(event: import('react').MouseEvent) => void} [props.onClick]
 * @param {import('react').ReactNode}                   props.children
 */
export function ArcButton( {
	href,
	type = 'button',
	variant = 'secondary',
	disabled,
	busy,
	onClick,
	children,
} ) {
	const className = `arc-button arc-button--${ variant }`;
	if ( href ) {
		return (
			<a className={ className } href={ href }>
				{ children }
			</a>
		);
	}
	return (
		<button
			className={ className }
			type={ type }
			disabled={ disabled || busy }
			aria-busy={ busy ? 'true' : undefined }
			onClick={ onClick }
		>
			{ children }
		</button>
	);
}
