/**
 * WordPress dependencies
 */
import { Modal, TextControl } from '@wordpress/components';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, fetchInvites, sendInvites } from '../api';
import { ReportLoader } from '../reports/report-loading';
import { ArcButton } from '../ui/button';
import { ErrorAlert } from '../ui/error-alert';
import { Icon } from '../ui/icon';
import { inviteIdsToSend } from './invite-selection';

/**
 * One confirmation line: name, then the server sentence.
 *
 * @param {Object} row
 */
function resultLine( row ) {
	if ( row.name ) {
		return `${ row.name } - ${ row.message }`;
	}
	return row.message;
}

/**
 * Sent invites in a success alert. Refusals and skips in an error alert.
 *
 * @param {Object}        props
 * @param {Array<Object>} props.results
 */
function InviteResultAlerts( { results } ) {
	const sent = results.filter( ( row ) => row.outcome === 'sent' );
	const failed = results.filter( ( row ) => row.outcome !== 'sent' );
	return (
		<>
			{ sent.length > 0 ? (
				<div
					className="arc-report-alert arc-report-alert--success"
					role="status"
				>
					<p>
						<Icon size={ 18 } strokeWidth={ 2 }>
							<circle cx="12" cy="12" r="10" />
							<path d="m9 12 2 2 4-4" />
						</Icon>
						<span>
							{ sent.map( ( row ) => (
								<span
									key={ row.id }
									className="arc-invite-results__line"
								>
									{ resultLine( row ) }
								</span>
							) ) }
						</span>
					</p>
				</div>
			) : null }
			{ failed.length > 0 ? (
				<div
					className="arc-report-alert arc-report-alert--error"
					role="alert"
				>
					<p>
						<Icon size={ 18 } strokeWidth={ 2 }>
							<circle cx="12" cy="12" r="10" />
							<path d="m15 9-6 6" />
							<path d="m9 9 6 6" />
						</Icon>
						<span>
							{ failed.map( ( row ) => (
								<span
									key={ row.id }
									className="arc-invite-results__line"
								>
									{ resultLine( row ) }
								</span>
							) ) }
						</span>
					</p>
				</div>
			) : null }
		</>
	);
}

/**
 * Administrators who can be invited onto the paired project.
 *
 * @param {Object}     props
 * @param {() => void} props.onClose
 */
