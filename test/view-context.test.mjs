import assert from "node:assert/strict";
import test from "node:test";
import { createViewBridge } from "@soksak/plugin-api/view";
import { createViewContext, createViewErrorReporter } from "../ui/view-context.js";

/**
 * A channel of the view for these tests: each page call is recorded, and `answer(command, params)` gives its answer. The channel
 * delivers no host event, so the tests push none.
 */
function channelWith(answer = () => Promise.resolve(null)) {
  const calls = [];
  const channel = {
    plugin: "term",
    call(command, params) {
      calls.push({ command, params });
      return answer(command, params);
    },
    listen: () => () => {},
    handle: () => () => {},
    levels: () => ({}),
  };
  return { channel, calls };
}

function contextFor(bridge) {
  return createViewContext({
    bridge,
    start: { surface: "terminal-1", params: null, origin: { directory: null }, project: null, declarations: {} },
  });
}

test("the view context uses the bridge logger instead of requesting runtime.log itself", { timeout: 5000 }, async () => {
  const { channel, calls } = channelWith();
  const bridge = createViewBridge({ handler: channel, report: () => {} });
  const { context } = contextFor(bridge);
  const fields = { sequence: 4 };

  context.runtime.log.debug("view.content_frame", fields, { cids: ["input-4"] });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(context.runtime.log, bridge.runtime.log, "the page logs through the logger of the view bridge");
  // The exposure port subscribes to the exposure requests at its creation (runtime.native.on), which is not a log call.
  assert.deepEqual(calls.filter(({ command }) => command !== "runtime.native.on"), [{
    command: "runtime.log",
    params: { action: "batch", events: [{ event: "plugin.term.view.content_frame", level: "debug", fields, cids: ["input-4"] }] },
  }], "the context writes the record through one runtime.log batch of the bridge, and makes no other call");
});

test("the view context uses the clipboard of the bridge runtime instead of a copy of it", { timeout: 5000 }, () => {
  const { channel, calls } = channelWith();
  const bridge = createViewBridge({ handler: channel, report: () => {} });
  const { context } = contextFor(bridge);

  assert.equal(context.runtime.clipboard, bridge.runtime.clipboard, "the page clipboard is the clipboard of the view runtime");
  assert.deepEqual(calls.filter(({ command }) => command.startsWith("runtime.clipboard")), [], "the context makes no clipboard call of its own");
});

test("view error reports use runtime.error, and a refused error route is not an unhandled rejection", { timeout: 5000 }, async () => {
  const { channel, calls } = channelWith((command) => (command === "runtime.error"
    ? Promise.reject(new Error("error route refused"))
    : Promise.resolve(null)));
  const bridge = createViewBridge({ handler: channel, report: () => {} });
  const report = createViewErrorReporter(bridge.runtime);

  assert.equal(report("view terminal: page failed"), undefined, "reporting does not depend on a logger promise");
  // The refused route rejects after the report returns; the reporter catches it, so the rejection does not reach the process.
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, [{ command: "runtime.error", params: { where: "view", text: "view terminal: page failed" } }]);
});
