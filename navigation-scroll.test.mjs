import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Execute the real component; simulate route commits, history events and layout
// frames without requiring a running application or a database.
function harness() {
  let pathname = "/cart", search = new URLSearchParams(), refIndex = 0, effectIndex = 0, nextFrame = 0;
  const refs = [], effects = [], pending = [], calls = [], listeners = new Map(), frames = new Map();
  const element = { scrollTo: (options) => calls.push({ target: "document", ...options }) };
  const window = {
    location: { hash: "" },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    scrollTo: (options) => calls.push({ target: "window", ...options }),
  };
  const document = { documentElement: element, querySelector: () => null };
  const dependencies = {
    react: {
      useRef: (value) => refs[refIndex++] ??= { current: value },
      useLayoutEffect: (callback, deps) => {
        const index = effectIndex++;
        if (effects[index]?.deps.every((value, i) => value === deps[i])) return;
        pending.push(() => {
          effects[index]?.cleanup?.();
          effects[index] = { deps, cleanup: callback() };
        });
      },
    },
    "next/navigation": { usePathname: () => pathname, useSearchParams: () => search },
  };
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync("app/components/navigation/NavigationScroll.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", "window", "document", "requestAnimationFrame", "cancelAnimationFrame", compiled)(
    (name) => { assert.ok(Object.hasOwn(dependencies, name)); return dependencies[name]; }, module, module.exports, window, document,
    (callback) => { frames.set(++nextFrame, callback); return nextFrame; }, (id) => frames.delete(id),
  );
  return {
    render(url, pop = false) {
      const next = new URL(url, "https://example.test");
      pathname = next.pathname; search = next.searchParams; window.location.hash = next.hash;
      calls.length = 0;
      if (pop) listeners.get("popstate")?.();
      refIndex = 0; effectIndex = 0;
      module.exports.default();
      while (pending.length) pending.shift()();
      for (const [id, callback] of frames) { frames.delete(id); callback(); }
      return calls;
    },
  };
}

test("every forward/back checkout step change resets document and window to the top", () => {
  const h = harness();
  h.render("/cart?step=1");
  for (const step of [2, 3, 2, 1, 3]) {
    const calls = h.render(`/cart?step=${step}`);
    assert.ok(calls.some((call) => call.target === "window"), `step ${step}`);
    assert.ok(calls.every((call) => call.top === 0 && call.left === 0 && call.behavior === "instant"));
  }
});

test("browser back/forward across checkout steps also starts the new step at the top", () => {
  const h = harness();
  h.render("/cart?step=3");
  for (const step of [2, 1, 2, 3]) assert.ok(h.render(`/cart?step=${step}`, true).length > 0, `history step ${step}`);
});

test("same-step changes keep position and an omitted checkout step equals step one", () => {
  const h = harness();
  h.render("/cart");
  assert.equal(h.render("/cart?step=1").length, 0);
  h.render("/cart?step=2");
  assert.equal(h.render("/cart?step=2&other=value").length, 0);
});

test("existing profile page transitions and history restoration remain supported", () => {
  const h = harness();
  h.render("/my-profile?step=1");
  assert.ok(h.render("/my-profile?step=6").length > 0);
  assert.equal(h.render("/my-profile?step=1", true).length, 0);
});

test("ordinary filter changes preserve position while a new pathname scrolls to the top", () => {
  const h = harness();
  h.render("/products?page=1");
  assert.equal(h.render("/products?page=2&sort=newest").length, 0);
  assert.ok(h.render("/cart?step=2").length > 0);
});

test("explicit anchor destinations retain their own scroll target", () => {
  const h = harness();
  h.render("/cart?step=2");
  assert.equal(h.render("/cart?step=3#payment-actions").length, 0);
});
