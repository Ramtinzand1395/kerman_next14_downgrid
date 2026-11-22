#!/usr/bin/env bash
# MongoDB archive backup; invoke from the VPS as the production account.
set -Eeuo pipefail
umask 077
MODE="${1:-predeploy}"
case "$MODE" in predeploy|monthly) ;; *) echo "Usage: backup-vps.sh [predeploy|monthly]" >&2; exit 2;; esac
ROOT="${DEPLOY_ROOT:-$HOME/projects/kermanatari-deploy}"
ENV_FILE="${PRODUCTION_ENV_FILE:-$HOME/projects/kerman_next14_downgrid/.env}"
command -v mongodump >/dev/null || { echo "mongodump missing (install MongoDB Database Tools)" >&2; exit 1; }
command -v node >/dev/null || { echo "Node.js missing" >&2; exit 1; }
[[ -r "$ENV_FILE" ]] || { echo "Production .env unreadable" >&2; exit 1; }
DIR="$ROOT/backups/$MODE"
mkdir -p "$DIR"
chmod 700 "$ROOT/backups" "$DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DIR/mongo-$STAMP.archive.gz"
TMP_CONFIG="$(mktemp)"
trap 'rm -f "$TMP_CONFIG"; if [[ -n "${PARTIAL:-}" ]]; then rm -f "$PARTIAL"; fi' EXIT
# Pass credentials in a mode-600 config rather than as a mongodump CLI argument.
node --env-file="$ENV_FILE" -e '
  const fs=require("node:fs");
  const uri=process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI missing"); process.exit(1); }
  fs.writeFileSync(process.argv[1], "uri: "+JSON.stringify(uri)+"\n", {mode:0o600});
' "$TMP_CONFIG"
PARTIAL="$OUT.partial"
mongodump --config="$TMP_CONFIG" --archive="$PARTIAL" --gzip --quiet
[[ -s "$PARTIAL" ]] || { echo "Empty database backup" >&2; exit 1; }
gzip -t "$PARTIAL"
mv "$PARTIAL" "$OUT"
PARTIAL=""
sha256sum "$OUT" > "$OUT.sha256"
chmod 600 "$OUT" "$OUT.sha256"
echo "Backup verified: $OUT"
# Keep 12 monthly backups and up to 30 pre-deploy backups, not including offsite copies.
MAX=30; [[ "$MODE" == monthly ]] && MAX=12
mapfile -t OLD < <(find "$DIR" -maxdepth 1 -type f -name 'mongo-*.archive.gz' -printf '%f\n' | sort -r | tail -n "+$((MAX+1))")
for f in "${OLD[@]}"; do rm -f -- "$DIR/$f" "$DIR/$f.sha256"; done
