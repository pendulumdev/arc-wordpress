/**
 * Stroke icon in the Lucide 24 view box the portal score cards use.
 *
 * @param {Object}                    props
 * @param {number}                    [props.size]
 * @param {number}                    [props.strokeWidth]
 * @param {import('react').ReactNode} props.children
 */
export function Icon( { size = 13, strokeWidth = 2.25, children } ) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ size }
			height={ size }
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={ strokeWidth }
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{ children }
		</svg>
	);
}