export function InviteModal( { onClose } ) {
	const [ page, setPage ] = useState( 1 );
	const [ pageSize, setPageSize ] = useState( 100 );
	const [ total, setTotal ] = useState( 0 );
	const [ users, setUsers ] = useState( [] );
	const [ checked, setChecked ] = useState( [] );
	const [ results, setResults ] = useState( [] );
	const [ reconnect, setReconnect ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ loading, setLoading ] = useState( true );
	const [ sending, setSending ] = useState( false );
	const [ search, setSearch ] = useState( '' );
	const [ query, setQuery ] = useState( '' );
	const searchRef = useRef( '' );
	const requestRef = useRef( 0 );

	const load = useCallback( async ( nextPage, options = {} ) => {
		const nextSearch =
			typeof options.search === 'string'
				? options.search
				: searchRef.current;
		searchRef.current = nextSearch;
		const request = requestRef.current + 1;
		requestRef.current = request;
		setLoading( true );
		setError( '' );
		if ( ! options.keepResults ) {
			setResults( [] );
		}
		try {
			const result = await fetchInvites( nextPage, nextSearch );
			if ( request !== requestRef.current ) {
				return;
			}
			setQuery( nextSearch );
			if ( result && result.reconnect ) {
				setReconnect(
					result.message ||
						__(
							'Disconnect and Connect with Arc again before inviting someone who has no Arc account. If you already have an Arc account, continue.',
							'pendulum-arc'
						)
				);
				setUsers( [] );
				setChecked( [] );
				setTotal( result.total || 0 );
				setPage( result.page || nextPage );
			} else {
				const rows = Array.isArray( result?.users ) ? result.users : [];
				setReconnect( '' );
				setUsers( rows );
				setTotal( result?.total || 0 );
				setPageSize( result?.pageSize || 100 );
				setPage( result?.page || nextPage );
				setChecked(
					rows
						.filter( ( user ) => user.checked && ! user.disabled )
						.map( ( user ) => user.id )
				);
			}
		} catch ( failure ) {
			if ( request !== requestRef.current ) {
				return;
			}
			setError(
				errorMessage(
					failure,
					__( 'Could not load administrators.', 'pendulum-arc' )
				)
			);
		} finally {
			if ( request === requestRef.current ) {
				setLoading( false );
			}
		}
	}, [] );

	useEffect( () => {
		load( 1 );
	}, [ load ] );

	useEffect( () => {
		const nextSearch = search.trim();
		if ( nextSearch === searchRef.current ) {
			return undefined;
		}
		const handle = window.setTimeout( () => {
			load( 1, { search: nextSearch } );
		}, 300 );
		return () => window.clearTimeout( handle );
	}, [ search, load ] );

	function toggle( user ) {
		if ( user.disabled || sending ) {
			return;
		}
		setChecked( ( current ) =>
			current.includes( user.id )
				? current.filter( ( id ) => id !== user.id )
				: [ ...current, user.id ]
		);
	}

	async function onSend() {
		const ids = inviteIdsToSend(
			users.map( ( user ) => user.id ),
			checked
		);
		if ( ids.length === 0 || sending ) {
			return;
		}
		setSending( true );
		setError( '' );
		try {
			const result = await sendInvites( ids );
			setResults(
				Array.isArray( result?.results ) ? result.results : []
			);
			if ( result && result.reconnect ) {
				setReconnect(
					result.message ||
						__(
							'Disconnect and Connect with Arc again before inviting someone who has no Arc account. If you already have an Arc account, continue.',
							'pendulum-arc'
						)
				);
				return;
			}
			await load( page, { keepResults: true } );
		} catch ( failure ) {
			setError(
				errorMessage(
					failure,
					__( 'Arc could not send those invites.', 'pendulum-arc' )
				)
			);
		} finally {
			setSending( false );
		}
	}

	const busy = loading || sending;
	const totalPages = Math.max( 1, Math.ceil( total / pageSize ) );
	const ids = inviteIdsToSend(
		users.map( ( user ) => user.id ),
		checked
	);

	return (
		<Modal
			title={ __( 'Invite administrators', 'pendulum-arc' ) }
			onRequestClose={ busy ? () => {} : onClose }
			className="pendulum-arc-modal pendulum-arc-invite-modal"
		>
			<p>
				{ __(
					'Choose administrators to invite onto this Arc project. An invited person becomes a member of this project in Arc. They can open every site on the project, view its reports, and generate new ones. They cannot invite other people, change the plan, or remove sites.',
					'pendulum-arc'
				) }
			</p>
			{ error ? <ErrorAlert message={ error } /> : null }
			{ reconnect ? (
				<div
					className="arc-report-alert arc-report-alert--info"
					role="status"
				>
					<p>{ reconnect }</p>
				</div>
			) : null }
			{ results.length > 0 ? (
				<InviteResultAlerts results={ results } />
			) : null }
			{ reconnect ? null : (
				<div className="arc-fields arc-invite-search">
					<TextControl
						label={ __( 'Search name or email', 'pendulum-arc' ) }
						hideLabelFromVision
						placeholder={ __(
							'Search name or email',
							'pendulum-arc'
						) }
						type="search"
						value={ search }
						disabled={ sending }
						onChange={ setSearch }
						autoComplete="off"
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
			) }
			<div className="arc-invite-stage">
				{ loading ? (
					<ReportLoader
						label={ __(
							'Loading administrators…',
							'pendulum-arc'
						) }
					/>
				) : (
					<div className="arc-invite-ready" data-ready="true">
						{ ! reconnect && users.length === 0 ? (
							<p>
								{ query
									? __(
											'No administrators match that search.',
											'pendulum-arc'
										)
									: __(
											'No administrators to invite.',
											'pendulum-arc'
										) }
							</p>
						) : null }
						{ ! reconnect && users.length > 0 ? (
							<div className="arc-invite-table-scroll">
								<table className="arc-invite-table">
									<thead>
										<tr>
											<th scope="col">
												<span className="screen-reader-text">
													{ __(
														'Invite',
														'pendulum-arc'
													) }
												</span>
											</th>
											<th scope="col">
												{ __( 'Name', 'pendulum-arc' ) }
											</th>
											<th scope="col">
												{ __(
													'Email',
													'pendulum-arc'
												) }
											</th>
											<th scope="col">
												{ __( 'Arc', 'pendulum-arc' ) }
											</th>
										</tr>
									</thead>
									<tbody>
										{ users.map( ( user ) => (
											<tr
												key={ user.id }
												data-disabled={
													user.disabled
														? 'true'
														: 'false'
												}
												onClick={ () => toggle( user ) }
											>
												<td>
													<input
														type="checkbox"
														checked={ checked.includes(
															user.id
														) }
														disabled={
															user.disabled ||
															sending
														}
														aria-label={
															user.name ||
															user.email ||
															__(
																'Invite',
																'pendulum-arc'
															)
														}
														onClick={ ( event ) =>
															event.stopPropagation()
														}
														onChange={ () =>
															toggle( user )
														}
													/>
												</td>
												<td>{ user.name }</td>
												<td>{ user.email }</td>
												<td>{ user.label }</td>
											</tr>
										) ) }
									</tbody>
								</table>
							</div>
						) : null }
					</div>
				) }
				{ ! reconnect && totalPages > 1 ? (
					<div className="arc-invite-pager">
						<ArcButton
							onClick={ () => load( page - 1 ) }
							disabled={ busy || page <= 1 }
						>
							{ __( 'Previous', 'pendulum-arc' ) }
						</ArcButton>
						<span>
							{ sprintf(
								/* translators: 1: current page, 2: page count. */
								__( 'Page %1$d of %2$d', 'pendulum-arc' ),
								page,
								totalPages
							) }
						</span>
						<ArcButton
							onClick={ () => load( page + 1 ) }
							disabled={ busy || page >= totalPages }
						>
							{ __( 'Next', 'pendulum-arc' ) }
						</ArcButton>
					</div>
				) : null }
			</div>
			<div className="pendulum-arc-modal__actions">
				<ArcButton
					variant="danger"
					onClick={ onClose }
					disabled={ busy }
				>
					{ __( 'Cancel', 'pendulum-arc' ) }
				</ArcButton>
				{ reconnect ? null : (
					<ArcButton
						variant="secondary"
						busy={ sending }
						disabled={ ids.length === 0 || loading }
						onClick={ onSend }
					>
						{ __( 'Send invites', 'pendulum-arc' ) }
					</ArcButton>
				) }
			</div>
		</Modal>
	);
}
