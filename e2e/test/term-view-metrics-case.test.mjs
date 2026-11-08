import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findFirstChangedSlotFrame } from "@soksak/window-check/view-frame-geometry.mjs";
import { TAB_PLACEMENT } from "@soksak/window-check/view-metrics-collection.mjs";
import { termDragGeometryFrame, termSourceContentFrame,
  termViewDescriptor, writeTermDragLayouts, measureTermLayoutFrame,
  setTermGeometryBackground, termRasterTargetRectPt, TERM_GEOMETRY_BACKGROUND }
  from "../benchmark/cases/term.mjs";

function termLayoutFrame({ cardLeft, rootLeft, time }) {
  const width = 1024;
  const height = 768;
  const stride = width * 4;
  const data = Buffer.alloc(stride * height);
  const plane = [16, 17, 23];
  const cardColor = [25, 27, 36];
  const edgeColor = [43, 46, 61];
  const focusCornerBlend = [32, 28, 29];
  const paint = (x, y, [red, green, blue]) => {
    const offset = y * stride + x * 4;
    data[offset] = blue;
    data[offset + 1] = green;
    data[offset + 2] = red;
    data[offset + 3] = 255;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) paint(x, y, plane);
  const card = { left: cardLeft, top: 16, right: 950, bottom: 647 };
  for (let y = card.top; y < card.bottom; y++) for (let x = card.left; x < card.right; x++) {
    const edge = x < card.left + 2 || x >= card.right - 2 || y < card.top + 2 || y >= card.bottom - 2;
    paint(x, y, edge ? edgeColor : cardColor);
  }
  const content = { left: rootLeft, top: 82, right: 948, bottom: 601 };
  for (let y = content.top; y < content.bottom; y++) {
    for (let x = content.left; x < content.right; x++) paint(x, y, TERM_GEOMETRY_BACKGROUND);
  }
  for (const x of [card.left + 9, card.right - 10]) {
    for (const y of [card.top + 2, card.bottom - 3]) paint(x, y, focusCornerBlend);
  }
  return { width, height, stride, scale: 2, contentScale: 1, content: { x: 0, y: 0 }, time, data };
}

test("term layout geometry excludes captured focus-corner colors from content bounds", { timeout: 5000 }, () => {
  const before = measureTermLayoutFrame(termLayoutFrame({ cardLeft: 200, rootLeft: 202, time: 10 }), {
    cornerRadiusPt: 8, targetRect: { x: 101, y: 41, width: 373, height: 259.5 },
  });
  const after = measureTermLayoutFrame(termLayoutFrame({ cardLeft: 40, rootLeft: 42, time: 20 }), {
    cornerRadiusPt: 8, targetRect: { x: 21, y: 41, width: 453, height: 259.5 },
  });
  let slotError = null;
  let slotMatch;
  try {
    slotMatch = findFirstChangedSlotFrame([before, after], { beforeChangeTimeMs: 15,
      slotInsetsPt: { left: 1, top: 33, right: 1, bottom: 23 } });
  } catch (error) {
    slotError = error.message;
  }
  assert.deepEqual({ before: before.nativeRectPt, after: after.nativeRectPt, slotError, slotMatch }, {
    before: { left: 101, top: 41, right: 474, bottom: 300.5 },
    after: { left: 21, top: 41, right: 474, bottom: 300.5 },
    slotError: null,
    slotMatch: {
      baselineFrameIndex: 0, changeFrameIndex: 1, contentFrameIndex: 1,
      slotMatchFrameIndices: [1], maxSlotErrorPt: 0,
    },
  });
});

test("term geometry background uses one distinctive OSC 11 color and waits for its output", { timeout: 5000 }, async () => {
  const surface = "surface-a";
  const marker = `TERM-GEOMETRY-${surface}`;
  const calls = [];
  const session = {
    async run(name, params, selectedSurface) {
      calls.push({ name, params, surface: selectedSurface });
    },
    async until(name, predicate, message, options) {
      calls.push({ name, message, options });
      const lines = [[{ ch: marker, width: marker.length }]];
      assert.equal(predicate(lines), true);
      return lines;
    },
  };
  await setTermGeometryBackground(session, surface);
  const hex = TERM_GEOMETRY_BACKGROUND.map((value) => value.toString(16).padStart(2, "0")).join("/");
  assert.deepEqual(calls, [
    { name: "term.input", params: { bytes: `printf '\\033]11;rgb:${hex}\\007${marker}\\n'\r` }, surface },
    { name: "term.screen.read", params: {}, surface },
    { name: "term.screen", message: `${surface} did not finish the term geometry background change`,
      options: { surface } },
  ]);
});

