# Superapp API v1

Create a token in **Settings & data**. The plaintext token is shown once; only its SHA-256 hash is stored. One active token per member. Rotation, revocation, password change, password reset and account deletion revoke access. Tokens have full entry read/write access, no automatic expiry and no granular scopes in v1.

Send `Authorization: Bearer TOKEN` over HTTPS. Do not put tokens in query strings or commit them. API routes do not accept session cookies as authentication and do not need a CSRF token. Browser forms require a session plus CSRF.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/me` | Public profile fields for the token owner |
| GET | `/api/entries?offset=0` | Own entries (including private), newest ID first, at most 100 per page |
| POST | `/api/entries` | Create an entry; returns `201 {"id":123}` |
| PATCH | `/api/entries/123` | Update supplied fields on an owned entry |
| DELETE | `/api/entries/123` | Delete an owned entry |

POST/PATCH use JSON objects. Fields: `kind`, `title`, `body`, `slug`, `target_url`, `tags`, `visibility`. Kinds: `status`, `post`, `bookmark`, `paste`, `link`, `lab`, `archive`, `field`. A title and kind are required on creation. Slugs are unique within an account and generated if omitted. Bookmark, link, and archive entries require an HTTP(S) URL. New entries default to `private`. Other visibility values are `unlisted` and `public`.

```bash
read -rs SUPERAPP_TOKEN
export SUPERAPP_TOKEN
curl --fail-with-body 'https://superapp.ca/api/entries' \
  -H "Authorization: Bearer $SUPERAPP_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"kind":"status","title":"Backup checked","body":"Restored a test file successfully.","visibility":"private"}'
unset SUPERAPP_TOKEN
```

For unattended jobs, obtain the token from a private secret file or your own secret manager. The above interactive example does not write it to shell history. A request limit of 180/minute per member and connecting address applies. Validation failures return 422, auth failures 401, missing/other-owned entries 404, excessive requests 429. Bodies over 2 MB are rejected. No CORS is enabled.

Public routes: `/@handle`, `/@handle/now`, `/@handle/uses`, `/@handle/e/slug`, `/s/handle/slug` (destination confirmation), `/@handle/feed.xml`, and `/feed.xml`. RSS includes public entries only. Unlisted entries stay out of RSS and the commons. Discovery opt-out removes community listings but does not make profiles private.

JSON exports are versioned (`format: superapp-export`, `version: 1`). Imports restore entries only, as private, with new slugs and timestamps; they do not restore account credentials, profile settings or moderation decisions. Maximum 500 entries and 2 MB per import; split larger exports into batches. Full JSON account export has no 500-entry restriction.
