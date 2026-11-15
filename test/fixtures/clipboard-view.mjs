// The view of the clipboard and sidecar tests, opened with openView (@soksak/plugin-api/testing) in host mode. The calls of the view
// reach the host fixtures of this file: the clipboard routes and the sidecar of the terminal, which plugin.json lists as its only
// dependency. The bridge of the view is the real bridge of the SDK (view.bridge), so the module under test receives the calls and
// subscriptions of the view as the page does.
import { readFileSync } from "node:fs";
import { openView } from "@soksak/plugin-api/testing";

const manifest = JSON.parse(readFileSync(new URL("../../plugin.json", import.meta.url), "utf8"));

/** The surface of the view of these tests, and the sidecar that plugin.json lists as its only dependency. */
export const SURFACE = "probe-surface";
export const SIDECAR = Object.keys(manifest.dependencies)[0];

/**
 * Opens a view of the terminal plugin without a page and returns it. The test reads view.bridge, whose calls and runtime are the bridge
 * of the view. Options: clipboard (the fixtures of the clipboard routes), sidecar (the function that answers each body sent to the
 * sidecar), faults (route names that reject with a message). The view is closed when the test ends.
 */
export async function openClipboardView(t, { clipboard = {}, sidecar = () => null, faults } = {}) {
  const view = await openView("term", {
    host: {
      surface: SURFACE,
      declarations: {},
      settings: {},
      textSize: 1,
      logLevels: {},
      faults,
      sidecars: [SIDECAR],
      sidecar: { [SIDECAR]: sidecar },
      clipboard,
    },
    start: { surface: SURFACE, params: null, origin: { directory: null }, project: null, diagnostics: null },
  });
  t.after(() => view.close());
  return view;
}
