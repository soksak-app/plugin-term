import assert from "node:assert/strict";
import test from "node:test";
import { viewSidecar } from "../ui/view-sidecar.js";
import { SIDECAR, SURFACE, openClipboardView } from "./fixtures/clipboard-view.mjs";

test("a sidecar send names the declared sidecar in the call runtime.sidecar.send", async (t) => {
  const view = await openClipboardView(t, {
    sidecar: (body) => (body.operation === "probe" ? "probe-answer" : null),
  });
  const port = viewSidecar(view.bridge.calls, view.bridge.runtime);
  const cids = ["c-1"];
  assert.equal(await port.send("probe-surface", { operation: "probe" }, cids), "probe-answer");
  assert.deepEqual(view.observed.sidecar, [{
    sidecar: SIDECAR, id: "probe-surface", body: { operation: "probe" }, cids,
  }]);
});

test("the sidecar subscriptions of a session name the declared sidecar", async (t) => {
  const view = await openClipboardView(t);
  const port = viewSidecar(view.bridge.calls, view.bridge.runtime);
  const messages = [];
  const failures = [];
  await port.on("probe-surface", (data) => messages.push(data));
  await port.onFailure("probe-surface", (reason) => failures.push(reason));
  // The host routes a message and a failure of a session only when the view subscribed to that session under the declared sidecar.
  view.sidecarMessage(SIDECAR, SURFACE, { body: { event: "probe" } });
  await view.settled();
  view.sidecarFailure(SIDECAR, "probe-surface", "probe failure");
  await view.settled();
  assert.deepEqual(messages, [{ event: "probe" }]);
  assert.deepEqual(failures, ["probe failure"]);
});
