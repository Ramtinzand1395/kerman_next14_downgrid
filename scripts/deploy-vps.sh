#!/usr/bin/env bash
# Versioned VPS deployment, leaves the live .next untouched until the candidate is built.
set -Eeuo pipefail
umask 077
SHA="${1:-}"
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || { echo "Expected full validated commit SHA" >&2; exit 2; }
REPO="${REPO_DIR:-$HOME/projects/kerman_next14_downgrid}"
ROOT="${DEPLOY_ROOT:-$HOME/projects/kermanatari-deploy}"
ENV_FILE="${PRODUCTION_ENV_FILE:-$REPO/.env}"
PORT="${PORT:-3000}"
[[ "$PORT" =~ ^[0-9]{2,5}$ ]] || exit 2
command -v flock >/dev/null || exit 1
command -v git >/dev/null || exit 1
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] || { echo "nvm missing" >&2; exit 1; }
source "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null
command -v node >/dev/null || { echo "Node.js missing" >&2; exit 1; }
command -v pm2 >/dev/null || { echo "PM2 missing" >&2; exit 1; }
mkdir -p "$ROOT/releases" "$ROOT/state"
exec 9>"$ROOT/state/deploy.lock"
flock -n 9 || { echo "Another deployment is running"; exit 1; }
[[ -r "$ENV_FILE" ]] || { echo "Missing production .env" >&2; exit 1; }
cd "$REPO"
export GIT_TERMINAL_PROMPT=0
SSH_GIT='ssh -o HostName=ssh.github.com -p 443 -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=yes'
git -c core.sshCommand="$SSH_GIT" fetch --quiet --no-tags origin refs/heads/main:refs/remotes/origin/main refs/heads/vps-release:refs/remotes/origin/vps-release
RELEASE_SHA="$(git rev-parse refs/remotes/origin/vps-release^{commit})"
[[ "$RELEASE_SHA" == "$SHA" ]] || { echo "Refusing deployment: SHA is not the published validated release" >&2; exit 1; }
git merge-base --is-ancestor "$SHA" origin/main || { echo "Validated release is not an ancestor of main" >&2; exit 1; }
[[ "$(git cat-file -t "$SHA")" == commit ]] || exit 1
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "Tracked changes in production checkout; refusing" >&2; exit 1; }
CURRENT="$(readlink -f "$ROOT/current" 2>/dev/null || true)"
if [[ -f "$ROOT/state/deployed" && "$(cat "$ROOT/state/deployed")" == "$SHA" ]] && [[ -n "$CURRENT" ]]; then
  echo "Already deployed $SHA"; exit 0
fi
# A failed backup is a hard stop, before any npm install/build.
BACKUP_SCRIPT="$(mktemp)"
trap 'rm -f -- "$BACKUP_SCRIPT"' EXIT
git show "$SHA:scripts/backup-vps.sh" > "$BACKUP_SCRIPT"
bash "$BACKUP_SCRIPT" predeploy
RELEASE="$ROOT/releases/$SHA"
if [[ ! -d "$RELEASE" ]]; then
  git worktree add --detach "$RELEASE" "$SHA"
fi
[[ "$(git -C "$RELEASE" rev-parse HEAD)" == "$SHA" ]] || { echo "Release SHA mismatch" >&2; exit 1; }
# Use the same production env while keeping credentials outside the release tree.
ln -sfn "$ENV_FILE" "$RELEASE/.env"
# Ensure a fully isolated build, even when retrying an interrupted release.
rm -rf "$RELEASE/.next"
cd "$RELEASE"
npm ci --no-audit --no-fund
NODE_OPTIONS="--max-old-space-size=1536" NEXT_DEPLOY_VALIDATED_SHA="$SHA" npm run build
[[ -s "$RELEASE/.next/BUILD_ID" ]] || { echo "Missing BUILD_ID" >&2; exit 1; }
[[ -s "$RELEASE/.next/server/pages/_error.js" ]] || { echo "Incomplete server bundle" >&2; exit 1; }
compgen -G "$RELEASE/.next/static/chunks/webpack-*.js" >/dev/null || { echo "Missing webpack chunks" >&2; exit 1; }
# WARNING: PM2 fork mode has a short restart interruption. This is not zero-downtime.
# First rollout uses the existing repository as the rollback target.
OLD="$CURRENT"
[[ -n "$OLD" ]] || OLD="$REPO"
OLD_SHA="$(cat "$ROOT/state/deployed" 2>/dev/null || true)"
restart_at() {
  local target="$1"
  pm2 delete kermanatari >/dev/null 2>&1 || true
  pm2 start "$target/ecosystem.config.cjs" --only kermanatari --update-env
}
health() {
  local target="$1"
  local i status chunk
  [[ -s "$target/.next/BUILD_ID" ]] || { echo "Missing build for health target: $target" >&2; return 1; }
  chunk="$(find "$target/.next/static/chunks" -maxdepth 1 -name 'webpack-*.js' -type f -printf '%f\n' -quit)"
  [[ -n "$chunk" ]] || { echo "Missing webpack chunk for health target: $target" >&2; return 1; }
  for i in {1..15}; do
    status="$(curl -sS -L --max-time 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/auth/login" 2>/dev/null || true)"
    if [[ "$status" == 200 ]]; then
      status="$(curl -sS --max-time 8 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/_next/static/chunks/$chunk" 2>/dev/null || true)"
      [[ "$status" == 200 ]] && return 0
    fi
    sleep 3
  done
  return 1
}
echo "Activating $SHA"
if ! restart_at "$RELEASE" || ! health "$RELEASE"; then
  echo "Candidate unhealthy; restoring $OLD" >&2
  if restart_at "$OLD" && health "$OLD"; then
    pm2 save >/dev/null
    echo "Rollback healthy: $OLD" >&2
  else
    echo "CRITICAL: Rollback start or health check failed; investigate PM2 immediately" >&2
  fi
  exit 1
fi
ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
ln -sfn "$OLD" "$ROOT/previous.next"
mv -Tf "$ROOT/previous.next" "$ROOT/previous"
printf '%s\n' "$SHA" > "$ROOT/state/deployed.tmp"
mv "$ROOT/state/deployed.tmp" "$ROOT/state/deployed"
pm2 save >/dev/null
echo "Healthy release: $SHA; previous was ${OLD_SHA:-legacy}"
