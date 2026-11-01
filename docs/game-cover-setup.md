# Game covers

Game-list items support `imageUrl`, `imageAlt`, and `imagePublicId`. The admin game form can upload a file, paste a Cloudinary URL, edit alt text, preview or detach a cover. The game list and order picker display covers, and the profile game-list API returns the same metadata for frontend use.

Configure the dedicated game account on the application server:

```dotenv
GAME_CLOUDINARY_CLOUD_NAME=aeylqy7h
GAME_CLOUDINARY_API_KEY=
GAME_CLOUDINARY_API_SECRET=
```

These variables are separate from the existing product/blog `CLOUDINARY_*` variables. Game uploads pass credentials per request without mutating shared SDK configuration. Without the dedicated keys, file uploads return 503 with a helpful message; the URL field remains available.

Uploads accept JPEG, PNG, WebP and AVIF up to 5 MiB, convert to WebP and limit dimensions to 1200 × 1200 without cropping. Admin and superadmin roles can manage games and upload covers. URLs must belong to the configured game account. Empty or broken covers have a fallback. Alt text is editable and defaults to the game's name in rendering.

Editing an item through an older client without image fields preserves its existing cover. Explicitly clearing the URL clears all cover metadata. Removing a game or detaching a cover does not destroy Cloudinary assets, which can be shared by several catalogue records.

## Private catalogue migrations

The migration script requires a private manifest passed explicitly, and reads the database named `test`. Catalogue snapshots, audit exports and migration manifests should stay outside this public repository.

```bash
node --env-file=.env scripts/migrate-gamelist-catalog.mjs --manifest /path/to/private-manifest.json
node --env-file=.env scripts/migrate-gamelist-catalog.mjs --manifest /path/to/private-manifest.json --rollback
```

Both commands are read-only previews. Add `--apply` only when ready to write. The script backs up the current documents first, then changes only planned name/image fields. Identity, count and original-value checks stop stale or conflicting migrations; rerunning a completed forward migration does not silently overwrite later edits.

## Validation

The test suite exercises admin authorization, cover creation/edit/removal, legacy client behavior, dedicated SDK credentials, validation, and guarded migration/rollback behavior. A real upload requires configured credentials and must be checked on the target server.
