/**
 * WordPress dependencies
 */
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, fetchScores } from '../api';

const SCORE_ERROR = __( 'Scores could not be loaded.', 'pendulum-arc' );

export function useSiteScores( enabled = true ) {
	const [ state, setState ] = useState( {
		loading: enabled,
		scores: [],
		error: '',
	} );

	const reload = useCallback( () => {
		if ( ! enabled ) {
			return Promise.resolve();
		}
		return fetchScores()
			.then( ( result ) => {
				setState( {
					loading: false,
					scores: result.scores || [],
					error: result.error || '',
				} );
			} )
			.catch( ( error ) => {
				setState( ( current ) => ( {
					...current,
					loading: false,
					error: errorMessage( error, SCORE_ERROR ),
				} ) );
			} );
	}, [ enabled ] );

	useEffect( () => {
		if ( ! enabled ) {
			setState( { loading: false, scores: [], error: '' } );
			return undefined;
		}
		let cancelled = false;
		setState( ( current ) => ( { ...current, loading: true } ) );
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
					error: errorMessage( error, SCORE_ERROR ),
				} );
			} );
		return () => {
			cancelled = true;
		};
	}, [ enabled ] );

	return { ...state, reload };
}
