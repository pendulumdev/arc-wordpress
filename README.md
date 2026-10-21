# Arc Analytics for WordPress

[![Status][Status-shield]][Status-url]
[![Docs][Docs-shield]][Docs-url]
[![License][License-shield]][License-url]

[![Pendulum][Pendulum-shield]][Pendulum-url]
[![WordPress][WordPress-shield]][WordPress-url]
[![PHP][PHP-shield]][PHP-url]

Connects a WordPress site to a [Pendulum Arc](https://arc.pendulumdev.co.uk)
account. The git repo is `arc-wordpress`. The plugin WordPress loads, and the
slug for WordPress.org, is `pendulum-arc`.

## What this plugin does

**Scores for this site, on the WordPress dashboard.** Sign in on Arc, or paste
an API key. Arc pairs an existing site or adds this one. The dashboard then
shows the latest scores.

It is a WordPress plugin, not the Arc portal. Reports stay in Arc. This
install only stores the connection and reads the scores.

**Cookie consent, on the site.** GDPR Consent, under the Arc menu, is a
local banner. It does not call Arc and it works before the site is paired.
Visitors can accept or decline. Optional cookies stay off until they are
accepted, and scripts listed on those cookies do not run until then.
Decline refuses every optional cookie. A consent log is off until an
administrator turns it on. A static banner is printed at the end of the
theme header or footer. A fixed banner is positioned on the screen. Disable,
on the Behaviour tab, turns the banner off and leaves script tags unchanged.

- **Arc sign-in** - the browser goes to Arc, which pairs a site or creates
  one, including a project name when the studio needs a new project. WordPress
  stores the site that comes back with the token.
- **API key** - pairs a matching site from WordPress. When nothing matches,
  you confirm the site name, URL, and project here. A key with no project
  sends you to Arc to add one.
- **Sealed token** - the connection is encrypted with sodium before it is
  saved. Disconnect stops this install reading Arc. The site and its reports
  stay in Arc.

## Documentation

- [`pendulum-arc/readme.txt`](pendulum-arc/readme.txt) - the WordPress.org listing
- [`docs/security.md`](docs/security.md) - what this plugin sends and stores
- [`docs/releasing.md`](docs/releasing.md) - tag a release and the notes format
- [`ROADMAP.md`](ROADMAP.md) - what is in, and what is not scheduled

## Repository layout

```
pendulum-arc/   the plugin WordPress loads (slug pendulum-arc)
docs/           security and release notes
dev/            local wp-env bridge, not part of the plugin zip
tests/          PHPUnit, no WordPress load
```

## Install

Requires **WordPress 6.7+** and **PHP 8.1+** with the sodium extension.

The directory listing is not published yet. Until it is, install the
`pendulum-arc.zip` attached to a GitHub Release, or from a checkout:

```bash
git clone https://github.com/pendulumdev/arc-wordpress.git
cd arc-wordpress
npm install
npm run build
```

Copy `pendulum-arc/` into `wp-content/plugins/` and activate it. Open Arc
Analytics, then Settings.

After a public release, WordPress lists a newer version on the Plugins
screen. Update now installs `pendulum-arc.zip` from that release, and
automatic updates install that same zip. Automatic updates are turned on
until they are disabled on the Plugins screen. The Arc screens link to the
same update. A private repository does not offer one, because GitHub does
not publish the release without a token.

The issued OAuth client id is `arc_app_wordpress`. Arc must store that id
before sign-in works. Override it with `ARC_WORDPRESS_OAUTH_CLIENT_ID` in
`wp-config.php`.

Set `ARC_WORDPRESS_ENV` to `preview` to use the preview portal and API. An
`arc_test_` key always talks to preview. An `arc_live_` key always talks to
production.

## Develop

```bash
composer install
npm install
npm run hooks
npm run build
composer test
composer lint
npm test
npm run env:start
```

`npm run build` writes `pendulum-arc/build/`, which WordPress loads. That
directory is part of the plugin, so commit it with the source.
`npm run env:start` loads `dev/local-arc.php`, which points this install at
a local Arc. That file is not in the release zip.

Plugin Check, before a WordPress.org upload:

```bash
npm run plugin-check
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Versioning and tags

- Version source of truth: root `package.json`, the plugin header
  (`Version` and `ARC_WORDPRESS_VERSION`), and `Stable tag` in
  `pendulum-arc/readme.txt`. Those must match.
- A release is an annotated git tag `vX.Y.Z` on `main`
- Consumers should pin the tag, not a branch
- Write `docs/releases/vX.Y.Z.md` first - the workflow publishes that file
  as the GitHub Release body and attaches `pendulum-arc.zip`. Format and
  steps: [`docs/releasing.md`](docs/releasing.md)

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin main --tags
```

Pushing the tag runs the release workflow, which refuses to publish if the
tag and the version fields disagree. It then re-runs the full gate against
the tagged commit and publishes a GitHub release.

## Limits (intentional)

- An API key cannot create an Arc project. Sign-in can.
- Disconnect does not delete the site or its reports in Arc
- Needs the PHP sodium extension to store a connection
- Does not edit Arc report settings. Those stay in the portal

## Contributing

Issues and pull requests are welcome at
[`pendulumdev/arc-wordpress`](https://github.com/pendulumdev/arc-wordpress).
Prefer small, single-purpose changes. Start with
[CONTRIBUTING.md](CONTRIBUTING.md); report vulnerabilities per
[SECURITY.md](SECURITY.md).

## Contributors

- **[Pendulum](https://pendulumdev.co.uk)** - lead development and maintenance
- **[Devhalls](https://github.com/devhalls)** - primary author

## License

**GPL-2.0-or-later** - full text in [`LICENSE`](LICENSE). The same text is
copied to [`pendulum-arc/license.txt`](pendulum-arc/license.txt) so the plugin
directory stands alone. Third-party notices in [`NOTICE`](NOTICE).

---

<!-- Badge definitions (reference-style; for-the-badge, black) -->
[Pendulum-shield]: https://img.shields.io/badge/pendulum-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmlld0JveD0iMCAwIDE2NSAxNjUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0ibGluZWFyLWdyYWRpZW50IiB4MT0iMCIgeTE9IjgzLjUiIHgyPSIxNjEuMzkiIHkyPSI4My41IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTY2KSBzY2FsZSgxIC0xKSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzMyYjdkNiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2Y0OTYzYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxNjUiIGhlaWdodD0iMTY1IiBzdHlsZT0iZmlsbDp1cmwoI2xpbmVhci1ncmFkaWVudCk7Ii8+PHBhdGggZD0iTTU0LjA4LDEzM2gtMjUuOThWMzMuMDNoNDEuMzZjMTEuMjIsMCwxOS44MiwyLjkyLDI1Ljc4LDguNzVzOC45NSwxNC4wNSw4Ljk1LDI0LjY2LTIuOTgsMTguODMtOC45NSwyNC42NmMtNS45Niw1LjgzLTE0LjU2LDguNzUtMjUuNzgsOC43NWgtMTUuMzhzMCwzMy4xNSwwLDMzLjE1Wk01NC4wOCw3OC45aDguNjJjOS41NCwwLDE0LjMyLTQuMTUsMTQuMzItMTIuNDZzLTQuNzctMTIuNDYtMTQuMzItMTIuNDZoLTguNjJ2MjQuOTNoMFpNMTQzLjEsMzNsLTI2LjExLDEwMGgtMjVsMjYuMTEtMTAwaDI1WiIgc3R5bGU9ImZpbGw6I2ZmZjsiLz48L3N2Zz4=
[Pendulum-url]: https://pendulumdev.co.uk/
[Status-shield]: https://img.shields.io/badge/status-alpha-000000?style=for-the-badge
[Status-url]: ROADMAP.md
[WordPress-shield]: https://img.shields.io/badge/WordPress-6.7+-000000?style=for-the-badge&logo=wordpress
[WordPress-url]: https://wordpress.org/
[PHP-shield]: https://img.shields.io/badge/PHP-8.1+-000000?style=for-the-badge&logo=php
[PHP-url]: https://www.php.net/
[Docs-shield]: https://img.shields.io/badge/docs-000000?style=for-the-badge&logo=readthedocs
[Docs-url]: docs/
[License-shield]: https://img.shields.io/badge/license-GPL--2.0--or--later-000000?style=for-the-badge
[License-url]: LICENSE
