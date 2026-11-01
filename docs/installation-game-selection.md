# Installation request game selection

The `/my-profile?step=6` appointment wizard now places game selection between service/device and fulfillment. Repair requests skip game selection. Xbox is an installation device with no installation type.

## Catalog compatibility

| Device | Installation type | `gamelist.platform` collections | Visible version tags |
| --- | --- | --- | --- |
| PS4 | account | `ps4` | PS4 |
| PS4 | copy | `copy` (also accepts `ps4copy` / `ps4Copy`) | PS4 |
| PS5 | account | `ps5`, `ps4` | PS5, PS4 |
| PS5 | copy | `ps5Copy` (also accepts `ps5copy`), `copy` | PS5, PS4 |
| Xbox | none | `xbox` | Xbox |

`GET /api/profile/appointments/games` requires an authenticated user, checks the device/type combination, merges compatible catalogs, then searches and paginates the combined result. Default page size is 24 (maximum 48). The old `/api/profile/game-list` contract remains available to other consumers.

The picker supports search, pagination, cover fallback, selected chips, individual removal, clear all, and at most 100 selections. Selecting another device or installation type clears the old selections. The courier address detour retains selected games in draft version 2.

## Persistence and display

The client submits only `selectedGames: [{ platform, gameId }]`. The server resolves each reference against the compatible current catalog, rejects duplicates/deleted/incompatible entries, and computes `totalSizeGB`. Client titles, images, sizes and totals are ignored. The appointment stores historical snapshots in `selectedGames` (ID, platform, name, version, size, cover metadata), plus `totalSizeGB`.

Unknown sizes are stored as `null`, excluded from the known total, and explicitly counted in the UI. Zero remains a known size. Volume is approximate and does not set service prices or enforce a device storage capacity.

Admin appointment cards show the count and stored volume. The admin details drawer, customer appointment history, and confirmation step use the shared game summary. Existing appointments without games remain readable; no backfill or catalog changes are needed. New installation requests must select at least one game.

Selected references are sorted before the idempotency hash is computed: changing only selection order reuses a request, while changing the actual selection rejects reuse of its key. Completed retries retain the existing snapshot even after catalog changes.

## Validation

`installation-games.test.mjs` exercises the compatibility matrix, alias/version mapping, unknown sizes, invalid/duplicate/oversized selection rejection, request validation, server snapshots and total, in-store and courier registration, idempotency, courier draft preservation, authenticated combined pagination/search, and the Mongoose schema including legacy appointments. These use isolated fixtures and model stubs; no production data is written.

Run `npm test`, `npx tsc --noEmit`, and `npm run build`.

Browser validation remains necessary with a signed-in preview and a configured test MongoDB. Browser access was unavailable in the implementation environment, so visual layout and a real database round trip have not been claimed as verified.

Manual checks:

1. On mobile and desktop, select each row of the compatibility table and check tags/covers, totals, search, pagination, removal, and clear all.
2. Select games across pages, go back, change device/type, and verify old selections clear. Repair must go directly from service/device to fulfillment.
3. Complete both in-store and courier requests in a test database; inspect the same names, versions, and volume in customer history, admin cards, and admin details.
4. Add an address during the courier flow and return; game selection and the new address must remain selected.
5. Remove or edit a catalog item after registration; the original request must retain its historical snapshot. Older requests must still render.
