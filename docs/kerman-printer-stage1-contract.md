# kermanPrinter Stage1 secure API contract

This document describes the desktop work needed for staging. It does not claim
that the current production executable already implements these requirements.

## Configuration

- Keep staging and production base URLs in separate settings. The staging
  executable must reject or visibly warn on a production hostname.
- Send the one-time printer token unchanged as
  `Authorization: Bearer kprinter_v1_<43 base64url characters>`.
- Never log, persist in plaintext diagnostics, or show the token after initial
  configuration.

The website accepts this prefix. It is deliberately incompatible with the POS
`kpos_v1_` prefix.

## Poll and ACK

`GET /api/admin/store-order/print` keeps the Stage1 JSON shape:

```json
{ "success": true, "jobExists": true, "payload": ["..."] }
```

Each payload item retains `_id` and `payload`. A successful GET marks those IDs
as delivered and the server will not send them again automatically. After a
physical print, call:

```text
DELETE /api/admin/store-order/print/printed/<jobId>
```

Repeated ACKs return the same successful Stage1 response. The client should
persist a small local journal keyed by website job ID with at least `received`,
`print_started`, `printed`, and `acked` states. If printing succeeded but the
ACK timed out, retry only DELETE; do not print the job again.

There is still no exactly-once physical printing guarantee. A crash between
the printer accepting paper output and the client durably recording `printed`
cannot be resolved by the server. That job must remain in manual recovery until
an operator checks the paper result.

## Error handling

- `401`: missing/invalid/revoked token; stop consuming jobs and require
  credential correction.
- `403`: valid device without the required queue scope; stop and require an
  administrator.
- `429`: respect `Retry-After`; do not tight-loop.
- `500/503`: retain the local journal and retry with bounded exponential
  backoff; never reprint a locally `printed` job.

Staging tests must use a staging MongoDB and staging hostname. They must not
send GET, DELETE, POST, or recovery requests to the shop's production API.
