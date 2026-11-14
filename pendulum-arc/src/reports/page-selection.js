/**
 * WordPress dependencies
 */
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from '@wordpress/element';

const PageSelectionContext = createContext( null );

/**
 * Selected page URLs for recrawl. The set survives paging.
 * Checkbox keys stay the row id. The stored value is the page URL.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function PageSelectionProvider( { children } ) {
	const [ byService, setByService ] = useState( {} );

	const urlsFor = useCallback(
		( service ) => byService[ service ] || [],
		[ byService ]
	);

	const toggle = useCallback( ( service, visible, key, checked ) => {
		setByService( ( current ) => {
			const selected = current[ service ] || [];
			const row = ( visible || [] ).find( ( item ) => item.key === key );
			if ( ! row || ! row.url ) {
				return current;
			}
			const visibleUrls = new Set(
				( visible || [] ).map( ( item ) => item.url ).filter( Boolean )
			);
			const kept = selected.filter( ( url ) => ! visibleUrls.has( url ) );
			const nextVisible = [];
			const seen = new Set();
			for ( const item of visible || [] ) {
				if ( ! item.url || seen.has( item.url ) ) {
					continue;
				}
				const on =
					item.url === row.url
						? checked
						: selected.includes( item.url );
				if ( on ) {
					seen.add( item.url );
					nextVisible.push( item.url );
				}
			}
			return {
				...current,
				[ service ]: [ ...kept, ...nextVisible ],
			};
		} );
	}, [] );

	const clear = useCallback( ( service ) => {
		setByService( ( current ) => ( {
			...current,
			[ service ]: [],
		} ) );
	}, [] );

	const value = useMemo(
		() => ( { urlsFor, toggle, clear } ),
		[ urlsFor, toggle, clear ]
	);

	return (
		<PageSelectionContext.Provider value={ value }>
			{ children }
		</PageSelectionContext.Provider>
	);
}

export function usePageSelection() {
	return useContext( PageSelectionContext );
}
