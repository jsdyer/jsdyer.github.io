# Security and deployment

Timefold is a single-owner personal archive. Keep its port on localhost, or
put it behind your own HTTPS reverse proxy. Use a unique owner password.
Sessions protect reads as well as edits; all mutations require a CSRF token.
There is no public sharing endpoint or remote URL fetcher.

Only `public/` belongs in an Apache document root. The database configuration,
password hash, attachments, import staging files, and SQLite database live
outside it. Do not serve the repository root. Never commit `.env`,
`config.local.php`, `var/` contents, or your backup files.

Attachments are stored by their SHA-256 digest. JPEG, PNG, and WebP can be
previewed; all other attachment types are served as downloads. An uploaded PHP
file is data, not a script. The application never executes attachments.

Exported backups contain your notes and original attachments in readable form.
Store them privately; exports are not encrypted. Use the built-in export rather
than copying a live database alone, because attachments are separate files.

For a suspected vulnerability, use GitHub's private vulnerability reporting
when enabled, or contact the repository owner privately. Do not attach real
archive data, passwords, or configuration files to a public issue.
