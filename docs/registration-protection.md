# Registration protection

## Container images

Registration protection is included in the `latest` image published from `main`.

The `registration-protection` image tag follows the `codex/registration-protection`
branch after source checks, security/browser tests and container smoke tests pass
on both supported architectures. Use it in an existing Compose service:

```yaml
image: ghcr.io/benfayzen/wishlist:registration-protection
```

Keep existing data/upload volumes and `env_file` settings. Immutable
`sha-<full-commit-sha>` tags are also published for pinning a verified revision.
Back up data and uploads before upgrading because startup applies migrations.

## Configuration

Registration limits are enabled by default: three successfully created accounts
per network over a rolling hour, and ten signup submissions per rolling ten
minutes. Configure the `REGISTRATION_*` variables in `.env.example`; use
`REGISTRATION_RATE_LIMIT_ENABLED=false` to disable both limits explicitly.
Windows are in seconds (1–86400); counts accept integers from 1–10000.
Restart the application after configuration changes.

For Cloudflare Turnstile, create a **Managed** widget for your hostname and set:

```dotenv
ORIGIN=https://wishlist.example.com
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=your-public-site-key
TURNSTILE_SECRET_KEY=your-private-secret-key
```

Turnstile is disabled by default. Enabling it without valid configuration rejects
registrations. Only the public site key reaches the browser. The backend checks
`success`, the exact hostname from `ORIGIN`, and action `signup` before creating
an account. Expired/consumed tokens are replaced after a form submission; network
errors do not bypass verification. Users need JavaScript when Turnstile is on.
Only registration pages load the external script. If you deploy a CSP, allow the
Cloudflare script/frame according to the official Turnstile CSP guidance.
Cloudflare receives browser verification traffic; account fields and passwords
are not included in Siteverify requests. Review your privacy notice for this
external service before enabling it.

## Trusted client addresses

The application uses SvelteKit's `getClientAddress()`. With a reverse proxy,
configure `ADDRESS_HEADER` and, for `X-Forwarded-For`, the correct `XFF_DEPTH`.
The proxy must overwrite/sanitize forwarded headers; the app port must not be
publicly reachable around that trusted proxy. Never trust a caller-supplied IP
header directly. A Cloudflare-only deployment can use `ADDRESS_HEADER=CF-Connecting-IP`
provided direct origin access is restricted and intermediate proxies preserve it
securely. Validate this against the real deployment before enabling public signup.

The bundled image already places Caddy in front of Node. If another reverse proxy
precedes Caddy, configure Caddy's trusted proxies for that specific upstream and
verify the forwarded chain before choosing `XFF_DEPTH`. Caddy ignores untrusted
incoming forwarded values by default; setting `ADDRESS_HEADER` alone cannot
recover a client address discarded earlier in the chain. See
[Caddy's header handling](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers).

IPv4-mapped IPv6 addresses are normalized. IPv6 uses /64 networks by default to
limit address rotation; `REGISTRATION_IPV6_PREFIX=128` uses individual addresses.
Shared networks can reach the limit legitimately. Responses show a wait time and
HTTP 429 with `Retry-After`; the browser form retains its fields.

## Persistence and scope

A Prisma migration adds only `registration_event`; existing account data is not
modified. Back up the database before deployment. Startup's existing migration
process applies it. An older image ignores the added table, but code rollback
does not remove database migrations.

Counters use HMAC-SHA256 keys, never raw IP addresses. By default a random secret
is generated once in private `system_config`; it is excluded from page config.
Alternatively set a stable `REGISTRATION_IP_HASH_SECRET`. Changing the secret
resets effective quotas. Expired records are removed on registration activity;
there is no background retention job. Do not treat pseudonymous keys as anonymous.
If shortening windows, old records can remain until their original expiry;
lengthening a window cannot recover already-expired counters.

Account quota and account/group/list/invitation creation commit in one SQLite
transaction; failed creation rolls back the successful-account counter. The
attempt quota is independent and counts rejected/invalid submissions too.

- Password signup, initial setup and invitations: both limits and optional Turnstile.
  Invitation POSTs must prove possession of the original secret; redemption is atomic.
- OIDC and trusted-header authentication: limits apply only when creating a new
  local account. Bot verification belongs to the upstream identity provider;
  Turnstile on `/signup` does not protect an openly registering identity provider.
- Existing logins and admin-created accounts: excluded from registration quotas.
- Public guest-claim profiles are not login accounts and remain outside this feature.

No IP rule or CAPTCHA stops distributed bots or paid solving services completely.
Email confirmation is a separate possible follow-up.

## Validation

Run checks and builds sequentially: both write generated files in `.svelte-kit`.
The HTTP suite also needs Playwright Chromium (`pnpm test:setup`).

```sh
pnpm exec prisma generate
pnpm check
pnpm build
node --import tsx --test tests/security/registration.node.ts
node --import tsx --test tests/security/registration-http.node.ts
```

The security tests use a disposable SQLite database, covering concurrent limits,
rollback, reconnect persistence, expiration, IP normalization, strict configuration
and Turnstile success/error responses. The HTTP/browser suite applies all migrations
to a disposable database and tests desktop/mobile forms. Cloudflare responses in
that suite are simulated by a Node preload confined to the test process. Real Cloudflare keys and production proxy
configuration require a deployment-specific verification.

References: [Cloudflare validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Cloudflare CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/),
[SvelteKit trusted addresses](https://svelte.dev/docs/kit/adapter-node#ADDRESS_HEADER-and-XFF_DEPTH).
