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
address, the API key, or the connection token. The answer is cached for 12
hours, or for 1 hour when GitHub does not answer. An update, including an
automatic update, downloads `pendulum-arc.zip` from that repository's
release. A private repository, or a failed request, offers no download.

## Stored on this site

The connection is one option, `arc_wordpress_connection`. The token is sealed
with the PHP sodium extension before it is written. The admin screens receive
a public view: site, project, and method. They do not receive the token or
the API key.

`arc_wordpress_auto_update_set` records that automatic updates were turned on
once, so a later Disable on the Plugins screen is kept.
`arc_wordpress_release_version` is the installed version the GitHub answer
was cached for. The cached answer itself is the transient
`arc_wordpress_release`.

Disconnect deletes that option on this install. It does not delete the site
or its reports in Arc. An Arc admin revokes the key or the connected app there.

## Cookie consent

The banner is local. It does not send the choice to Arc.

The visitor's choice is the cookie `arc_cookie_consent`. It lasts 180 days.
It stores the consent version, whether they accepted or declined, and the
ids of the cookies they allowed. It is not `HttpOnly`, because the page
script has to read it. `HttpOnly` cookies cannot be deleted by that script.
WordPress login cookies are treated as required for that reason.

Optional scripts are printed as inert `text/plain` tags. The page HTML does
not change per visitor. After a choice, the script turns the allowed tags
into real scripts.

When consent logging is on, rows go in `{prefix}arc_consent_log`: time,
consent version, allowed cookie names, refused cookie names, the direct
`REMOTE_ADDR` value, and the user agent. Forwarded headers are not trusted.
The log route is public, takes no nonce (a cached page would keep a stale
one), rejects unknown cookie ids, and allows 30 writes an hour from one
address. Disable identifiable data points leaves the IP and user agent
empty on new rows. Rows already stored stay as they are. Logging is off
until an administrator enables it.

Deleting the plugin drops the log table and the settings option.

## Accepted limits

- **Administrators can connect the site.** The screens and the REST routes
  require `manage_options`. A lower role cannot read the connection.
- **The local mu-plugin is not part of the plugin.** `dev/local-arc.php` is
  mapped only by wp-env. It rewrites `localhost` so PHP inside Docker can
  reach a portal on the host. Do not ship that file in a release zip.
- **`http://localhost` is refused unless `WP_DEBUG` is on.** That is the
  local-development door, not a production setting.
