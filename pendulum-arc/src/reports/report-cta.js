/**
 * WordPress dependencies
 */
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { errorMessage, recrawlPages } from '../api';
import { GenerateReports } from './generate-menu';
import { usePageSelection } from './page-selection';
import { ArcButton } from '../ui/button';
import { ErrorAlert } from '../ui/error-alert';
import { Icon } from '../ui/icon';

const CRAWL_SERVICES = [ 'seo', 'a11y', 'ai' ];

function RecrawlSpinner() {
	return (
		<span className="arc-generate__spin">
			<Icon size={ 16 } strokeWidth={ 2.25 }>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</Icon>
		</span>
	);
}

/**
 * Permanent dashboard notice. Idle until a run is queued or running.
 *
 * @param {Object}                                     props
 * @param {string}                                     [props.connectUrl]  WordPress Connect settings page.
 * @param {boolean}                                    [props.complete]    Every service already has a report.
 * @param {() => void}                                 [props.onSettled]   Called when a service leaves in-flight.
 * @param {(activity: Object<string, string>) => void} [props.onBusy]      Per-service queued or running.
 * @param {string}                                     [props.service]     Open report.
 * @param {string|null}                                [props.generation]  queued or running for that report.
 * @param {() => void}                                 [props.onRecrawled] Called after a recrawl is accepted.
 */
export function GenerationNotice( {
	connectUrl,
	complete = false,
	onSettled,
	onBusy,
	service = '',
	generation = null,
	onRecrawled,
} ) {
	const selection = usePageSelection();
	const [ active, setActive ] = useState( false );
	const [ submitting, setSubmitting ] = useState( false );
	const [ pending, setPending ] = useState( false );
	const [ error, setError ] = useState( null );
	const crawl = CRAWL_SERVICES.includes( service );
	const urls = crawl && selection ? selection.urlsFor( service ) : [];
	const count = urls.length;
	const held =
		generation === 'queued' ||
		generation === 'running' ||
		submitting ||
		pending;
	let message = __( 'Reports need generating.', 'pendulum-arc' );
	if ( active ) {
		message = __( 'Reports are currently generating.', 'pendulum-arc' );
	} else if ( complete ) {
		message = __( 'View your latest data below.', 'pendulum-arc' );
	}

	function recrawl() {
		if ( ! crawl || count < 1 || held ) {
			return;
		}
		setPending( true );
		setError( null );
		recrawlPages( service, urls )
			.then( () => {
				if ( selection ) {
					selection.clear( service );
				}
				if ( onRecrawled ) {
					onRecrawled();
				}
			} )
			.catch( ( failure ) => {
				setError(
					errorMessage(
						failure,
						__(
							'Those pages could not be recrawled.',
							'pendulum-arc'
						)
					)
				);
			} )
			.finally( () => {
				setPending( false );
			} );
	}

	return (
		<div className="arc-report-alert arc-report-alert--info" role="status">
			<p>
				<Icon size={ 18 } strokeWidth={ 2 }>
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</Icon>
				<span>{ message }</span>
			</p>
			<div className="arc-report-alert__actions">
				{ count > 0 ? (
					<ArcButton
						variant="primary"
						busy={ pending }
						disabled={ held }
						icon={ pending ? <RecrawlSpinner /> : undefined }
						title={ __(
							'Recrawl the selected pages',
							'pendulum-arc'
						) }
						onClick={ recrawl }
					>
						{ sprintf(
							/* translators: %d: number of selected pages */
							__( 'Recrawl %d', 'pendulum-arc' ),
							count
						) }
					</ArcButton>
				) : null }
				<GenerateReports
					onActivity={ setActive }
					onSettled={ onSettled }
					onBusy={ onBusy }
					onSubmitting={ setSubmitting }
					connectUrl={ connectUrl }
				/>
			</div>
			{ error ? (
				<div className="arc-report-alert__error">
					<ErrorAlert message={ error } connectUrl={ connectUrl } />
				</div>
			) : null }
		</div>
	);
}

/**
 * Warning card used at the close of a report, and when a summary is not
 * available yet. The button opens Arc.
 *
 * @param {Object}                    props
 * @param {string}                    [props.href]
 * @param {string}                    [props.label]
 * @param {import('react').ReactNode} props.children
 */
export function ReportCta( { href, label, children } ) {
	return (
		<div className="arc-report-alert">
			<p>
				<Icon size={ 18 } strokeWidth={ 2 }>
					<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
				</Icon>
				<span>
					{ children ||
						__(
							'Issue management and the full report are viewable in Arc. Automate fixes, review issues, and employ agents to help you manage your digital landscape.',
							'pendulum-arc'
						) }
				</span>
			</p>
			{ href ? (
				<ArcButton href={ href } variant="connect">
					{ label ||
						__( 'Open the full report in Arc', 'pendulum-arc' ) }
				</ArcButton>
			) : null }
		</div>
	);
}
