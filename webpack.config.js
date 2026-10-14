const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		index: path.resolve( __dirname, 'pendulum-arc/src/index.js' ),
	},
	output: {
		...defaultConfig.output,
		path: path.resolve( __dirname, 'pendulum-arc/build' ),
	},
};
