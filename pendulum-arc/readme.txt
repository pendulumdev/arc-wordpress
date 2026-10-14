=== Pendulum Arc ===
Contributors: devhalls
Tags: seo, analytics
Requires at least: 6.7
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect this WordPress site to a Pendulum Arc account.

== Description ==

Pendulum Arc connects this site to an Arc studio so the dashboard can show the latest site scores.

Connect with an API key, or sign in through Arc. Signing in opens Arc, where you pair an existing site or add this site to a project. You return to WordPress already connected.

An API key pairs the site when Arc already has this address. When it does not, you confirm the site name, address, and project in WordPress.

= External service =

This plugin sends the site address and an API key or OAuth token to Pendulum Arc.

* Production portal: `https://arc.pendulumdev.co.uk`
* Production API: `https://api.arc.pendulumdev.co.uk`
* Preview portal: `https://arc.preview.pendulumdev.co.uk`
* Preview API: `https://api.arc.preview.pendulumdev.co.uk`

Tokens are stored encrypted in WordPress and are not shown again. Disconnecting here stops this install from calling Arc. An Arc admin revokes the key or the connected app in Arc.

The plugin also asks GitHub if a newer release exists, at `https://api.github.com/repos/pendulumdev/arc-wordpress/releases/latest`. That request sends no site address and no Arc credential. Update now downloads the release zip from GitHub.

== Installation ==

1. Upload the plugin and activate it.
2. Open Arc, then Connect.
3. Sign in with Arc, or paste an API key.

== Frequently Asked Questions ==

= Where is the site created? =

Sign-in creates or pairs the site on Arc before you return. An API key asks you to confirm the site in WordPress when Arc does not already have this address.

= The account has no project =

Add a project in Arc, then connect again with the API key. Sign-in can add a project by name on the Arc page.

= How do updates work? =

When the GitHub repository is public and a release is newer than this install, WordPress shows the update on the Plugins screen. Update now installs it. The Arc screens show the same update.

== Changelog ==

= 0.1.0 =
* Connect with an API key or Arc sign-in, and show a site score summary.
* A newer public GitHub release shows on the Plugins screen. Update now installs it.
