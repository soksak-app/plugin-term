// Start state of the window checks of this plugin: the start state of @soksak/window-check/start.mjs (core
// docs/spec/plugins.md#window-checks-of-a-plugin), whose start probe replaces each placeholder tab of the start layout, with the shell
// of the term set to the fixture e2e/check-shell. fresh adds a ready term tab to the focused card; freshWithoutTerm leaves the
// plugin without a tab for a check that opens its own.
import { fileURLToPath } from "node:url";
import { fresh as start, START_PROBE } from "@soksak/window-check/start.mjs";

export { cardSidebar, reading } from "@soksak/window-check/start.mjs";

/** The plugin under check. */
export const PLUGIN = "term";

/** The tab of another plugin that a check selects to hide a term tab: the start probe of @soksak/window-check. */
export const PROBE = START_PROBE;

/** The shell of the window-check term, as the value of the setting `term.shell`. It avoids a prompt that depends on the login shell. */
export const CHECK_SHELL = fileURLToPath(new URL("./check-shell", import.meta.url));

/** The entries that a term tab has registered when a check can read its document, its session and its view. */
export const TERM_ENTRIES = Object.freeze(["status core.surface.document", `status ${PLUGIN}.session`, `element ${PLUGIN}.view`]);

/** Waits until the term tab `tab` registered TERM_ENTRIES and its document applied the theme, and returns it as `{surface, plugin}`. */
export async function termReady(s, tab) {
  await s.registered(tab, TERM_ENTRIES);
  await s.until("core.surface.document", (doc) => doc !== null && doc.readyState === "complete" && doc.themed,
    `term ${tab} did not apply its theme`, { surface: tab });
  return { surface: tab, plugin: PLUGIN };
}

/** The start state without a term tab (window-check fresh) with the check shell; options are those of window-check fresh. */
export const freshWithoutTerm = (s, options = {}) =>
  start(s, { ...options, settings: { ...options.settings, [`${PLUGIN}.shell`]: CHECK_SHELL } });

/** The start state with a ready term tab, the active tab of the focused card; it returns the term tab `{surface, plugin}`. */
export async function fresh(s, options = {}) {
  return (await freshWithoutTerm(s, { ...options, addPluginTab: { plugin: PLUGIN, ready: termReady } })).pluginTab;
}
