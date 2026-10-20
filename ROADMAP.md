# Roadmap

Status: **alpha**. The connect flow, site scores, and report previews are the plugin.
It is not on WordPress.org yet. Install from the GitHub Release until the
directory listing exists.

## Place in Arc platform reach

This plugin is Wave 0 of the Arc platform reach sequence. The WordPress.org
listing on this page is the reach work for this repository. Later platforms
are sequenced in the Arc repo at `docs/research/system/platform-reach.md`.

## Known gaps

### WordPress.org listing

The plugin slug is `pendulum-arc`. The directory listing is not submitted.
Until it is, install from a GitHub Release zip (`pendulum-arc.zip`) or from
a checkout of `pendulum-arc/` after `npm run build`.

Submission is the next step. The plugin code for the product is in place.
One code change is still required before the upload, because the directory
serves updates itself:

1. Remove the GitHub updater (`Plugin_Updater`) from the build that
   WordPress.org will host. It filters `site_transient_update_plugins`.
   Plugin Check reports `plugin_updater_detected` for that kind of updater.
   A directory plugin cannot offer updates from GitHub. Drop the readme FAQ
   that says Update now installs a GitHub release, and drop the GitHub
   sentence under External service.
2. Re-run the gate from the repository root: `composer test`,
   `composer lint`, `npm run lint:js`, `npm test`, `npm run build`, and
   `npm run plugin-check`. The updater error must be gone.
3. Confirm `readme.txt` before upload. `Contributors` must be the
   WordPress.org username (`devhalls`). `Stable tag`, the plugin header
   `Version`, and `ARC_WORDPRESS_VERSION` must match. `Tested up to` must
   be a current WordPress release. The External service section must still
   name Arc, because connect sends the site address and a key or token
   there.
4. Upload `pendulum-arc.zip` from the GitHub Release, or zip `pendulum-arc/`
   the same way (`pendulum-arc/` at the top, no `dev/local-arc.php`). Submit
   it at https://wordpress.org/plugins/developers/add/ and request the slug
   `pendulum-arc`. The account needs two-factor authentication.
5. Answer the review email. Do not commit to the SVN repo until the review
   says the plugin is approved.
6. After approval, check out
   `https://plugins.svn.wordpress.org/pendulum-arc/`. Put the plugin in
   `trunk/`, copy that into `tags/<stable tag>/`, and add the directory
   banner and icon under `assets/` (those files are not part of the plugin
   zip). Commit. WordPress.org then ships updates from the SVN tag.
   Later releases repeat the tag, then the SVN trunk and tag. GitHub
   releases can stay for development. The Plugins screen for directory
   installs must update from WordPress.org only.

### Sync keyphrases

The Connect page Settings box has **Sync keyphrases**. It keeps a local list of focus
phrases already stored by Yoast, Rank Math, SEOPress, and All in One SEO.
A background scan fills that list. It does not call Arc. Save and delete
hooks update one row.

When that list differs from Arc, an alert at the top of Arc screens says so,
and the Arc menu shows a count of 1. That is the only alert that adds to the
count. The same area also says to connect a Google account when Analytics
has none, and to connect this install when it is not paired with Arc.
Those notices do not change the menu count. **Sync with Arc** is shown after the first scan,
and only when the local list hash differs from `GET /v1/sites/{siteId}/seo-targets`.
The click sends dirty rows when Arc still matches the last accepted hash,
or the whole list when Arc has moved. Commit uses `auto_run: true`, which
queues the SEO report. Turning the checkbox off clears the WordPress list
and leaves the Arc target in place.

### Generate reports

The dashboard notice uses the same confirm-then-queue menu as the portal
sites page. It calls `POST /pendulum-arc/v1/runs`, which queues one service
through `POST /v1/sites/{siteId}/runs` with a fresh `Idempotency-Key`.
Run all queues each service that is not already queued or running.

OAuth connect requests `arc:read arc:enqueue arc:invite`. A site connected
before enqueue must reconnect before Generate is allowed. A site connected
before invite must reconnect before Arc can invite a project member. API-key
connects already include enqueue when the key was created with that
capability. Invite on an API key is whatever the key was issued with.

### Connect Google

Connect Google and Assign in Arc call `POST /pendulum-arc/v1/google-connect`.
That mints `POST /v1/sites/{siteId}/google-connect-handoffs`, then reads
invite-status for the current WordPress user's email. An `active` Arc
account is sent to the ticket URL. Login continues the same ticket when the
browser has no Arc session. An `absent` account with status `none` is invited
with `continue` set to that ticket path, and WordPress asks them to open the
email. A pending invite is not sent again. After save or cancel, Arc returns
to the dashboard. The plugin accepts that return only when `state` matches,
then reads the site again. The query string is not the proof that Google is
bound.

A grant from before `arc:invite` can still open the ticket for someone who
already has an Arc account. Inviting a new account needs Disconnect and
Connect with Arc again.

The menu reads `GET /v1/sites/{siteId}/runs` when the notice opens, and the
row shows Queued or Running from that page plus the queue that is still in
flight. It does not poll. Each list spends a public API credit, so the notice
does not follow a run from queued to running to finished on its own. A
refresh reads status again. A credit-free in-flight read, or a webhook for
run lifecycle events, is the open question. See the Arc roadmap item
**Public API webhooks**.

### API key cannot create a project

Sign-in on Arc can add a project by name. An API key can pair a site, or
confirm a site on a project that already exists. An account with no project
has to add one in Arc first.

## Distribution

A release is an annotated tag `vX.Y.Z` and the `pendulum-arc.zip` attached to
the GitHub Release. The zip has `pendulum-arc/` at the top so WordPress can
install it from the Plugins screen. Pin the tag. Do not track `main` on a
production site.

Publishing to npm is not the product. `package.json` is the build toolchain
and is marked private.

## Stability

Treat these as the plugin contract. Changing any of them is a breaking change:

- Option `arc_wordpress_connection`
- REST routes under `pendulum-arc/v1`
- The OAuth client id `arc_app_wordpress` and the redirect back to
  `admin.php?page=pendulum-arc-connect`
