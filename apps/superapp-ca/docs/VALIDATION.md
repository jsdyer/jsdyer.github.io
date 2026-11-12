# Validation record

Initial development: 2026-11-12. No production data or user credentials used.

- PHP 8.4.27: syntax checks for all application/CLI/test PHP files passed.
- JavaScript syntax check passed.
- SQLite domain suite: **52 checks passed**. Coverage includes all eight entry kinds, ownership, privacy/discovery, URL schemes, invalid control characters, UTF-8, password hashing, duplicate handles/slugs, length limits, atomic imports, moderation defaults, rate limiting, and cascading account deletion.
- Local HTTP suite: **57 checks passed** against the real PHP application and SQLite. Coverage includes registration, sessions, CSRF, escaped output, create/read/edit/delete authorization, RSS validity and privacy, short links, token CRUD/revocation, guestbook approval, directory submissions, admin denial, exports/imports, password change, CSP, and account deletion.
- Shared-browser review: homepage layout, directory search, commons navigation, /now garden and public /now profile rendered successfully. Screenshots are included. The authenticated backend flows were covered by HTTP tests; no claim of a full authenticated browser, mobile-device or screen-reader audit is made.
- GitHub Actions: **52 domain + 57 HTTP checks passed on each of SQLite and MariaDB 11.8.9**, using Ubuntu 24.04’s PHP 8.3 packages. [Successful run](https://github.com/jsdyer/jsdyer.github.io/actions/runs/43189034523), application commit `037bbb1fd8ab00eca1bb291d56519bdbb3b4094c`. The local sandbox could not bind MariaDB’s Unix socket, so MariaDB verification was performed on GitHub’s runner. Subsequent documentation-only commits do not change the tested application code.
- Docker Compose/Apache configurations were supplied but not built or deployed in this environment. No DNS, live hosting, payment account or production database was changed.

Repeat tests on the deployment target and inspect the CI run associated with the exact deployed commit. This record is not a penetration test, load test or certification.
