/**
 * WordPress dependencies
 */
import { createRoot } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { ConnectPage } from './connect/connect-page';
import { DashboardPage } from './dashboard/dashboard-page';
import { DashboardWidget } from './dashboard/dashboard-widget';
import './style.scss';

const rootElement = document.getElementById( 'pendulum-arc-root' );

if ( rootElement ) {
	let bootstrap = {};
	try {
		bootstrap = JSON.parse( rootElement.dataset.bootstrap || '{}' );
	} catch {
		bootstrap = {};
	}
	const Page = bootstrap.page === 'dashboard' ? DashboardPage : ConnectPage;
	createRoot( rootElement ).render( <Page bootstrap={ bootstrap } /> );
}

const widgetElement = document.getElementById(
	'pendulum-arc-dashboard-widget'
);

if ( widgetElement ) {
	createRoot( widgetElement ).render(
		<DashboardWidget
			dashboardUrl={ widgetElement.dataset.dashboardUrl || '' }
			connectUrl={ widgetElement.dataset.connectUrl || '' }
			connected={ widgetElement.dataset.connected === '1' }
			portalUrl={ widgetElement.dataset.portalUrl || '' }
		/>
	);
}
