#!/usr/bin/env bash
# MongoDB archive backup. Run as the PM2 owner; never publish archives to GitHub.
set -Eeuo pipefail
umask 077
MODE="${1:-predeploy}"
case "$MODE" in predeploy|monthly) ;; *) echo "Usage: backup-vps.sh [predeploy|monthly]" >&2; exit 2;; esac
ROOT="${DEPLOY_ROOT:-$HOME/projects/kermanatari-deploy}"
ENV_FILE="${PRODUCTION_ENV_FILE:-$HOME/projects/kerman_next14_downgrid/.env}"
for program in mongodump mongorestore node sha256sum; do
  command -v "$program" >/dev/null || { echo "Missing: $program" >&2; exit 1; }
done
[[ -r "$ENV_FILE" ]] || { echo "Production .env unreadable" >&2; exit 1; }
DIR="$ROOT/backups/$MODE"
mkdir -p "$DIR"
chmod 700 "$ROOT/backups" "$DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DIR/mongo-$STAMP.archive.gz"
TMP_CONFIG="$(mktemp)"
PARTIAL="$OUT.partial"
cleanup() {
  rm -f -- "$TMP_CONFIG"
  [[ -z "${PARTIAL:-}" ]] || rm -f -- "$PARTIAL"
}
trap cleanup EXIT
# Keep credentials out of CLI arguments and stdout.
node --env-file="$ENV_FILE" -e '
  const fs = require("node:fs");
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI missing"); process.exit(1); }
  fs.writeFileSync(process.argv[1], "uri: " + JSON.stringify(uri) + "\n", { mode: 0o600 });
' "$TMP_CONFIG"
mongodump --config="$TMP_CONFIG" --archive="$PARTIAL" --gzip --quiet
[[ -s "$PARTIAL" ]] || { echo "Empty database backup" >&2; exit 1; }
# A mongodump --gzip archive is a MongoDB archive with compressed payloads,
# not necessarily a standalone gzip stream. Validate with MongoDB tools.
mongorestore --config="$TMP_CONFIG" --archive="$PARTIAL" --gzip --dryRun --quiet
mv -- "$PARTIAL" "$OUT"
PARTIAL=""
sha256sum "$OUT" > "$OUT.sha256"
chmod 600 "$OUT" "$OUT.sha256"
echo "Backup archive verified (dry run): $OUT"
# Retention applies only after a new archive has passed validation.
MAX=30; [[ "$MODE" == monthly ]] && MAX=12
mapfile -t OLD < <(find "$DIR" -maxdepth 1 -type f -name 'mongo-*.archive.gz' -printf '%f\n' | sort -r | tail -n "+$((MAX+1))")
for f in "${OLD[@]}"; do rm -f -- "$DIR/$f" "$DIR/$f.sha256"; done
