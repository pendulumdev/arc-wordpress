/**
 * WordPress dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, fetchScores } from '../api';

export function useSiteScores( enabled = true ) {
	const [ state, setState ] = useState( {
		loading: enabled,
		scores: [],
		error: '',
	} );

	useEffect( () => {
		if ( ! enabled ) {
			setState( { loading: false, scores: [], error: '' } );
			return undefined;
		}
		let cancelled = false;
		fetchScores()
			.then( ( result ) => {
				if ( cancelled ) {
					return;
				}
				setState( {
					loading: false,
					scores: result.scores || [],
					error: result.error || '',
				} );
			} )
			.catch( ( error ) => {
				if ( cancelled ) {
					return;
				}
				setState( {
					loading: false,
					scores: [],
					error: errorMessage(
						error,
						__( 'Scores could not be loaded.', 'pendulum-arc' )
					),
				} );
			} );
		return () => {
			cancelled = true;
		};
	}, [ enabled ] );

	return state;
}
