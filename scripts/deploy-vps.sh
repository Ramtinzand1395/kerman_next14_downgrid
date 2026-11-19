#!/usr/bin/env bash
# Run as the PM2 owner, from the production checkout.
set -eo pipefail
cd "$(git rev-parse --show-toplevel)"
state_dir="$(git rev-parse --absolute-git-dir)/vps-deploy"
mkdir -p "$state_dir"
# Keep the lock in flock's parent process so PM2 cannot inherit it.
if [[ ${1:-} != --locked ]]; then
  exec flock --nonblock --conflict-exit-code 0 --close "$state_dir/lock" bash scripts/deploy-vps.sh --locked
fi

export GIT_TERMINAL_PROMPT=0
ssh_transport='ssh -o HostName=ssh.github.com -p 443 -o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=yes'
git -c core.sshCommand="$ssh_transport" fetch --quiet --no-tags origin \
  refs/heads/main:refs/remotes/origin/main \
  refs/heads/vps-release:refs/remotes/origin/vps-release
release_sha=$(git rev-parse 'refs/remotes/origin/vps-release^{commit}')
if [[ -f "$state_dir/deployed" && $(<"$state_dir/deployed") == "$release_sha" && $(git rev-parse HEAD) == "$release_sha" ]]; then
  exit 0
fi
if [[ $(git branch --show-current) != main ]] || ! git diff --quiet HEAD --; then
  echo 'Deployment requires main with no staged or modified tracked files.' >&2
  exit 1
fi
if ! git merge-base --is-ancestor "$release_sha" origin/main || ! git merge-base --is-ancestor HEAD "$release_sha"; then
  echo 'Release is outside main history or would rewind the production checkout.' >&2
  exit 1
fi
echo "Deploying $release_sha"
git merge --ff-only "$release_sha"

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 24
npm ci --no-audit --no-fund
NEXT_DEPLOY_VALIDATED_SHA="$release_sha" npm run build
pm2 startOrRestart ecosystem.config.cjs --only kermanatari --update-env
pm2 save

article_path='/api/blog/%D9%82%D9%81%D9%84-%D8%B4%D8%AF%D9%86-%D8%A8%D8%A7%D8%B2%DB%8C-ps4-%D9%88-ps5'
health_url="http://127.0.0.1:${PORT:-3000}$article_path"
for attempt in {1..12}; do
  if [[ $(curl -s --max-time 20 -o /dev/null -w '%{http_code}' "$health_url") == 200 ]]; then
    printf '%s\n' "$release_sha" > "$state_dir/deployed.tmp"
    mv "$state_dir/deployed.tmp" "$state_dir/deployed"
    echo "Deployment healthy: $release_sha"
    exit 0
  fi
  sleep 5
done
echo 'Production health check failed.' >&2
exit 1
