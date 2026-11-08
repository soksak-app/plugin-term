// Unit checks of the screen reads of a term view (e2e/term-screen.mjs) over a fake session.
import assert from "node:assert/strict";
import test from "node:test";
import { presentedScreen, readScreenUntil, textLines } from "../term-screen.mjs";

const cells = (text) => [...text].map((ch) => ch === " " ? { width: 1 } : { ch, width: 1 });

test("the text of a term screen keeps the cells without a character as spaces and drops trailing spaces", { timeout: 5000 }, () => {
  assert.deepEqual(textLines({ lines: [cells("sh-3.2$ ls  "), [{ ch: "가", width: 2 }, { width: 0 }, { width: 2 }, { ch: "x", width: 1 }]] }),
    ["sh-3.2$ ls", "가  x"]);
  assert.throws(() => textLines({ lines: [[{ ch: "a" }]] }), /cell width is required/);
  assert.throws(() => textLines(null), /invalid term screen/);
});

test("a term screen read reads term.screen.read once and waits on term.screen of the surface", { timeout: 5000 }, async () => {
  const calls = [];
  const session = {
    async run(name, params, surface) { calls.push({ name, params, surface }); },
    async until(name, predicate, message, options) {
      calls.push({ name, message, options });
      const lines = [cells("sh-3.2$")];
      assert.equal(predicate(lines), true);
      return lines;
    },
  };
  assert.deepEqual(await readScreenUntil(session, "surface-a", (lines) => lines.includes("sh-3.2$"), "no prompt"), ["sh-3.2$"]);
  assert.deepEqual(calls, [
    { name: "term.screen.read", params: {}, surface: "surface-a" },
    { name: "term.screen", message: "no prompt", options: { surface: "surface-a" } },
  ]);
});

test("a presented term screen waits until the image region of the surface presents the frame of the read", { timeout: 5000 }, async () => {
  const frame = { generation: 1, raster: 2, sequence: 3 };
  const session = (presented) => ({
    async run(name, params, surface) {
      assert.deepEqual([name, params, surface], ["term.screen.read", {}, "surface-a"]);
      return { rows: [cells("x")], frame };
    },
    async until(name, predicate, message) {
      assert.equal(name, "host.window");
      if (!predicate({ regions: [{ surface: "surface-a", name: "view", presented }] })) throw new Error(message);
    },
  });
  assert.deepEqual((await presentedScreen(session({ generation: 1, raster: 2, sequence: 5 }), "surface-a")).frame, frame);
  await assert.rejects(presentedScreen(session({ generation: 1, raster: 3, sequence: 5 }), "surface-a"), /did not present frame/);
});
