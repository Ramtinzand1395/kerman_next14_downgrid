import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
function config(sha = '') {
  return spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(require("./next.config.js")))'], { cwd: new URL('.', import.meta.url), env: { ...process.env, NEXT_DEPLOY_VALIDATED_SHA: sha }, encoding: 'utf8' });
}
test('normal builds enforce types; resource-constrained deployment requires an exact source SHA', () => {
  const normal = config();
  assert.equal(normal.status, 0);
  assert.equal(JSON.parse(normal.stdout).typescript.ignoreBuildErrors, false);
  const sha = execFileSync('git', ['rev-parse','HEAD'], { encoding: 'utf8' }).trim();
  const deployment = config(sha);
  assert.equal(deployment.status, 0);
  assert.equal(JSON.parse(deployment.stdout).typescript.ignoreBuildErrors, true);
  assert.equal(JSON.parse(deployment.stdout).experimental.cpus, 1);
  const mismatch = config('0'.repeat(40));
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /validation SHA does not match/);
});
test('production waits for the full validation job and builds only its validated commit', () => {
  const deploy = yaml.load(readFileSync(new URL('./.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const validate = yaml.load(readFileSync(new URL('./.github/workflows/validate.yml', import.meta.url), 'utf8'));
  assert.equal(deploy.jobs.validate.uses, './.github/workflows/validate.yml');
  assert.equal(deploy.jobs.deploy.needs, 'validate');
  assert.ok('workflow_call' in validate.on);
  assert.ok(validate.jobs.validate.steps.some(step => step.run === 'npx tsc --noEmit'));
  assert.ok(validate.jobs.validate.steps.some(step => step.run === 'npm run build'));
  assert.ok(validate.jobs.validate.steps.some(step => step.run === 'npm test'));
  const ssh = deploy.jobs.deploy.steps.find(step => step.uses?.startsWith('appleboy/ssh-action@'));
  assert.equal(ssh.env.DEPLOY_COMMIT, '${{ github.sha }}');
  assert.equal(ssh.with.envs, 'DEPLOY_COMMIT');
  assert.ok(ssh.with.script.includes('git reset --hard "$DEPLOY_COMMIT"'));
  assert.ok(ssh.with.script.includes('NEXT_DEPLOY_VALIDATED_SHA="$DEPLOY_COMMIT" npm run build'));
  assert.equal(deploy.concurrency['cancel-in-progress'], false);
  const probeIndex = deploy.jobs.deploy.steps.findIndex(step => step.run === 'node scripts/check-deploy-ssh.mjs');
  const sshIndex = deploy.jobs.deploy.steps.indexOf(ssh);
  assert.ok(probeIndex >= 0 && probeIndex < sshIndex);
  assert.equal(deploy.jobs.deploy.steps[probeIndex].env.SSH_PORT, ssh.with.port);
  assert.equal(ssh.with.timeout, '90s');
  assert.deepEqual(deploy.on.push.branches, ['main']);
  assert.equal(deploy.on.pull_request, undefined);
});
