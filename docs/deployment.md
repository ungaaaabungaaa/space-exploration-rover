# Local lab and static deployment

`npm start` serves only ten fixed public lab assets on IPv4 loopback at `http://127.0.0.1:8798`. It accepts GET/HEAD, rejects unexpected Host headers, and never exposes the firmware, serial host, repository history or arbitrary paths. It has no write or hardware endpoint.

Run `npm run build` and deploy only `dist/` at the root of a dedicated HTTPS origin. Root-relative paths and module workers require HTTP(S); a file URL or unmodified subdirectory deployment is unsupported. No public deployment is claimed.

Use these equivalent host headers and correct MIME types:

```text
Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
Cache-Control: no-store
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

The lab contains no remote scripts, fonts, analytics, accounts, serial API, service worker or data upload. Its source link contacts GitHub only when selected. A fresh simulation worker can be terminated with Cancel. Export produces a local Blob containing synthetic replay data. Invalid settings are rejected before a run, and output is bounded.
