/**
 * Banner behaviour. Printed in the page, not loaded from a separate URL.
 * Optional scripts stay inert in the HTML until a choice allows them.
 */
( function () {
	const config = window.arcCookieConsent;
	if ( ! config || ! config.cookieName ) {
		return;
	}

	let lastFocus = null;

	function boot() {
		const saved = readConsent();
		if ( saved ) {
			applyChecks( saved.ids );
			promote( saved.ids );
			applyChrome( config.afterChoice );
			return;
		}
		showBanner();
	}

	function readConsent() {
		const parts = document.cookie ? document.cookie.split( ';' ) : [];
		let i;
		for ( i = 0; i < parts.length; i++ ) {
			const part = parts[ i ].trim();
			const eq = part.indexOf( '=' );
			if ( eq < 1 ) {
				continue;
			}
			if ( part.slice( 0, eq ) !== config.cookieName ) {
				continue;
			}
			try {
				const data = JSON.parse(
					decodeURIComponent( part.slice( eq + 1 ) )
				);
				if ( ! data || data.v !== config.version ) {
					return null;
				}
				if ( data.a !== 'accept' && data.a !== 'decline' ) {
					return null;
				}
				if ( ! Array.isArray( data.ids ) ) {
					return null;
				}
				return data;
			} catch {
				return null;
			}
		}
		return null;
	}

	function writeConsent( action, ids ) {
		const secure = config.secure ? '; Secure' : '';
		const value = encodeURIComponent(
			JSON.stringify( { v: config.version, a: action, ids } )
		);
		document.cookie =
			config.cookieName +
			'=' +
			value +
			'; Max-Age=' +
			config.maxAge +
			'; Path=/; SameSite=Lax' +
			secure;
	}

	function rows() {
		return Array.isArray( config.cookies ) ? config.cookies : [];
	}

	function requiredIds() {
		return rows()
			.filter( function ( row ) {
				return row.requirement === 'required';
			} )
			.map( function ( row ) {
				return row.id;
			} );
	}

	function acceptedOptionalIds() {
		const boxes = document.querySelectorAll( '[data-arc-cookie-choice]' );
		if ( ! boxes.length ) {
			return rows()
				.filter( function ( row ) {
					return row.requirement === 'optional';
				} )
				.map( function ( row ) {
					return row.id;
				} );
		}
		const ids = [];
		const seen = {};
		Array.prototype.forEach.call( boxes, function ( box ) {
			const id = box.getAttribute( 'data-arc-cookie-choice' );
			if ( ! id || seen[ id ] ) {
				return;
			}
			seen[ id ] = true;
			if ( box.checked ) {
				ids.push( id );
			}
		} );
		return ids;
	}

	function allowedIds( action ) {
		const ids = requiredIds();
		if ( action === 'accept' ) {
			acceptedOptionalIds().forEach( function ( id ) {
				ids.push( id );
			} );
		}
		return ids;
	}

	function applyChecks( ids ) {
		const allowed = {};
		ids.forEach( function ( id ) {
			allowed[ id ] = true;
		} );
		Array.prototype.forEach.call(
			document.querySelectorAll( '[data-arc-cookie-choice]' ),
			function ( box ) {
				const id = box.getAttribute( 'data-arc-cookie-choice' );
				box.checked = !! allowed[ id ];
			}
		);
	}

	function syncChoice( box ) {
		const id = box.getAttribute( 'data-arc-cookie-choice' );
		Array.prototype.forEach.call(
			document.querySelectorAll( '[data-arc-cookie-choice]' ),
			function ( other ) {
				if ( other.getAttribute( 'data-arc-cookie-choice' ) === id ) {
					other.checked = box.checked;
				}
			}
		);
	}

	function deleteCookie( name ) {
		const host = window.location.hostname;
		const bare = host.replace( /^www\./, '' );
		const domains = [ '', host, bare ];
		if ( bare.indexOf( '.' ) !== -1 ) {
			domains.push( '.' + bare );
		}
		domains.forEach( function ( domain ) {
			const extra = domain ? '; domain=' + domain : '';
			document.cookie =
				name +
				'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
				extra;
		} );
	}

	function presentNames() {
		return ( document.cookie ? document.cookie.split( ';' ) : [] )
			.map( function ( part ) {
				return part.split( '=' )[ 0 ].trim();
			} )
			.filter( Boolean );
	}

	function matchesRow( name, row ) {
		if ( row.match === 'prefix' ) {
			return name.indexOf( row.name ) === 0;
		}
		return name === row.name;
	}

	function owningRow( name ) {
		let best = null;
		rows().forEach( function ( row ) {
			if ( ! matchesRow( name, row ) ) {
				return;
			}
			if (
				! best ||
				String( row.name ).length > String( best.name ).length
			) {
				best = row;
			}
		} );
		return best;
	}

	function deleteRefused( ids ) {
		const allowed = {};
		ids.forEach( function ( id ) {
			allowed[ id ] = true;
		} );
		presentNames().forEach( function ( name ) {
			const row = owningRow( name );
			if (
				! row ||
				row.requirement === 'required' ||
				allowed[ row.id ]
			) {
				return;
			}
			deleteCookie( name );
		} );
	}

	function promote( ids ) {
		const allowed = {};
		ids.forEach( function ( id ) {
			allowed[ id ] = true;
		} );
		Array.prototype.forEach.call(
			document.querySelectorAll( 'script[data-arc-cookie]' ),
			function ( node ) {
				const id = node.getAttribute( 'data-arc-cookie' );
				if (
					! allowed[ id ] ||
					node.getAttribute( 'type' ) !== 'text/plain'
				) {
					return;
				}
				const script = document.createElement( 'script' );
				const type =
					node.getAttribute( 'data-arc-script-type' ) ||
					'text/javascript';
				Array.prototype.forEach.call(
					node.attributes,
					function ( attr ) {
						if (
							attr.name === 'type' ||
							attr.name === 'data-arc-cookie' ||
							attr.name === 'data-arc-script-type'
						) {
							return;
						}
						script.setAttribute( attr.name, attr.value );
					}
				);
				script.type = type;
				if ( node.src ) {
					script.src = node.src;
				} else {
					script.text = node.text;
				}
				if ( node.parentNode ) {
					node.parentNode.replaceChild( script, node );
				}
			}
		);
	}

	function banner() {
		return document.querySelector( '[data-arc-cookie-banner]' );
	}

	function reopen() {
		return document.querySelector( '[data-arc-cookie-reopen]' );
	}

	function modal() {
		return document.querySelector( '[data-arc-cookie-modal]' );
	}

	function showBanner() {
		const node = banner();
		if ( node ) {
			node.hidden = false;
		}
		const button = reopen();
		if ( button ) {
			button.hidden = true;
		}
	}

	function applyChrome( choice ) {
		const node = banner();
		const button = reopen();
		if ( choice === 'hide' ) {
			if ( node ) {
				node.hidden = true;
			}
			if ( button ) {
				button.hidden = true;
			}
			return;
		}
		if ( choice === 'collapse' ) {
			if ( node ) {
				node.hidden = true;
			}
			if ( button ) {
				button.hidden = false;
			}
			return;
		}
		if ( node ) {
			node.hidden = false;
		}
		if ( button ) {
			button.hidden = true;
		}
	}

	function openModal() {
		const node = modal();
		if ( ! node ) {
			return;
		}
		lastFocus = node.ownerDocument.activeElement;
		node.hidden = false;
		document.body.style.overflow = 'hidden';
		const focus = node.querySelector( 'button, a, input' );
		if ( focus ) {
			focus.focus();
		}
	}

	function closeModal() {
		const node = modal();
		if ( ! node || node.hidden ) {
			return;
		}
		node.hidden = true;
		document.body.style.overflow = '';
		if ( lastFocus && lastFocus.focus ) {
			lastFocus.focus();
		}
	}

	function logChoice( action, ids ) {
		if ( ! config.logging || ! config.logUrl || ! window.fetch ) {
			return;
		}
		try {
			window.fetch( config.logUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( { action, allowed: ids } ),
				credentials: 'same-origin',
				keepalive: true,
			} );
		} catch {
			// A blocked log must not stop the banner from closing.
		}
	}

	function choose( action ) {
		const ids = allowedIds( action );
		writeConsent( action, ids );
		deleteRefused( ids );
		applyChecks( ids );
		promote( ids );
		closeModal();
		const reload =
			( action === 'accept' && config.reloadAccept ) ||
			( action === 'decline' && config.reloadDecline );
		if ( ! reload ) {
			applyChrome( config.afterChoice );
		}
		logChoice( action, ids );
		if ( reload ) {
			window.location.reload();
		}
	}

	document.addEventListener(
		'click',
		function ( event ) {
			const actionNode = event.target.closest
				? event.target.closest( '[data-arc-cookie-action]' )
				: null;
			if ( actionNode ) {
				const action = actionNode.getAttribute(
					'data-arc-cookie-action'
				);
				if ( action === 'accept' || action === 'decline' ) {
					event.preventDefault();
					choose( action );
					return;
				}
				if ( action === 'read-more' ) {
					event.preventDefault();
					openModal();
					return;
				}
				if ( action === 'close' ) {
					event.preventDefault();
					closeModal();
					return;
				}
			}
			const reopenNode = event.target.closest
				? event.target.closest( '[data-arc-cookie-reopen]' )
				: null;
			if ( reopenNode ) {
				event.preventDefault();
				showBanner();
			}
		},
		true
	);

	document.addEventListener( 'change', function ( event ) {
		const box = event.target;
		if (
			box &&
			box.getAttribute &&
			box.getAttribute( 'data-arc-cookie-choice' )
		) {
			syncChoice( box );
		}
	} );

	document.addEventListener( 'keydown', function ( event ) {
		if ( event.key === 'Escape' ) {
			closeModal();
		}
	} );

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
} )();
