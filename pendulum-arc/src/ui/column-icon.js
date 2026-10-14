/**
 * WordPress dependencies
 */
import { createElement } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { Icon } from './icon';

/**
 * Lucide strokes used on Arc report table headers. Keyed by column id.
 *
 * @type {Record<string, Array<[string, Record<string, string>]>>}
 */
const NODES = {
	activity: [
		[
			'path',
			{
				d: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2',
			},
		],
	],
	alert: [
		[
			'path',
			{
				d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
			},
		],
		[ 'path', { d: 'M12 9v4' } ],
		[ 'path', { d: 'M12 17h.01' } ],
	],
	at: [
		[ 'circle', { cx: '12', cy: '12', r: '4' } ],
		[ 'path', { d: 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8' } ],
	],
	bot: [
		[ 'path', { d: 'M12 8V4H8' } ],
		[ 'rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' } ],
		[ 'path', { d: 'M2 14h2' } ],
		[ 'path', { d: 'M20 14h2' } ],
		[ 'path', { d: 'M15 13v2' } ],
		[ 'path', { d: 'M9 13v2' } ],
	],
	box: [
		[
			'path',
			{
				d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
			},
		],
		[ 'path', { d: 'm3.3 7 8.7 5 8.7-5' } ],
		[ 'path', { d: 'M12 22V12' } ],
	],
	cookie: [
		[
			'path',
			{
				d: 'M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5',
			},
		],
		[ 'path', { d: 'M8.5 8.5v.01' } ],
		[ 'path', { d: 'M16 15.5v.01' } ],
		[ 'path', { d: 'M12 12v.01' } ],
		[ 'path', { d: 'M11 17v.01' } ],
		[ 'path', { d: 'M7 14v.01' } ],
	],
	dot: [
		[ 'circle', { cx: '12', cy: '12', r: '10' } ],
		[ 'circle', { cx: '12', cy: '12', r: '1' } ],
	],
	eye: [
		[
			'path',
			{
				d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
			},
		],
		[ 'circle', { cx: '12', cy: '12', r: '3' } ],
	],
	file: [
		[
			'path',
			{
				d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
			},
		],
		[ 'path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' } ],
		[ 'path', { d: 'M10 9H8' } ],
		[ 'path', { d: 'M16 13H8' } ],
		[ 'path', { d: 'M16 17H8' } ],
	],
	flag: [
		[
			'path',
			{
				d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
			},
		],
		[ 'line', { x1: '4', x2: '4', y1: '22', y2: '15' } ],
	],
	form: [
		[ 'rect', { width: '20', height: '12', x: '2', y: '6', rx: '2' } ],
		[ 'path', { d: 'M12 12h.01' } ],
		[ 'path', { d: 'M17 12h.01' } ],
		[ 'path', { d: 'M7 12h.01' } ],
	],
	gauge: [
		[ 'path', { d: 'm12 14 4-4' } ],
		[ 'path', { d: 'M3.34 19a10 10 0 1 1 17.32 0' } ],
	],
	globe: [
		[ 'path', { d: 'M21.54 15H17a2 2 0 0 0-2 2v4.54' } ],
		[
			'path',
			{
				d: 'M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17',
			},
		],
		[
			'path',
			{
				d: 'M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05',
			},
		],
		[ 'circle', { cx: '12', cy: '12', r: '10' } ],
	],
	heart: [
		[
			'path',
			{
				d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
			},
		],
		[ 'path', { d: 'M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27' } ],
	],
	help: [
		[ 'circle', { cx: '12', cy: '12', r: '10' } ],
		[ 'path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' } ],
		[ 'path', { d: 'M12 17h.01' } ],
	],
	image: [
		[
			'rect',
			{ width: '18', height: '18', x: '3', y: '3', rx: '2', ry: '2' },
		],
		[ 'circle', { cx: '9', cy: '9', r: '2' } ],
		[ 'path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' } ],
	],
	key: [
		[
			'path',
			{
				d: 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z',
			},
		],
		[ 'circle', { cx: '16.5', cy: '7.5', r: '.5', fill: 'currentColor' } ],
	],
	layers: [
		[
			'path',
			{
				d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z',
			},
		],
		[
			'path',
			{
				d: 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12',
			},
		],
		[
			'path',
			{
				d: 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17',
			},
		],
	],
	link: [
		[ 'path', { d: 'M9 17H7A5 5 0 0 1 7 7h2' } ],
		[ 'path', { d: 'M15 7h2a5 5 0 1 1 0 10h-2' } ],
		[ 'line', { x1: '8', x2: '16', y1: '12', y2: '12' } ],
	],
	monitor: [
		[ 'rect', { width: '20', height: '14', x: '2', y: '3', rx: '2' } ],
		[ 'line', { x1: '8', x2: '16', y1: '21', y2: '21' } ],
		[ 'line', { x1: '12', x2: '12', y1: '17', y2: '21' } ],
	],
	palette: [
		[ 'circle', { cx: '13.5', cy: '6.5', r: '.5', fill: 'currentColor' } ],
		[ 'circle', { cx: '17.5', cy: '10.5', r: '.5', fill: 'currentColor' } ],
		[ 'circle', { cx: '8.5', cy: '7.5', r: '.5', fill: 'currentColor' } ],
		[ 'circle', { cx: '6.5', cy: '12.5', r: '.5', fill: 'currentColor' } ],
		[
			'path',
			{
				d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z',
			},
		],
	],
	pin: [
		[
			'path',
			{
				d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
			},
		],
		[ 'circle', { cx: '12', cy: '10', r: '3' } ],
	],
	share: [
		[ 'circle', { cx: '18', cy: '5', r: '3' } ],
		[ 'circle', { cx: '6', cy: '12', r: '3' } ],
		[ 'circle', { cx: '18', cy: '19', r: '3' } ],
		[ 'line', { x1: '8.59', x2: '15.42', y1: '13.51', y2: '17.49' } ],
		[ 'line', { x1: '15.41', x2: '8.59', y1: '6.51', y2: '10.49' } ],
	],
	shield: [
		[
			'path',
			{
				d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
			},
		],
	],
	split: [
		[ 'path', { d: 'M16 3h5v5' } ],
		[ 'path', { d: 'M8 3H3v5' } ],
		[ 'path', { d: 'M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3' } ],
		[ 'path', { d: 'm15 9 6-6' } ],
	],
	tag: [
		[
			'path',
			{
				d: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z',
			},
		],
		[ 'circle', { cx: '7.5', cy: '7.5', r: '.5', fill: 'currentColor' } ],
	],
	tree: [
		[
			'path',
			{
				d: 'M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z',
			},
		],
		[
			'path',
			{
				d: 'M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z',
			},
		],
		[ 'path', { d: 'M3 5a2 2 0 0 0 2 2h3' } ],
		[ 'path', { d: 'M3 3v13a2 2 0 0 0 2 2h3' } ],
	],
	access: [
		[ 'circle', { cx: '16', cy: '4', r: '1' } ],
		[ 'path', { d: 'm18 19 1-7-6 1' } ],
		[ 'path', { d: 'm5 8 3-3 5.5 3-2.36 3.5' } ],
		[ 'path', { d: 'M4.24 14.5a5 5 0 0 0 6.88 6' } ],
		[ 'path', { d: 'M13.76 17.5a5 5 0 0 0-6.88-6' } ],
	],
	ban: [
		[ 'circle', { cx: '12', cy: '12', r: '10' } ],
		[ 'path', { d: 'm4.9 4.9 14.2 14.2' } ],
	],
	chart: [
		[ 'path', { d: 'M3 3v16a2 2 0 0 0 2 2h16' } ],
		[ 'path', { d: 'M18 17V9' } ],
		[ 'path', { d: 'M13 17V5' } ],
		[ 'path', { d: 'M8 17v-3' } ],
	],
	check: [ [ 'path', { d: 'M20 6 9 17l-5-5' } ] ],
	clock: [
		[ 'circle', { cx: '12', cy: '12', r: '10' } ],
		[ 'polyline', { points: '12 6 12 12 16 14' } ],
	],
	searchCheck: [
		[ 'circle', { cx: '11', cy: '11', r: '8' } ],
		[ 'path', { d: 'm21 21-4.3-4.3' } ],
		[ 'path', { d: 'm8 11 2 2 4-4' } ],
	],
	external: [
		[ 'path', { d: 'M15 3h6v6' } ],
		[ 'path', { d: 'M10 14 21 3' } ],
		[
			'path',
			{
				d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
			},
		],
	],
	fileCode: [
		[ 'path', { d: 'M10 12.5 8 15l2 2.5' } ],
		[ 'path', { d: 'm14 12.5 2 2.5-2 2.5' } ],
		[ 'path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' } ],
		[
			'path',
			{
				d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z',
			},
		],
	],
	plug: [
		[ 'path', { d: 'M12 22v-5' } ],
		[ 'path', { d: 'M9 8V2' } ],
		[ 'path', { d: 'M15 8V2' } ],
		[ 'path', { d: 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z' } ],
	],
	wrench: [
		[
			'path',
			{
				d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
			},
		],
	],
	x: [
		[ 'path', { d: 'M18 6 6 18' } ],
		[ 'path', { d: 'm6 6 12 12' } ],
	],
	type: [
		[ 'polyline', { points: '4 7 4 4 20 4 20 7' } ],
		[ 'line', { x1: '9', x2: '15', y1: '20', y2: '20' } ],
		[ 'line', { x1: '12', x2: '12', y1: '4', y2: '20' } ],
	],
	unlink: [
		[
			'path',
			{
				d: 'm18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71',
			},
		],
		[
			'path',
			{
				d: 'm5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71',
			},
		],
		[ 'line', { x1: '8', x2: '8', y1: '2', y2: '5' } ],
		[ 'line', { x1: '2', x2: '5', y1: '8', y2: '8' } ],
		[ 'line', { x1: '16', x2: '16', y1: '19', y2: '22' } ],
		[ 'line', { x1: '19', x2: '22', y1: '16', y2: '16' } ],
	],
};

/** Portal column id to the stroke above. */
const COLUMN_ICON = {
	aiMeta: 'bot',
	bot: 'bot',
	category: 'tree',
	engagement: 'heart',
	fields: 'layers',
	flags: 'flag',
	form: 'form',
	gap: 'split',
	header: 'key',
	incomplete: 'help',
	issues: 'alert',
	kind: 'tag',
	landmark: 'pin',
	link: 'link',
	links: 'unlink',
	method: 'layers',
	name: 'cookie',
	observed: 'eye',
	og: 'share',
	page: 'link',
	pages: 'layers',
	path: 'file',
	platform: 'globe',
	preview: 'share',
	required: 'box',
	resource: 'link',
	rule: 'shield',
	score: 'gauge',
	section: 'tree',
	sessions: 'activity',
	status: 'tag',
	theme: 'palette',
	twitter: 'at',
	url: 'link',
	value: 'file',
	viewport: 'monitor',
	words: 'type',
};

/**
 * Column header mark. Unknown ids fall back to a file stroke.
 *
 * @param {Object} props
 * @param {string} props.id
 */
export function ColumnMark( { id } ) {
	return (
		<StrokeMark
			name={ COLUMN_ICON[ id ] || 'file' }
			size={ 12 }
			strokeWidth={ 2 }
		/>
	);
}

/**
 * Named Lucide stroke. Unknown names fall back to a file stroke.
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {number} [props.size]
 * @param {number} [props.strokeWidth]
 */
export function StrokeMark( { name, size = 15, strokeWidth = 1.75 } ) {
	const nodes = NODES[ name ] || NODES.file;
	return (
		<Icon size={ size } strokeWidth={ strokeWidth }>
			{ nodes.map( ( [ tag, props ], index ) =>
				createElement( tag, { key: index, ...props } )
			) }
		</Icon>
	);
}