test("term drag layout evidence is written before frame analysis", { timeout: 5000 }, () => {
  const directory = mkdtempSync(join(tmpdir(), "term-drag-layouts-"));
  try {
    const layouts = [{ ticket: 4, begun: 10, presented: 26, committed: 30 }];
    const path = writeTermDragLayouts(directory, layouts);
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { layouts });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("term drag geometry keeps four measured card and raster edges from the same captured frame", { timeout: 5000 }, () => {
  assert.deepEqual(termDragGeometryFrame(7, {
    timeMs: 148,
    cardRectPt: { left: 10, top: 20, right: 209.5, bottom: 180 },
    nativeRectPt: { left: 11, top: 21, right: 208.5, bottom: 179 },
  }, { left: 1, top: 1, right: 1, bottom: 1 }), {
    frameIndex: 7,
    timeMs: 148,
    cardRectPt: { left: 10, top: 20, right: 209.5, bottom: 180 },
    nativeRectPt: { left: 11, top: 21, right: 208.5, bottom: 179 },
    contentRectPt: { left: 11, top: 21, right: 208.5, bottom: 179 },
    slotInsetsPt: { left: 1, top: 1, right: 1, bottom: 1 },
    contentInsetsPt: { left: 0, top: 0, right: 0, bottom: 0 },
  });
});

test("term source content mapping retains source interval and capture time without placement association", { timeout: 5000 }, () => {
  const source = { sequence: 4, frameIndex: 7, timeRange: { lowerMs: 147, upperMs: 149 }, width: 198, height: 120,
    firstResizeAtMs: 31, resizeAtMs: 31, resizeCount: 1, frameTimeMs: 33,
    source: { documentTimeOriginMs: 1000, eventTsUs: 1_200_000, eventMonoNs: 148_000_000 } };
  assert.deepEqual(termSourceContentFrame(source, { time: 150 }), {
    sourceSequence: 4, frameIndex: 7, frameTimeMs: 33, captureTimeMs: 150,
    displayCapture: null, timeRange: { lowerMs: 147, upperMs: 149 }, width: 198, height: 120,
    source: { sequence: 4, firstResizeAtMs: 31, resizeAtMs: 31, resizeCount: 1, frameTimeMs: 33, documentTimeOriginMs: 1000,
      eventTsUs: 1_200_000, eventMonoNs: 148_000_000 },
    displayTimeMs: 150,
  });
  assert.deepEqual(termSourceContentFrame({ ...source, frameIndex: null }, null), {
    sourceSequence: 4, frameIndex: null, frameTimeMs: 33, captureTimeMs: null,
    displayCapture: null, timeRange: { lowerMs: 147, upperMs: 149 }, width: 198, height: 120,
    source: { sequence: 4, firstResizeAtMs: 31, resizeAtMs: 31, resizeCount: 1, frameTimeMs: 33, documentTimeOriginMs: 1000,
      eventTsUs: 1_200_000, eventMonoNs: 148_000_000 },
    displayTimeMs: null,
  });
});

test("term view descriptor reads browser history and controls only the diagnostic frame observer", { timeout: 5000 }, async () => {
  assert.equal(termViewDescriptor.readinessStatus, "term.session");
  const calls = [];
  const session = {
    async run(name, params, surface) {
      calls.push({ name, params, surface });
      if (name === "term.view.history") return { length: 1 };
      if (name === "term.view.frames") return params.action === "start"
        ? { enabled: true, sourceClock: { documentTimeOriginMs: 1000, sourceNowMs: 20, sourceResolutionMs: 1 } }
        : { enabled: false };
      throw new Error(`unexpected command ${name}`);
    },
  };
  assert.deepEqual(await termViewDescriptor.readDocument(session, "surface-a"), {
    historyEntries: 1, regionHistoryEntries: 0,
  });
  assert.deepEqual(await termViewDescriptor.startContentTrace(session, "surface-a"), {
    enabled: true, sourceClock: { documentTimeOriginMs: 1000, sourceNowMs: 20, sourceResolutionMs: 1 },
  });
  assert.deepEqual(await termViewDescriptor.stopContentTrace(session, "surface-a"), { enabled: false });
  assert.deepEqual(calls, [
    { name: "term.view.history", params: {}, surface: "surface-a" },
    { name: "term.view.frames", params: { action: "start" }, surface: "surface-a" },
    { name: "term.view.frames", params: { action: "stop" }, surface: "surface-a" },
  ]);
});

test("term convergence target comes from the visible native raster region", { timeout: 1000 }, () => {
  const host = { regions: [
    { surface: "surface-a", name: "view", visible: true,
      frame: { x: 8, y: 12, width: 700, height: 420 } },
    { surface: "surface-a", name: "toolbar", visible: true,
      frame: { x: 0, y: 0, width: 700, height: 30 } },
  ] };
  assert.deepEqual(termRasterTargetRectPt(host, "surface-a"), {
    left: 8, top: 12, right: 708, bottom: 432,
  });
  assert.throws(() => termRasterTargetRectPt({ regions: [] }, "surface-a"), /exactly one native raster region/);
});

test("the term view descriptor reads the statuses and commands of the term plugin", { timeout: 5000 }, async () => {
  assert.equal(termViewDescriptor.plugin, "term");
  assert.equal(termViewDescriptor.readinessStatus, "term.session");
  assert.equal(termViewDescriptor.placement, TAB_PLACEMENT);
  assert.equal(termViewDescriptor.expectedContent, "sh-3.2$");
  assert.equal(typeof termViewDescriptor.readContent, "function", "the term view descriptor reads no content value");
  const calls = [];
  const session = {
    async run(name, params, surface) {
      calls.push({ name, params, surface });
      if (name === "term.view.history") return { length: 1 };
      if (name === "term.view.frames") return params.action === "start"
        ? { enabled: true, sourceClock: { documentTimeOriginMs: 1000, sourceNowMs: 20, sourceResolutionMs: 1 } }
        : { enabled: false };
      throw new Error(`unexpected command ${name}`);
    },
  };
  assert.deepEqual(await termViewDescriptor.readDocument(session, "surface-a"), { historyEntries: 1, regionHistoryEntries: 0 });
  await termViewDescriptor.startContentTrace(session, "surface-a");
  await termViewDescriptor.stopContentTrace(session, "surface-a");
  assert.deepEqual(calls.map(({ name }) => name), ["term.view.history", "term.view.frames", "term.view.frames"]);
});
