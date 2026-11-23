#!/usr/bin/env bash
# Outbound-only fetch of already-validated release SHA. Does not touch the live build.
set -Eeuo pipefail
umask 077
REPO="${REPO_DIR:-$HOME/projects/kerman_next14_downgrid}"
ROOT="${DEPLOY_ROOT:-$HOME/projects/kermanatari-deploy}"
SSH_GIT='ssh -o HostName=ssh.github.com -p 443 -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=yes'
mkdir -p "$ROOT/state"
exec 8>"$ROOT/state/poll.lock"
flock -n 8 || exit 0
cd "$REPO"
export GIT_TERMINAL_PROMPT=0
git -c core.sshCommand="$SSH_GIT" fetch --quiet --no-tags origin refs/heads/vps-release:refs/remotes/origin/vps-release
SHA="$(git rev-parse 'refs/remotes/origin/vps-release^{commit}')"
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
OLD="$(cat "$ROOT/state/deployed" 2>/dev/null || true)"
if [[ "$SHA" == "$OLD" ]]; then
  echo "No new validated release"
  exit 0
fi
if [[ ! -f "$ROOT/state/enable-auto-deploy" ]]; then
  echo "New validated release available: $SHA (auto-deploy disabled)"
  exit 0
fi
# A failed build or unhealthy release must not be retried every five minutes.
# A newer validated SHA is tried normally; retrying the same SHA requires
# explicitly removing the marker after diagnosing the failure.
FAILED="$ROOT/state/failed-auto-deploy"
if [[ -f "$FAILED" && "$(cat "$FAILED")" == "$SHA" ]]; then
  echo "Auto-deploy blocked for previously failed release: $SHA (inspect logs, then remove $FAILED to retry)" >&2
  exit 0
fi
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
git show "$SHA:scripts/deploy-vps.sh" > "$TMP"
if bash "$TMP" "$SHA"; then
  rm -f -- "$FAILED"
else
  printf '%s\n' "$SHA" > "$FAILED.tmp"
  mv -f -- "$FAILED.tmp" "$FAILED"
  echo "Auto-deploy failed for $SHA; repeat attempts blocked until reviewed" >&2
  exit 1
fi
