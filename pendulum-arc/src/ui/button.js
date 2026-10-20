/**
 * Portal button. Secondary is the default. Danger is the red cancel variant.
 *
 * @param {Object}                                      props
 * @param {string}                                      [props.href]      Renders an anchor when set.
 * @param {string}                                      [props.type]      Button type. Ignored when href is set.
 * @param {'primary'|'secondary'|'connect'|'danger'}    [props.variant]
 * @param {boolean}                                     [props.disabled]
 * @param {boolean}                                     [props.busy]
 * @param {string}                                      [props.mark]      Logo shown in the left segment.
 * @param {import('react').ReactNode}                   [props.icon]      Icon shown in the same left segment.
 * @param {string}                                      [props.className]
 * @param {(event: import('react').MouseEvent) => void} [props.onClick]
 * @param {string}                                      [props.ariaLabel]
 * @param {boolean}                                     [props.pressed]
 * @param {import('react').ReactNode}                   props.children
 */
export function ArcButton( {
	href,
	type = 'button',
	variant = 'secondary',
	disabled,
	busy,
	mark,
	icon,
	className,
	onClick,
	ariaLabel,
	pressed,
	children,
	...rest
} ) {
	const marked = Boolean( mark || icon );
	const classes = [
		'arc-button',
		`arc-button--${ variant }`,
		marked ? 'arc-button--marked' : '',
		className || '',
	]
		.filter( Boolean )
		.join( ' ' );
	const inner = marked ? (
		<>
			<span className="arc-button__mark">
				{ mark ? (
					<img src={ mark } alt="" width="18" height="18" />
				) : (
					icon
				) }
			</span>
			{ children }
		</>
	) : (
		children
	);
	if ( href ) {
		return (
			<a
				{ ...rest }
				className={ classes }
				href={ href }
				onClick={ onClick }
			>
				{ inner }
			</a>
		);
	}
	return (
		<button
			{ ...rest }
			className={ classes }
			type={ type }
			disabled={ disabled || busy }
			aria-busy={ busy ? 'true' : rest[ 'aria-busy' ] }
			aria-label={ ariaLabel }
			aria-pressed={ pressed }
			onClick={ onClick }
		>
			{ inner }
		</button>
	);
}
