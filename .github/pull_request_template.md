## What and why

<!-- One or two sentences. What changes, and what problem it solves. -->

## Checklist

- [ ] `composer test`, `composer lint`, `npm run lint:js`, `npm test` and `npm run build` pass
- [ ] Meaningful tests for new rules and boundaries
- [ ] Docs updated in this change (`docs/`, `README.md`, `ROADMAP.md`, `pendulum-arc/readme.txt`) if behaviour moved
- [ ] ASCII hyphens only - no en or em dashes
- [ ] Commit messages are tag-line only (`[ADD] ...`)

## Plugin

- [ ] `package.json`, the plugin header, and `Stable tag` in `pendulum-arc/readme.txt` still agree
- [ ] A connection secret is stored sealed, and is not written into a notice, a log, or the page

## Breaking changes

<!-- The stored connection option, the REST routes under pendulum-arc/v1, and the
     score card fields the dashboard reads are the plugin contract. -->

- [ ] No contract change, or the break is described above and the version bump reflects it
