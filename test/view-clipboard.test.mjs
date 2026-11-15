// The clipboard reads of the terminal view page over the view of openView (@soksak/plugin-api/testing). The page clipboard is the
// clipboard of the view runtime (ui/view-context.js), so the reads run through the calls of the bridge: a text read and a read of a
// clipboard without a PNG. The PNG upload and download and the reply validation belong to the plugin API (core
// docs/spec/plugin-processes.md#binary-path), and its tests own them.
import assert from "node:assert/strict";
import test from "node:test";
import { openClipboardView } from "./fixtures/clipboard-view.mjs";

/** The clipboard calls of a real view in order, as [command, params]; the bridge makes its own runtime calls when it starts. */
const clipboardCalls = (view) => view.calls.filter(({ command }) => command.startsWith("runtime.clipboard."))
  .map(({ command, params }) => [command, params]);

test("the view clipboard answers null for a clipboard without a PNG", async (t) => {
  const view = await openClipboardView(t, {
    clipboard: { readPNG: () => ({ present: false, type: "png" }) },
  });
  assert.equal(await view.bridge.runtime.clipboard.read("png"), null);
  assert.deepEqual(clipboardCalls(view), [["runtime.clipboard.read", "png"]]);
});

test("the view clipboard returns a text read as the call answers it", async (t) => {
  const view = await openClipboardView(t, {
    clipboard: { read: (type) => (type === "text" ? "text of the clipboard" : null) },
  });
  assert.equal(await view.bridge.runtime.clipboard.read("text"), "text of the clipboard");
  assert.deepEqual(clipboardCalls(view), [["runtime.clipboard.read", "text"]]);
});
