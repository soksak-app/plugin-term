// The benchmark of the term view: its process, start, reclaim, layout and drag measurements meet the contract of
// @soksak/window-check/view-metrics.mjs. The term plugin has no recorded DOM mount baseline, so (iii) and (iii-b) judge it against the
// first-display margin alone. The evidence of each application is written to build/term-view-metrics/<application>.json, which the run
// keeps.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { APPS, open } from "@soksak/window-check/app.mjs";
import { runViewMeasurements } from "@soksak/window-check/view-metrics.mjs";
import { fresh } from "../start.mjs";
import { collectTermViewMeasurements, termViewDescriptor } from "./cases/term.mjs";

for (const app of Object.values(APPS)) {
  test(`${app.name}: term view process and frame measurements meet the declared contract`, { timeout: 180000 }, async (t) => {
    const s = await open(t, app);
    // The process starts of a view (host.trace.view.process-request and process-ready) are stored in the class call at debug and its
    // content frames (plugin.term.view.content_frame) in the class frame at trace.
    await fresh(s, { performanceTrace: true, log: { call: "debug", frame: "trace" }, reads: [
      "host.trace.view.process-request",
      "host.trace.view.process-ready",
      "plugin.term.view.content_frame",
    ] });
    const result = await runViewMeasurements(t, s, {
      plugin: termViewDescriptor.plugin,
      baselinesMs: null,
      collect: () => collectTermViewMeasurements(t, s, termViewDescriptor, app.configDir),
    });
    const directory = new URL("../../build/term-view-metrics/", import.meta.url).pathname;
    mkdirSync(directory, { recursive: true });
    const path = join(directory, `${app.name}.json`);
    writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
    t.diagnostic(`term view measurement evidence ${path}`);
    assert.equal(result.evaluation.plugin, "term");
    assert.equal(result.evaluation.host, app.name);
  });
}
