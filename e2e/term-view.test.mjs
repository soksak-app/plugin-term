// The window checks of the term view against a published core application (docs/operations/window-checks.md): the process contract
// of the view (start, memory and reclaim of its process group, judged by runViewMeasurements) and its frame contract (the image
// region presents a raster of its frame size, the screen read shows the prompt, and the view reports its content frames). They use
// only the modules of @soksak/window-check, the exposed commands, statuses and elements of this plugin and of core, and no timer:
// each wait ends on the status that it names.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { APPS, open } from "@soksak/window-check/app.mjs";
import { fresh } from "@soksak/window-check/start.mjs";
import { presentsFrame } from "@soksak/window-check/region-raster.mjs";
import { runViewMeasurements } from "@soksak/window-check/view-metrics.mjs";
import { valueProof, visibleDocument } from "@soksak/window-check/view-content.mjs";
import { collectViewReclaimMeasurements, collectViewStartAndMemory, TAB_PLACEMENT, waitForViewReadiness,
  withViewContentTrace } from "@soksak/window-check/view-metrics-collection.mjs";

const PLUGIN = "term";
const PROMPT = "sh-3.2$";
// The shell of the window checks, whose prompt does not depend on the profile of the login shell.
const CHECK_SHELL = fileURLToPath(new URL("./check-shell", import.meta.url));
// The records that a view start and its content frames write, and the log policy that stores them (the performance trace on, the
// class call at debug and the class frame at trace).
const START = Object.freeze({
  performanceTrace: true,
  log: { call: "debug", frame: "trace" },
  settings: { "term.shell": CHECK_SHELL },
  reads: ["host.trace.view.process-request", "host.trace.view.process-ready", `plugin.${PLUGIN}.view.content_frame`],
});

/** The text of the rows that term.screen reports, one line for each row without its trailing spaces. */
const screenLines = (rows) => rows.map((row) => row.map((cell) => (cell.ch === undefined ? " ".repeat(cell.width) : cell.ch)).join("").trimEnd());

const showsPrompt = (rows) => screenLines(rows).some((line) => line.startsWith(PROMPT));

/**
 * The view descriptor of the term view. Its content is the initial prompt of the check shell, read through term.screen.read, and its
 * readiness is the session status with its dimensions, the prompt on term.screen and one root history entry.
 */
const descriptor = Object.freeze({
  plugin: PLUGIN,
  placement: TAB_PLACEMENT,
  params: undefined,
  expectedContent: PROMPT,
  readContent: async (s, surface) => {
    await visibleDocument(s, surface);
    const screen = await s.run(`${PLUGIN}.screen.read`, {}, surface);
    assert.ok(Array.isArray(screen?.rows), `${PLUGIN}.screen.read of ${surface} answered no rows: ${JSON.stringify(screen)}`);
    return screenLines(screen.rows).join("\n");
  },
  readinessStatus: `${PLUGIN}.session`,
  readiness: async (s, surface) => {
    const session = await s.until(`${PLUGIN}.session`, (value) => value?.sessionId && value.cols > 0 && value.rows > 0,
      `${PLUGIN} view ${surface} did not open its session`, { surface });
    const rows = await s.until(`${PLUGIN}.screen`, showsPrompt, `${PLUGIN} view ${surface} did not display its initial shell prompt`, { surface });
    const rect = await s.rect(`${PLUGIN}.view`, undefined, surface);
    assert.ok(rect.width > 0 && rect.height > 0, `${PLUGIN} view ${surface} has no visible content region`);
    const history = await s.run(`${PLUGIN}.view.history`, {}, surface);
    assert.deepEqual(history, { length: 1 }, `${PLUGIN} view ${surface} did not begin with one root history entry`);
    return { sessionId: session.sessionId, promptLines: screenLines(rows), historyEntries: history.length, regionHistoryEntries: 0 };
  },
  readDocument: async (s, surface) => {
    const history = await s.run(`${PLUGIN}.view.history`, {}, surface);
    return { historyEntries: history.length, regionHistoryEntries: 0 };
  },
  startContentTrace: async (s, surface) => {
    const result = await s.run(`${PLUGIN}.view.frames`, { action: "start" }, surface);
    assert.equal(result?.enabled, true, `${PLUGIN} view ${surface} content-frame observer did not start`);
    return result;
  },
  stopContentTrace: async (s, surface) => {
    const result = await s.run(`${PLUGIN}.view.frames`, { action: "stop" }, surface);
    assert.deepEqual(result, { enabled: false }, `${PLUGIN} view ${surface} content-frame observer did not stop`);
    return result;
  },
});

