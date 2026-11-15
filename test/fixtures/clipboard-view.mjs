// The view of the clipboard and sidecar tests. The view window is test/fixtures/view-window.mjs, and the bridge of the view is the bridge
// of @soksak/plugin-api/view over the channel of that window, so the module under test receives the calls and subscriptions of the view as
// the page does.
import { readFileSync } from "node:fs";
import { openViewWindow } from "./view-window.mjs";

const manifest = JSON.parse(readFileSync(new URL("../../plugin.json", import.meta.url), "utf8"));

/** The surface of the view of these tests, and the sidecar that plugin.json lists as its only dependency. */
export const SURFACE = "probe-surface";
export const SIDECAR = Object.keys(manifest.dependencies)[0];

/** The theme of the window, which the bridge applies to the root of the view document. */
const THEME = { scheme: "dark", tokens: {} };

/**
 * Opens a view of the terminal plugin without a page and returns it. The test reads view.bridge, whose calls and runtime are the bridge
 * of the view. Options: clipboard (the fixtures of the clipboard routes), sidecar (the function that answers each body sent to the
 * sidecar), faults (route names that reject with a message). The view is closed when the test ends.
 */
export async function openClipboardView(t, { clipboard = {}, sidecar = () => null, faults } = {}) {
  const view = openViewWindow({
    plugin: manifest.id,
    surface: SURFACE,
    start: { surface: SURFACE, params: null, origin: { directory: null }, project: null, declarations: {}, diagnostics: null },
    theme: THEME,
    declarations: {},
    sidecars: [SIDECAR],
    composition: manifest.surface.composition,
    sidecar,
    clipboard,
    faults,
  });
  t.after(() => view.close());
  const { createViewBridge } = await import("@soksak/plugin-api/view");
  view.bridge = createViewBridge({
    handler: view.window.webkit.messageHandlers["sok-view"],
    // The open-call counts are debug records of the page, so only the other reports are errors of the view.
    report: (event) => {
      if (event?.kind !== "open-calls") view.observed.errors.push(`view bridge ${event?.kind ?? "report"}: ${event?.error?.message ?? event?.text ?? ""}`);
    },
  });
  return view;
}
