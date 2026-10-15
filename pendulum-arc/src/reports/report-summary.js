/**
 * WordPress dependencies
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, fetchAnalytics, fetchReport } from '../api';
import { ErrorAlert } from '../ui/error-alert';
import { IssueMenu } from './issue-menu';
import { scoreServices, ServiceMark } from '../ui/score-card';
import { ReportPreview } from './report-preview';
import { VisitorAnalytics } from './visitor-analytics';

/**
 * Category pills and the selected report preview.
 *
 * @param {Object}                    props
 * @param {string}                    [props.portalUrl]
 * @param {string}                    [props.connectUrl]
 * @param {string}                    [props.service]
 * @param {(service: string) => void} [props.onService]
 * @param {number}                    [props.refreshKey] Bumps when a run leaves in-flight.
 */
export function ReportSummary( {
	portalUrl,
	connectUrl,
	service,
	onService,
	refreshKey = 0,
} ) {
	const [ ownService, setOwnService ] = useState( 'analytics' );
	const selected = service || ownService;
	const setService = onService || setOwnService;
	const [ report, setReport ] = useState( {
		loading: true,
		error: '',
	} );
	const [ reports, setReports ] = useState( {} );
	const reportCache = useRef( {} );
	const selectedRef = useRef( selected );
	selectedRef.current = selected;

	useEffect( () => {
		let cancelled = false;
		fetchAnalytics()
			.then( ( result ) => {
				if ( ! cancelled ) {
					setReport( { ...result, loading: false } );
				}
			} )
			.catch( ( error ) => {
				if ( ! cancelled ) {
					setReport( {
						loading: false,
						error: errorMessage(
							error,
							__(
								'The analytics report could not be loaded.',
								'pendulum-arc'
							)
						),
					} );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [] );

	useEffect( () => {
		if ( selected === 'analytics' ) {
			return undefined;
		}
		if ( reportCache.current[ selected ] ) {
			return undefined;
		}
		let cancelled = false;
		setReports( ( current ) => ( {
			...current,
			[ selected ]: { loading: true, error: '' },
		} ) );
		fetchReport( selected )
			.then( ( result ) => {
				if ( cancelled ) {
					return;
				}
				const next = { ...result, loading: false, error: '' };
				reportCache.current[ selected ] = next;
				setReports( ( current ) => ( {
					...current,
					[ selected ]: next,
				} ) );
			} )
			.catch( ( error ) => {
				if ( ! cancelled ) {
					setReports( ( current ) => ( {
						...current,
						[ selected ]: {
							loading: false,
							error: errorMessage(
								error,
								__(
									'The report could not be loaded.',
									'pendulum-arc'
								)
							),
						},
					} ) );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ selected ] );

	const preview =
		selected === 'analytics'
			? report
			: reports[ selected ] || { loading: true };
	const issues = Array.isArray( preview.issues ) ? preview.issues : [];

	useEffect( () => {
		if ( ! refreshKey ) {
			return undefined;
		}
		let cancelled = false;
		const serviceKey = selectedRef.current;
		const request =
			serviceKey === 'analytics'
				? fetchAnalytics()
				: fetchReport( serviceKey );
		request
			.then( ( result ) => {
				if ( cancelled ) {
					return;
				}
				const next = { ...result, loading: false, error: '' };
				if ( serviceKey === 'analytics' ) {
					setReport( next );
					return;
				}
				reportCache.current[ serviceKey ] = next;
				setReports( ( current ) => ( {
					...current,
					[ serviceKey ]: next,
				} ) );
			} )
			.catch( ( error ) => {
				if ( cancelled ) {
					return;
				}
				const failed = {
					loading: false,
					error: errorMessage(
						error,
						serviceKey === 'analytics'
							? __(
									'The analytics report could not be loaded.',
									'pendulum-arc'
								)
							: __(
									'The report could not be loaded.',
									'pendulum-arc'
								)
					),
				};
				if ( serviceKey === 'analytics' ) {
					setReport( failed );
					return;
				}
				delete reportCache.current[ serviceKey ];
				setReports( ( current ) => ( {
					...current,
					[ serviceKey ]: failed,
				} ) );
			} );
		return () => {
			cancelled = true;
		};
	}, [ refreshKey ] );

	return (
		<section className="arc-reports">
			<div className="arc-report-nav">
				<div className="arc-report-nav__views">
					<p className="arc-report-nav__label">
						{ __( 'View report:', 'pendulum-arc' ) }
					</p>
					<div
						className="arc-report-pills"
						role="tablist"
						aria-label={ __( 'Reports', 'pendulum-arc' ) }
					>
						{ scoreServices().map( ( item ) => {
							const active = item.key === selected;
							return (
								<button
									key={ item.key }
									type="button"
									role="tab"
									className="arc-report-pill"
									data-accent={ item.accent }
									aria-selected={ active }
									onClick={ () => setService( item.key ) }
								>
									<ServiceMark
										service={ item.key }
										size={ 12 }
									/>
									{ item.label }
								</button>
							);
						} ) }
					</div>
				</div>
				<IssueMenu groups={ issues } />
			</div>
			{ preview.error ? (
				<ErrorAlert
					message={ preview.error }
					connectUrl={ connectUrl }
				/>
			) : null }
			{ selected === 'analytics' ? (
				<VisitorAnalytics report={ report } portalUrl={ portalUrl } />
			) : (
				<ReportPreview report={ preview } portalUrl={ portalUrl } />
			) }
		</section>
	);
}
