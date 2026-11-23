import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const first = "a".repeat(40);
const second = "b".repeat(40);

test("poll: disabled deployment, failed release lockout, and a new SHA", (t) => {
  const base = mkdtempSync(join(tmpdir(), "kermanatari-poll-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const repo = join(base, "repo");
  const root = join(base, "deploy");
  const bin = join(base, "bin");
  mkdirSync(repo);
  mkdirSync(join(root, "state"), { recursive: true });
  mkdirSync(bin);
  const git = join(bin, "git");
  writeFileSync(git, `#!/bin/bash
case " $* " in
  *" fetch "*) exit 0 ;;
  *" rev-parse "*) printf '%s\\n' "$MOCK_SHA"; exit 0 ;;
  *" show "*) printf '#!/bin/bash\\nexit %s\\n' "$MOCK_DEPLOY_EXIT"; exit 0 ;;
esac
echo "unexpected git command: $*" >&2
exit 11
`, { mode: 0o755 });
  const state = join(root, "state");
  const script = join(process.cwd(), "scripts/poll-vps-release.sh");
  const run = (sha, exitCode = 42) => spawnSync("bash", [script], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      REPO_DIR: repo,
      DEPLOY_ROOT: root,
      MOCK_SHA: sha,
      MOCK_DEPLOY_EXIT: String(exitCode),
    },
  });

  const disabled = run(first);
  assert.equal(disabled.status, 0, disabled.stderr);
  assert.match(disabled.stdout, /auto-deploy disabled/);

  writeFileSync(join(state, "enable-auto-deploy"), "");
  const failed = run(first);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /repeat attempts blocked/);
  assert.equal(readFileSync(join(state, "failed-auto-deploy"), "utf8").trim(), first);

  const blocked = run(first, 0);
  assert.equal(blocked.status, 0);
  assert.match(blocked.stderr, /previously failed release/);

  const newer = run(second, 0);
  assert.equal(newer.status, 0, newer.stderr);
  assert.equal(existsSync(join(state, "failed-auto-deploy")), false, "marker should be absent after success");
});
