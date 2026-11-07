# Secure print API rollout and rollback

The production workflow deploys every push to `main`. It resets the server to
the validated commit, builds it, and only then restarts PM2. The `prebuild`
printer preflight therefore runs before the active process is replaced. A
failed preflight leaves the currently running website and printer API active.

Printer credentials remain separate from POS credentials. Printer tokens use
the `kprinter_v1_` prefix and `PRINT_TOKEN_PEPPER`; POS keeps `kpos_v1_` and
`POS_TOKEN_PEPPER`.

## Required deployment environment

The production server's `.env` must contain these values before merging:

```text
PRINT_DEPLOYMENT_TARGET=production
PRINT_API_AUTH_MODE=compatibility
PRINT_TOKEN_PEPPER=<at least 32 random bytes>
PRINT_CLIENT_AUTH_READY=false
PRINT_STAGING_BASE_URL=https://<staging-host>
PRINT_PRODUCTION_BASE_URL=https://<production-host>
PRINT_PRODUCTION_ROLLOUT_ACK=legacy-client-verified
```

The two origins must be HTTPS and different. The preflight also infers
`production` from `NEXT_DEPLOY_VALIDATED_SHA`, which is set by the existing SSH
deployment workflow, so omitting `PRINT_DEPLOYMENT_TARGET` cannot bypass the
production checks.

`PRINT_API_AUTH_MODE` has no runtime default:

- `compatibility`: a request with no Authorization header is accepted for the
  legacy client; a supplied invalid credential is rejected.
- `required`: GET and DELETE require an active printer token.
- missing/invalid: the runtime fails closed, and production prebuild fails
  before PM2 restarts.

The pepper is required in both modes because rate-limit keys are hashed. This
is why deploying without preparing the production environment would otherwise
return 500 even in compatibility mode.

## Staging preflight

1. Use a staging database, a staging-only pepper, and a staging URL that is not
   the production hostname.
2. Set `PRINT_API_AUTH_MODE=required` and
   `PRINT_CLIENT_AUTH_READY=true` only when the staging Stage1 client sends the
   documented Bearer token.
3. Create a staging printer device through `POST /api/admin/printer-devices`
   with `queue:read` and `queue:ack`. Store the one-time token only in the
   staging client.
4. Run polling, print, ACK, ACK retry, 401/403/429, rotation, deactivation, and
   controlled recovery tests against staging data.

## Job ownership and recovery

Token rotation does not change `deviceId`, so delivered jobs remain ACK-able by
that device. Device replacement and switching from the legacy compatibility
identity to a new authenticated identity do not silently transfer jobs.

On GET, an unassigned `pending` job is atomically changed to `delivered` and
assigned to exactly one consumer. A delivered job is never returned by another
GET. This avoids automatic duplicate printing after a successful print whose
ACK response was lost, but it cannot prove that paper was physically printed.

Unresolved `delivered` jobs and legacy `pending` jobs that already have an
owner appear in `GET /api/admin/printer-jobs/recovery`. A superadmin must inspect
the physical result and choose one action per job. The old consumer must first
be stopped or deactivated so it cannot print concurrently with recovery:

- `release_not_printed`: only after confirming it was not printed; clears the
  owner and returns the job to `pending`.
- `mark_printed`: only after confirming it was printed; completes it without
  another physical print.

`POST /api/admin/printer-jobs/recovery/[jobId]` requires the expected current
consumer and a 10–500 character reason. The state change and audit history are
written atomically; a concurrent ACK causes a 409 instead of overwriting it.
Unknown physical state is intentionally left unresolved and never auto-requeued.
A GET response lost before reaching the client is handled the same way: the job
remains `delivered` until an operator can safely resolve it.

## Production sequence

1. Before merge, configure production with the compatibility values shown
   above and run the preflight on the server environment.
2. Merge/deploy. Confirm the existing unauthenticated printer still polls and
   ACKs while the website reports the compatibility response header.
3. Separately validate an authenticated Stage1 build against staging.
4. Create the production printer device, install its one-time token in the
   printer client, and verify authenticated polling/ACK during an approved
   maintenance window.
5. Resolve or drain all jobs owned by `printer:legacy-kerman-printer`.
6. Set `PRINT_CLIENT_AUTH_READY=true`, `PRINT_API_AUTH_MODE=required`, and
   `PRINT_PRODUCTION_ROLLOUT_ACK=authenticated-client-verified`; rebuild and
   restart.
7. Verify tokenless GET/DELETE return 401. Do not retain a compatibility route
   after final sign-off.

## Rollback

Before final cutover, restore the explicit compatibility values and rebuild;
do not rotate/deactivate the working token while diagnosing. After final
security sign-off, rollback must not reopen compatibility. Roll back the app or
printer release while keeping authentication required, then use controlled job
recovery for unresolved deliveries.
