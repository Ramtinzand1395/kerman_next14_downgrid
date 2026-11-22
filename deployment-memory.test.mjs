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
    env: { ...process.env, NEXT_DEPLOY_VALIDATED_SHA: sha },
    encoding: 'utf8',
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

test('production validates the exact commit before invoking the isolated VPS release workflow', () => {
  const deploy = yaml.load(readFileSync(new URL('./.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const validate = yaml.load(readFileSync(new URL('./.github/workflows/validate.yml', import.meta.url), 'utf8'));
  const monthly = yaml.load(readFileSync(new URL('./.github/workflows/monthly-backup.yml', import.meta.url), 'utf8'));
  assert.equal(deploy.jobs.validate.uses, './.github/workflows/validate.yml');
  assert.equal(deploy.jobs.deploy.needs, 'validate');
  assert.equal(deploy.jobs.deploy.environment, 'production');
  assert.match(deploy.jobs.deploy.if, /ENABLE_PRODUCTION_AUTO_DEPLOY/);
  assert.equal(deploy.concurrency['cancel-in-progress'], false);
  assert.ok('workflow_call' in validate.on);
  for (const command of ['npm test', 'npx tsc --noEmit', 'npm run build']) {
    assert.ok(validate.jobs.validate.steps.some(step => step.run === command));
  }
  const remote = deploy.jobs.deploy.steps.map(step => step.run || '').join('\n');
  assert.match(remote, /StrictHostKeyChecking=yes/);
  assert.match(remote, /git show "\$SHA:scripts\/deploy-vps\.sh"/);
  assert.match(remote, /bash "\$TEMP_SCRIPT" "\$SHA"/);
  assert.doesNotMatch(remote, /git push origin/);

  const script = readFileSync(new URL('./scripts/deploy-vps.sh', import.meta.url), 'utf8');
  assert.match(script, /git worktree add --detach/);
  assert.match(script, /NEXT_DEPLOY_VALIDATED_SHA="\$SHA" npm run build/);
  assert.match(script, /git show "\$SHA:scripts\/backup-vps\.sh"/);
  assert.match(script, /restart_at "\$OLD"/);
  assert.ok(script.indexOf('predeploy') < script.indexOf('npm ci --no-audit --no-fund'));

  const backup = readFileSync(new URL('./scripts/backup-vps.sh', import.meta.url), 'utf8');
  assert.match(backup, /mongorestore --config/);
  assert.match(backup, /--dryRun/);
  assert.doesNotMatch(backup, /gzip -t/);
  assert.equal(monthly.concurrency.group, deploy.concurrency.group);
  assert.match(monthly.on.schedule[0].cron, /1 \* \*$/);
});
