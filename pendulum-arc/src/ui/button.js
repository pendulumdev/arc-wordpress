/**
 * Portal button. Secondary is the default. Danger is the red cancel variant.
 *
 * @param {Object}                                      props
 * @param {string}                                      [props.href]     Renders an anchor when set.
 * @param {string}                                      [props.type]     Button type. Ignored when href is set.
 * @param {'primary'|'secondary'|'connect'|'danger'}    [props.variant]
 * @param {boolean}                                     [props.disabled]
 * @param {boolean}                                     [props.busy]
 * @param {string}                                      [props.mark]     Logo shown in a left segment.
 * @param {(event: import('react').MouseEvent) => void} [props.onClick]
 * @param {import('react').ReactNode}                   props.children
 */
export function ArcButton( {
	href,
	type = 'button',
	variant = 'secondary',
	disabled,
	busy,
	mark,
	onClick,
	children,
} ) {
	const className = mark
		? `arc-button arc-button--${ variant } arc-button--marked`
		: `arc-button arc-button--${ variant }`;
	const inner = mark ? (
		<>
			<span className="arc-button__mark">
				<img src={ mark } alt="" width="18" height="18" />
			</span>
			{ children }
		</>
	) : (
		children
	);
	if ( href ) {
		return (
			<a className={ className } href={ href }>
				{ inner }
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
			{ inner }
		</button>
	);
}
