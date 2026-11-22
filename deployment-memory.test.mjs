import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
function config(sha = '') {
  return spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(require("./next.config.js")))'], {
    cwd: new URL('.', import.meta.url),
    env: { ...process.env, NEXT_DEPLOY_VALIDATED_SHA: sha }, encoding: 'utf8',
  });
}
test('normal builds enforce types; resource-constrained deployment requires an exact source SHA', () => {
  const normal = config();
  assert.equal(normal.status, 0);
  assert.equal(JSON.parse(normal.stdout).typescript.ignoreBuildErrors, false);
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const deployment = config(sha);
  assert.equal(deployment.status, 0);
  assert.equal(JSON.parse(deployment.stdout).typescript.ignoreBuildErrors, true);
  assert.equal(JSON.parse(deployment.stdout).experimental.cpus, 1);
  const mismatch = config('0'.repeat(40));
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /validation SHA does not match/);
});
test('CI publishes a validated main commit and VPS polls outbound without automatic rollout by default', () => {
  const deploy = yaml.load(readFileSync(new URL('./.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const validate = yaml.load(readFileSync(new URL('./.github/workflows/validate.yml', import.meta.url), 'utf8'));
  assert.equal(deploy.jobs.validate.uses, './.github/workflows/validate.yml');
  assert.equal(deploy.jobs.publish.needs, 'validate');
  assert.equal(deploy.jobs.publish.permissions.contents, 'write');
  assert.ok('workflow_call' in validate.on);
  for (const command of ['npm test', 'npx tsc --noEmit', 'npm run build']) {
    assert.ok(validate.jobs.validate.steps.some(step => step.run === command));
  }
  const publish = deploy.jobs.publish.steps.map(step => step.run || '').join('\n');
  assert.match(publish, /refs\/heads\/vps-release/);
  assert.match(publish, /VALIDATED_SHA/);
  assert.doesNotMatch(publish, /ssh -o BatchMode/);
  assert.equal(deploy.concurrency['cancel-in-progress'], false);
  const poll = readFileSync(new URL('./scripts/poll-vps-release.sh', import.meta.url), 'utf8');
  const release = readFileSync(new URL('./scripts/deploy-vps.sh', import.meta.url), 'utf8');
  const backup = readFileSync(new URL('./scripts/backup-vps.sh', import.meta.url), 'utf8');
  assert.match(poll, /HostName=ssh.github.com -p 443/);
  assert.match(poll, /enable-auto-deploy/);
  assert.match(poll, /git show "\$SHA:scripts\/deploy-vps\.sh"/);
  assert.match(release, /git worktree add --detach/);
  assert.match(release, /refs\/remotes\/origin\/vps-release/);
  assert.match(release, /NEXT_DEPLOY_VALIDATED_SHA="\$SHA" npm run build/);
  assert.match(release, /git show "\$SHA:scripts\/backup-vps\.sh"/);
  assert.match(release, /restart_at "\$OLD"/);
  assert.ok(release.indexOf('predeploy') < release.indexOf('npm ci --no-audit --no-fund'));
  assert.match(backup, /mongorestore --config/);
  assert.match(backup, /--dryRun/);
  assert.doesNotMatch(backup, /gzip -t/);
});
