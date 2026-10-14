/**
 * WordPress dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, fetchAnalytics } from '../api';
import { scoreServices, ServiceMark } from '../ui/score-card';
import { ReportCta } from './report-cta';
import { VisitorAnalytics } from './visitor-analytics';

/**
 * Category pills and the selected report. Analytics is the only summary
 * in this version.
 *
 * @param {Object}                    props
 * @param {string}                    [props.portalUrl]
 * @param {string}                    [props.service]
 * @param {(service: string) => void} [props.onService]
 */
export function ReportSummary( { portalUrl, service, onService } ) {
	const [ ownService, setOwnService ] = useState( 'analytics' );
	const selected = service || ownService;
	const setService = onService || setOwnService;
	const [ report, setReport ] = useState( {
		loading: true,
		error: '',
	} );

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

	return (
		<section className="arc-reports">
			<div className="arc-report-nav">
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
								<ServiceMark service={ item.key } size={ 12 } />
								{ item.label }
							</button>
						);
					} ) }
				</div>
			</div>
			{ selected === 'analytics' && report.error ? (
				<p className="arc-scores__error">{ report.error }</p>
			) : null }
			{ selected === 'analytics' ? (
				<VisitorAnalytics report={ report } portalUrl={ portalUrl } />
			) : (
				<ReportCta href={ portalUrl }>
					{ __(
						'Report overview coming soon. In the meantime you can view the full report in your Arc account.',
						'pendulum-arc'
					) }
				</ReportCta>
			) }
		</section>
	);
}
