# VPS release process (outbound polling)

GitHub validates the exact main commit (tests, TypeScript, Next.js build), then advances `vps-release`. GitHub does **not** connect to the VPS. On the VPS, `scripts/poll-vps-release.sh` fetches this ref outbound via `ssh.github.com:443`, logs new release SHA, and **does not deploy by default**. Once explicitly enabled, the poller invokes the exact commit's `scripts/deploy-vps.sh`; the latter creates a MongoDB predeploy backup and a separate Git worktree, builds it, restarts only the web PM2 app, checks health and rolls back on failed health.

## Testing without modifying production

In a shell as `ramtin`, inspect the latest release without enabling automatic deploy:

```bash
cd ~/projects/kerman_next14_downgrid
# IMPORTANT: run this only once this patch is merged into main and available locally.
SCRIPT=$(mktemp)
GIT_SSH_COMMAND='ssh -o HostName=ssh.github.com -p 443 -o ConnectTimeout=15' git fetch origin main
MAIN_SHA=$(git rev-parse origin/main)
git show "$MAIN_SHA:scripts/poll-vps-release.sh" > "$SCRIPT"
bash "$SCRIPT"
rm -f "$SCRIPT"
```

## Timer installation (later, only after full deployment and restore drill)

Use a dedicated *user* systemd unit/timer to call the poller. The timer should run every 5 minutes with `Persistent=true`. It must use the correct Node/npm/PM2 PATH under nvm, and retain the production user's HOME. Verify manually before enabling automatic deploy. To allow actual deployments, explicitly create `$HOME/projects/kermanatari-deploy/state/enable-auto-deploy` after first successful manual rollout and tested rollback. To disable, remove that file; polling continues reporting only. The `enable-auto-deploy` switch is the safety gate.

## Backups

MongoDB Database Tools must be available. `scripts/backup-vps.sh predeploy` runs before each build and checks the archive using `mongorestore --dryRun`. Install a separate monthly *user* systemd timer for `scripts/backup-vps.sh monthly`; use the same environment, shell and credentials as `ramtin`. Verify with a restore drill into a separate test database and keep encrypted offsite copies. Backups are sensitive files; never commit or upload them to GitHub.

## Important operational safety

Do not enable the deployment timer until the first manual release succeeds and rollback has been tested. Before updating GitHub's release ref, ensure branch permissions prevent unvalidated direct writes to `vps-release`. The main workflow requires full validation. The first PM2 switch entails a short interruption. Do not touch the notification worker.
