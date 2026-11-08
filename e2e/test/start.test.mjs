// Unit checks of the start state of the window checks (e2e/start.mjs): the shell fixture and the readiness of a term tab.
import assert from "node:assert/strict";
import { accessSync, constants, readFileSync } from "node:fs";
import test from "node:test";
import { CHECK_SHELL, TERM_ENTRIES, termReady } from "../start.mjs";

test("the shell of a term view is the check shell of this repository", { timeout: 5000 }, () => {
  assert.ok(CHECK_SHELL.endsWith("/e2e/check-shell"), `the check shell is ${CHECK_SHELL}`);
  accessSync(CHECK_SHELL, constants.X_OK);
  assert.ok(readFileSync(CHECK_SHELL, "utf8").split("\n").includes("exec /bin/sh"), "check-shell does not run exec /bin/sh");
});

test("a term tab is ready once it registered its document, session and view and its document applied the theme", { timeout: 5000 }, async () => {
  const calls = [];
  const s = {
    async registered(surface, entries) { calls.push({ registered: surface, entries }); },
    async until(name, predicate, message, options) {
      calls.push({ until: name, options });
      assert.equal(predicate({ readyState: "complete", themed: true }), true);
      assert.equal(predicate({ readyState: "complete", themed: false }), false);
      assert.equal(predicate(null), false);
    },
  };
  assert.deepEqual(await termReady(s, "tab-7"), { surface: "tab-7", plugin: "term" });
  assert.deepEqual(calls, [
    { registered: "tab-7", entries: TERM_ENTRIES },
    { until: "core.surface.document", options: { surface: "tab-7" } },
  ]);
  assert.deepEqual(TERM_ENTRIES, ["status core.surface.document", "status term.session", "element term.view"]);
});
