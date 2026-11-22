# Safe VPS deployment and MongoDB backup (Kerman Atari)

## Safety design

- GitHub PRs only validate. Neither PR builds nor a draft PR can deploy.
- After initial rollout, production deploy can be dispatched manually (Actions > Deploy Production (safe) > Run workflow).
- Automatic deployment after a merge to `main` is **off by default**. Set repository variable `ENABLE_PRODUCTION_AUTO_DEPLOY=true` only after the first manual deployment, rollback drill, and offsite backup are verified.
- The deployment workflow validates the SHA, SSHes into the VPS, performs a **mandatory** pre-deploy MongoDB archive backup, checks out a detached Git worktree into `~/projects/kermanatari-deploy/releases/<sha>`, installs and builds there, verifies `.next/BUILD_ID`, then restarts only the `kermanatari` PM2 process.
- If health check fails, it restarts the previously active release (or original repository for the first migration).
- The notification worker is not restarted.
- **Short interruption during PM2 restart is expected**; this is versioned deployment with rollback, not zero-downtime blue-green.
- Backups remain only on the VPS until a separate encrypted offsite destination is configured. The script retains up to 12 monthly and 30 pre-deploy archives. MongoDB credentials and backups are **never** committed or uploaded to GitHub.

## Bootstrap prerequisites on VPS

1. Confirm Node 24 via nvm, PM2 and MongoDB Database Tools 100.3+ (`mongodump --version`).
2. Confirm `MONGODB_URI` is defined in `~/projects/kerman_next14_downgrid/.env` and the production server can connect to Atlas.
3. Ensure 2-4 GB of extra disk space and adequate swap/RAM for a parallel build. Reserve ~15 GB currently available.
4. Ensure the VPS can fetch GitHub via `ssh.github.com:443`; GitHub Actions SSH should connect to the VPS using a **dedicated restricted deploy key** (not a personal admin key).
5. Configure GitHub Actions secrets `VPS_HOST`, `VPS_USER`, `VPS_DEPLOY_KEY`, `VPS_KNOWN_HOSTS`; variable `VPS_SSH_PORT` (default 22). Obtain the VPS SSH host-key fingerprint through a trusted channel and pin it in `VPS_KNOWN_HOSTS` — **do not trust blind ssh-keyscan**.
6. Make a protected GitHub environment named `production` and require approval for production deployments where supported.

## Backup-only smoke test (no production restart)

From the **updated** repository checkout on VPS, using the same UNIX user as PM2:

```bash
command -v mongodump && mongodump --version
bash scripts/backup-vps.sh predeploy
find ~/projects/kermanatari-deploy/backups -type f -name '*.archive.gz' -ls
```

Check the generated sha256 and gzip archive. Restore test to a **separate empty database/cluster** before trusting the backup as recoverable. Never use `--drop` on production for tests.

## First deploy (after Actions is configured)

Use manual `workflow_dispatch` on the **main** branch with `ENABLE_PRODUCTION_AUTO_DEPLOY` unset/false. Examine logs and both / and /auth/login after the deploy, test OTP and a product preview manually.

The PM2 site process is migrated from its legacy repository cwd to the release worktree; the worker stays on its old directory. The working repository remains intact, but should not be built directly anymore.

## Monthly backups

`monthly-backup.yml` runs 02:15 UTC on day 1 of every month, or by manual dispatch. It requires the same VPS SSH credentials. Backup failures cause the workflow to fail. GitHub stores only job logs, not archive contents.

## Post-deploy / emergency rollback

Do not touch the live `.next`. List releases:

```bash
readlink -f ~/projects/kermanatari-deploy/current
readlink -f ~/projects/kermanatari-deploy/previous
pm2 show kermanatari
```

Manual rollback to the previous release (short interruption, run as PM2 user):

```bash
PREV="$(readlink -f "$HOME/projects/kermanatari-deploy/previous")"
test -f "$PREV/ecosystem.config.cjs" || exit 1
pm2 delete kermanatari
pm2 start "$PREV/ecosystem.config.cjs" --only kermanatari --update-env
curl -f http://127.0.0.1:3000/auth/login
pm2 save
```

No automatic cleanup of old release worktrees occurs in this version. Prune them only after verifying the release is not active and not the rollback target.