/** The one image region `view` of the term view `surface` in host.window. */
function rasterRegion(host, surface) {
  const regions = host.regions.filter((region) => region.surface === surface && region.name === "view");
  assert.equal(regions.length, 1, `term view ${surface} must have exactly one image region`);
  return regions[0];
}

for (const app of Object.values(APPS)) {
  // (i), (ii), (iii), (iii-b), (v) and (viii) of core docs/spec/plugin-processes.md#pass-values: the memory of one view and of the views
  // together, the process starts, the first display, the warm reuse and the reclaim of the process group when the views close. The
  // plugin has no recorded DOM mount baseline, so the first display is judged against the margin alone.
  test(`${app.name}: the term view process meets the declared contract`, { timeout: 180000 }, async (t) => {
    const s = await open(t, app);
    await fresh(s, START);
    const result = await runViewMeasurements(t, s, {
      plugin: PLUGIN,
      baselinesMs: null,
      collect: async () => {
        const start = await collectViewStartAndMemory(t, s, descriptor);
        const reclaim = await collectViewReclaimMeasurements(t, s, descriptor, start.opened,
          { events: [...start.events], recordings: [...start.recordings] });
        return {
          plugin: PLUGIN,
          host: s.app.name,
          total: start.total,
          reclaim,
          warmDisplay: start.warmDisplay,
          newProcess: { processStarts: start.processStarts, firstDisplays: start.firstDisplays },
        };
      },
    });
    assert.equal(result.evaluation.plugin, PLUGIN);
    assert.equal(result.evaluation.host, app.name);
  });

  // A card width change: the image region presents a raster of its new frame size, the screen read shows the prompt at that size,
  // and the view reports at least one content frame, each with the dimensions of its document, while its observer runs.
  test(`${app.name}: the term view presents a raster of its frame size after a card width change`, { timeout: 180000 }, async (t) => {
    const s = await open(t, app);
    await fresh(s, START);
    const grid = await s.get("core.grid");
    const focused = grid.cards.find((card) => card.focused);
    assert.ok(focused, "the start layout has no focused card");
    const split = await s.run("core.card.split", { card: focused.id, side: "right", plugin: PLUGIN });
    const { tab: surface, card } = split;
    s.cleanup(async () => {
      if (!(await s.get("core.grid")).cards.some((item) => item.id === card)) return;
      const closed = await s.run("core.card.close", { card });
      assert.equal(closed?.closed, true, `the term card ${card} did not close during cleanup`);
      await s.until("core.grid", (value) => !value.cards.some((item) => item.id === card), `the term card ${card} remained during cleanup`);
    });
    const readiness = await waitForViewReadiness(s, surface, descriptor);
    assert.equal(readiness.historyEntries, 1, `term view ${surface} did not begin at initial history`);
    await s.until("host.window", (host) => presentsFrame(rasterRegion(host, surface), host.scale),
      `term view ${surface} did not present a raster of its frame size`);

    const traced = await withViewContentTrace(t, s, descriptor, surface, async () => {
      const before = rasterRegion(await s.get("host.window"), surface).frame;
      const current = (await s.get("core.grid")).cards.find((item) => item.id === card);
      assert.ok(current && Number.isFinite(current.w), `term card ${card} has no current width`);
      await s.run("core.grid.size", { card, axis: "x", size: current.w + 80 });
      const host = await s.until("host.window", (value) => {
        const region = rasterRegion(value, surface);
        return (region.frame.width !== before.width || region.frame.height !== before.height) && presentsFrame(region, value.scale);
      }, `term view ${surface} did not present a raster of its new frame size`);
      const proof = valueProof(PROMPT, await descriptor.readContent(s, surface), `${PLUGIN} view ${surface}`);
      await s.presented();
      return { before, after: rasterRegion(host, surface).frame, proof };
    });
    const { before, after, proof } = traced.action;
    assert.ok(after.width !== before.width || after.height !== before.height, "the card width change did not change the frame of the image region");
    assert.equal(proof.method, "value");
    assert.ok(traced.contentFrames.length >= 1, `term view ${surface} reported no content frame while its card changed its width`);
    for (const frame of traced.contentFrames) {
      assert.ok(frame.width > 0 && frame.height > 0, `term view ${surface} reported a content frame without dimensions: ${JSON.stringify(frame)}`);
    }
    const closed = await s.run("core.tab.close", { tab: surface });
    assert.equal(closed?.closed, true, `term view ${surface} did not close`);
    await s.until("core.surfaces", (items) => !items.some((item) => item.surface === surface), `term view ${surface} remained after its close`);
  });
}
