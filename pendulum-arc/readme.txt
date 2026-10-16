=== Arc Analytics ===
Contributors: devhalls
Tags: seo, analytics
Requires at least: 6.7
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.4.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect this WordPress site to a Pendulum Arc account.

== Description ==

Arc Analytics connects this site to an Arc studio so the dashboard can show the latest site scores and a preview of each report.

Connect with an API key, or sign in through Arc. Signing in opens Arc, where you pair an existing site or add this site to a project. You return to WordPress already connected.

An API key pairs the site when Arc already has this address. When it does not, you confirm the site name, address, and project in WordPress.

GDPR Consent, under the Arc menu, is a cookie banner for this site. It does not call Arc, and it is available before the site is paired. Optional cookies, and scripts listed on them, stay off until a visitor accepts them. Decline refuses every optional cookie. Consent logging is off until you turn it on. A static banner is printed at the end of the theme header or footer. A fixed banner is positioned on the screen. Disable, on the Behaviour tab, turns the banner off and leaves script tags unchanged.

= External service =

This plugin sends the site address and an API key or OAuth token to Pendulum Arc.

* Production portal: `https://arc.pendulumdev.co.uk`
* Production API: `https://api.arc.pendulumdev.co.uk`
* Preview portal: `https://arc.preview.pendulumdev.co.uk`
* Preview API: `https://api.arc.preview.pendulumdev.co.uk`

Tokens are stored encrypted in WordPress and are not shown again. Disconnecting here stops this install from calling Arc. An Arc admin revokes the key or the connected app in Arc.

The plugin also asks GitHub if a newer release exists, at `https://api.github.com/repos/pendulumdev/arc-wordpress/releases/latest`. That request sends no site address and no Arc credential. Update now, and automatic updates, download the release zip from GitHub. Automatic updates are turned on. Disable them on the Plugins screen to leave them off.

== Installation ==

1. Upload the plugin and activate it.
2. Open Arc, then Connect.
3. Sign in with Arc, or paste an API key.

== Frequently Asked Questions ==

= Where is the site created? =

Sign-in creates or pairs the site on Arc before you return. An API key asks you to confirm the site in WordPress when Arc does not already have this address.

= The account has no project =

Add a project in Arc, then connect again with the API key. Sign-in can add a project by name on the Arc page.

= Does the cookie banner need Arc? =

No. GDPR Consent stores its settings on this site. Pairing is only for the Arc scores.

= What does Accept do? =

Accept allows the optional cookies left checked, and runs the scripts listed on those rows. Required cookies always stay. Decline refuses every optional cookie. The cookie table is in the read more modal. Put the shortcodes on a page when Read more is a link.

= How do updates work? =

When the GitHub repository is public and a release is newer than this install, WordPress shows the update on the Plugins screen. Update now installs it, and automatic updates install it on their own. Automatic updates are on until you disable them on the Plugins screen. The Arc screens show the same update.

== Changelog ==

= 0.4.4 =
* Cookie choice boxes are 20px, so a 10px theme root no longer shrinks them.
* An update adds that size to a saved stylesheet, including one that already received the layout fix.

= 0.4.3 =
* The banner card, buttons, and cookie list use pixel sizes, so a 10px theme root no longer squeezes the layout.
* An update rewrites a saved stylesheet that still sizes the banner in rem, so the list stays readable without resetting styles.

= 0.4.2 =
* An update rewrites a saved banner stylesheet that still uses rem text sizes, so the copy stays readable without resetting styles.

= 0.4.1 =
* The cookie banner sets its own text size. A theme that uses a 10px root no longer shrinks the copy.

= 0.4.0 =
* GDPR Consent, under the Arc menu, is a cookie banner. It works before the site is paired and does not call Arc.
* Accept allows the optional cookies left checked. Decline refuses every optional cookie. Scripts listed on optional cookies stay off until Accept.
* A static banner, and its collapsed cookie button, sit at the end of the header or footer. A fixed banner and button stay on the chosen screen cell.
* Disable, on the Behaviour tab, turns the banner off and leaves script tags unchanged.
* Consent logging is off until you turn it on. Deleting the plugin removes the banner settings and the log.
* Automatic updates are turned on once. Disable them on the Plugins screen to leave them off.

= 0.3.6 =
* The report area shows a loader while a report is loading, then the sections fade in.
* SEO page previews use the small link card. Accessibility previews use the screenshot thumb.
* The page analysis URL column has underlined View and Edit links, each with an arrow, and both open in a new tab.
* Page analysis tables scroll within 600px, and the column headings stay visible.
* The AI Words column labels the two counts as Static and Rendered.
* The View report row stays the same height when a report has no issues.

= 0.3.5 =
* When every report already exists, the dashboard notice says to view the latest data below.
* A missing visitor metric shows a dash. It is not shown as zero.

= 0.3.3 =
* The dashboard notice that says reports need generating uses the info blue. Warning cards stay yellow.

= 0.3.2 =
* The plugin name is Arc Analytics. The admin menu, page titles, and dashboard widget use that name.
* An http WordPress address pairs an Arc site stored as https when the host, port, and path are the same. www and a subdirectory stay different sites.
* When Analytics is not enabled for the site, the card links to that site in Arc.

= 0.3.1 =
* The Connect screen introduces Arc reports, with a link to Arc, above the other cards.
* A saved API key stays masked in the field, with a tick, so it does not need to be pasted again.
* Reconnect uses the saved API key or Arc account when Arc no longer has this site, and opens Add this site when the address is new.
* Add this site turns on the first report run, the schedule, and sitemap detection.
* Validation errors on Add this site are red, and the form error stays in the dialog.
* The dashboard shows when reports are generating, and refreshes scores while a run is queued or running.
* Run all queues every report that can run. A service that cannot run is named, and the others still queue.
* Analytics links to Arc when Google is not connected.

= 0.3.0 =
* Preview each report on the Arc screen, including SEO, accessibility, AI, security, and brand.
* Generate queues one report, or every report that is not already queued or running.
* A site signed in before this release must reconnect before Generate is allowed. API keys already include that permission.
* Ready reports open an Issues menu. Failed Arc requests show in an error card.

= 0.2.0 =
* Show a visitor analytics summary on the Arc screen, with graphs and top landing pages.
* The WordPress dashboard widget shows scores only.
* Open in Arc sits on the Arc and Connect page titles.

= 0.1.0 =
* Connect with an API key or Arc sign-in, and show a site score summary.
* A newer public GitHub release shows on the Plugins screen. Update now installs it.
