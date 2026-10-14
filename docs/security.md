# Security

What this plugin sends, and what it keeps on the site.

## Sent to Arc

Connect and score reads call the Arc API for the active environment.

- Production portal: `https://arc.pendulumdev.co.uk`
- Production API: `https://api.arc.pendulumdev.co.uk`
- Preview portal: `https://arc.preview.pendulumdev.co.uk`
- Preview API: `https://api.arc.preview.pendulumdev.co.uk`

An API key is sent once, to pair or create the site. Arc sign-in uses the
OAuth code flow with PKCE. The browser goes to the portal, then returns to
this site's Connect screen. The plugin stores the token that comes back. It
does not store the Arc password.

## Version check

WordPress asks GitHub whether a newer release exists. The request goes to
`https://api.github.com/repos/pendulumdev/arc-wordpress/releases/latest` and
sends the plugin version in the user agent. It does not send the site
address, the API key, or the connection token. An update downloads
`pendulum-arc.zip` from that repository's release. A private repository, or
a failed request, offers no update.

## Stored on this site

The connection is one option, `arc_wordpress_connection`. The token is sealed
with the PHP sodium extension before it is written. The admin screens receive
a public view: site, project, and method. They do not receive the token or
the API key.

Disconnect deletes that option on this install. It does not delete the site
or its reports in Arc. An Arc admin revokes the key or the connected app there.

## Accepted limits

- **Administrators can connect the site.** The screens and the REST routes
  require `manage_options`. A lower role cannot read the connection.
- **The local mu-plugin is not part of the plugin.** `dev/local-arc.php` is
  mapped only by wp-env. It rewrites `localhost` so PHP inside Docker can
  reach a portal on the host. Do not ship that file in a release zip.
- **`http://localhost` is refused unless `WP_DEBUG` is on.** That is the
  local-development door, not a production setting.
