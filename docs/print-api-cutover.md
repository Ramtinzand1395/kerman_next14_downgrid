# Secure print API cutover

The printer credential is separate from POS credentials. Printer tokens use
the `kprinter_v1_` prefix and `PRINT_TOKEN_PEPPER`; POS keeps its existing
`kpos_v1_` token and `POS_TOKEN_PEPPER` contract.

`PRINT_API_AUTH_MODE` has no implicit default:

- `required`: GET and DELETE require an active printer device token.
- `compatibility`: an absent Authorization header is accepted for the legacy
  kermanPrinter client. A supplied invalid token is still rejected.
- missing or any other value: GET and DELETE fail closed with 503.

## Staging

1. Set a staging-only `PRINT_TOKEN_PEPPER` with at least 32 bytes and set
   `PRINT_API_AUTH_MODE=required`.
2. As a superadmin, create a printer device through
   `POST /api/admin/printer-devices` with scopes `queue:read` and `queue:ack`.
   Store the returned token in the staging printer once; it is never returned
   again or stored raw by the website.
3. Verify polling, printing, ACK retry, rate limiting, token rotation, and
   deactivation against staging data only.

## Production cutover without stopping legacy printing

1. Before deploying, configure a production printer pepper and explicitly set
   `PRINT_API_AUTH_MODE=compatibility`. This is a temporary, auditable insecure
   window; do not leave it enabled after the printer has a token.
2. Deploy the website. Confirm the legacy printer still polls and ACKs jobs.
3. Create the production printer device and configure kermanPrinter with its
   one-time token.
4. Confirm authenticated polling and ACKs, wait for the queue to drain, then
   set `PRINT_API_AUTH_MODE=required`.
5. Verify requests without a token return 401 and the printer continues to
   process new jobs.

## Rollback

If the authenticated desktop client fails before the final cutover, restore
`PRINT_API_AUTH_MODE=compatibility` and restart/redeploy only the website
configuration. Do not rotate or deactivate the new token while diagnosing.
After the final security sign-off, rollback must not re-open compatibility;
roll back the application version or fix the client instead.
