# Roadmap

Status: **alpha**. The connect flow and the score summary are the plugin.
It is not on WordPress.org yet. This repository is the review copy.

## Known gaps

### WordPress.org listing

The plugin slug is `pendulum-arc`. The directory listing is not submitted.
Until it is, install from a GitHub Release zip (`pendulum-arc.zip`) or from
a checkout of `pendulum-arc/` after `npm run build`.

### API key cannot create a project

Sign-in on Arc can add a project by name. An API key can pair a site, or
confirm a site on a project that already exists. An account with no project
has to add one in Arc first.

## Distribution

A release is an annotated tag `vX.Y.Z` and the `pendulum-arc.zip` attached to
the GitHub Release. Pin the tag. Do not track `main` on a production site.

Publishing to npm is not the product. `package.json` is the build toolchain
and is marked private.

## Stability

Treat these as the plugin contract. Changing any of them is a breaking change:

- Option `arc_wordpress_connection`
- REST routes under `pendulum-arc/v1`
- The OAuth client id `arc_app_wordpress` and the redirect back to
  `admin.php?page=pendulum-arc-connect`
