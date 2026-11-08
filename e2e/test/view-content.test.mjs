// Unit checks of the content reader of the term view (e2e/view-content.mjs) over a fake session.
import assert from "node:assert/strict";
import test from "node:test";
import { termContentCase, termContentProof } from "../view-content.mjs";

/** A session whose image region named view of the surface `probe` presents `presented`; `runs` answers each command by name. */
function session(runs, { presented = { generation: 1, raster: 2, sequence: 3 } } = {}) {
  const host = { regions: [{ surface: "probe", name: "view", presented }] };
  return {
    get: async (name) => { assert.equal(name, "host.window"); return host; },
    run: async (name, params, surface) => {
      assert.equal(surface, "probe");
      assert.ok(name in runs, `unexpected command ${name}`);
      return runs[name](params);
    },
    async until(name, predicate, message) {
      assert.equal(name, "host.window");
      if (!predicate(host)) throw new Error(message);
      return host;
    },
  };
}

const cells = (text) => [...text].map((ch) => ch === " " ? { width: 1 } : { ch, width: 1 });

test("term content reads the cell rows of the frame that its image region presented", { timeout: 5000 }, async () => {
  const read = () => ({ rows: [cells("SOKSAK TERM CONTENT")], frame: { generation: 1, raster: 2, sequence: 3 } });
  assert.deepEqual(await termContentProof(session({ "term.screen.read": read }), "probe", "SOKSAK TERM CONTENT"),
    { method: "value", expected: "SOKSAK TERM CONTENT", actual: "SOKSAK TERM CONTENT" });
});

test("term content refuses a frame that its image region did not present", { timeout: 5000 }, async () => {
  const read = () => ({ rows: [cells("SOKSAK TERM CONTENT")], frame: { generation: 1, raster: 2, sequence: 4 } });
  await assert.rejects(termContentProof(session({ "term.screen.read": read }), "probe", "SOKSAK TERM CONTENT"),
    /did not present frame/);
});

test("term content readiness preserves omitted blank cell characters", { timeout: 5000 }, async () => {
  const s = {
    run: async () => null,
    rect: async () => ({ width: 100, height: 50 }),
    async until(name, predicate) {
      const value = name === "core.surfaces" ? [{ surface: "probe", exposes: ["status term.session", "status term.screen"] }]
        : name === "term.session" ? { sessionId: "session", cols: 80, rows: 24 }
        : [cells("SOKSAK TERM CONTENT")];
      assert.ok(predicate(value), `${name} readiness discarded an omitted blank character`);
      return value;
    },
  };
  assert.equal(typeof await termContentCase(s, () => {}).ready(s, { tab: "probe" }), "function");
});
