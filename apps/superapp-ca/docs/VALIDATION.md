# Validation record

Initial development: 2026-11-12. No production data or user credentials used.

- PHP 8.4.27: syntax checks for all application/CLI/test PHP files passed.
- JavaScript syntax check passed.
- SQLite domain suite: **52 checks passed**. Coverage includes all eight entry kinds, ownership, privacy/discovery, URL schemes, invalid control characters, UTF-8, password hashing, duplicate handles/slugs, length limits, atomic imports, moderation defaults, rate limiting, and cascading account deletion.
- Local HTTP suite: **57 checks passed** against the real PHP application and SQLite. Coverage includes registration, sessions, CSRF, escaped output, create/read/edit/delete authorization, RSS validity and privacy, short links, token CRUD/revocation, guestbook approval, directory submissions, admin denial, exports/imports, password change, CSP, and account deletion.
- Shared-browser review: homepage layout, directory search, commons navigation, /now garden and public /now profile rendered successfully. Screenshots are included. The authenticated backend flows were covered by HTTP tests; no claim of a full authenticated browser, mobile-device or screen-reader audit is made.
- MariaDB is covered by the bundled GitHub Actions matrix. A local standalone server could not bind its Unix socket in this development sandbox; local SQLite results do not establish MariaDB compatibility. Check the GitHub workflow result for the current commit.
- Docker Compose/Apache configurations were supplied but not built or deployed in this environment. No DNS, live hosting, payment account or production database was changed.

Repeat tests on the deployment target and inspect the CI run associated with the exact deployed commit. This record is not a penetration test, load test or certification.
