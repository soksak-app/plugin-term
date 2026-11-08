// Unit checks of the start state of the window checks (e2e/start.mjs): the shell fixture and the placeholder tabs of the start layout.
import assert from "node:assert/strict";
import { accessSync, constants, readFileSync } from "node:fs";
import test from "node:test";
import { CHECK_SHELL, placeholderTabs } from "../start.mjs";

test("the shell of a term view is the check shell of this repository", { timeout: 5000 }, () => {
  assert.ok(CHECK_SHELL.endsWith("/e2e/check-shell"), `the check shell is ${CHECK_SHELL}`);
  accessSync(CHECK_SHELL, constants.X_OK);
  assert.ok(readFileSync(CHECK_SHELL, "utf8").split("\n").includes("exec /bin/sh"), "check-shell does not run exec /bin/sh");
});

test("the placeholder tabs of the start layout are the tabs that core.surfaces reports as placeholders", { timeout: 5000 }, () => {
  const grid = { cards: [
    { id: "left" },
    { id: "terminal", tabs: [{ id: "tab-1", plugin: "term" }] },
    { id: "browser", tabs: [{ id: "tab-2", plugin: "browser" }] },
  ] };
  const surfaces = [
    { surface: "tab-1", kind: "tab", placeholder: null },
    { surface: "tab-2", kind: "tab", placeholder: { reason: "not installed" } },
  ];
  assert.deepEqual(placeholderTabs(grid, surfaces), [{ card: "browser", tab: "tab-2", plugin: "browser" }]);
  assert.deepEqual(placeholderTabs(null, surfaces), []);
});
