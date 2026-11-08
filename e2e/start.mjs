// Start state of the window checks of this plugin (core docs/spec/plugins.md#window-checks-of-a-plugin). The run installs this plugin
// from its own packed release into each published application (scripts/test-app.mjs), with the fixture plugins of e2e/fixtures and no
// other real plugin. prepareFixture of @soksak/window-check opens the new-space layout that the environment of the application declares
// (workspace.grid); a tab of it that names a plugin that the configuration does not load opens as a placeholder, and the preparation
// replaces each placeholder by a tab of the start probe in the same card. The start tab is the active tab of the focused card, a term
// tab whose shell is the fixed fixture e2e/check-shell: the preparation adds one to that card when its active tab is not a term tab.
import { fileURLToPath } from "node:url";
import { prepareFixture, TRACE } from "@soksak/window-check/app.mjs";
import { recordCatalog } from "@soksak/window-check/catalog.mjs";
import { currentEventOffsets, readEvents, traceRows } from "@soksak/window-check/event-log.mjs";

/** The plugin under check. */
export const PLUGIN = "term";

/**
 * The fixture plugin of the tabs that are not term tabs: the start probe of e2e/fixtures/start-probe. It replaces each placeholder of
 * the start layout, and a check opens it to hide a term tab behind a tab of another plugin.
 */
export const PROBE = "startprobe";

/** The shell of the window-check term, as the value of the setting `term.shell`. It avoids a prompt that depends on the login shell. */
export const CHECK_SHELL = fileURLToPath(new URL("./check-shell", import.meta.url));

/**
 * The tabs of the layout `grid` (core.grid) that `surfaces` (core.surfaces) report as placeholders, as `{card, tab, plugin}` in the
 * order of the cards and their tabs.
 */
export function placeholderTabs(grid, surfaces) {
  const placeholders = new Set(surfaces.filter((row) => row.kind === "tab" && row.placeholder != null).map((row) => row.surface));
  return (grid?.cards ?? []).flatMap((card) => (card.tabs ?? []).filter((tab) => placeholders.has(tab.id))
    .map((tab) => ({ card: card.id, tab: tab.id, plugin: tab.plugin })));
}

/** Replaces every placeholder tab of the start layout by a tab of PROBE in its card; the new tab is added before the close. */
export async function replacePlaceholders(s) {
  for (const { card, tab } of placeholderTabs(await s.get("core.grid"), await s.get("core.surfaces"))) {
    await s.run("core.card.add-tab", { card, plugin: PROBE });
    await s.run("core.tab.close", { tab });
  }
}

/** Makes the active tab of the focused card a term tab: a card whose active tab is of another plugin gets a new term tab. */
export async function focusedTerm(s) {
  const grid = await s.get("core.grid");
  const focused = grid?.cards.find((card) => card.focused);
  if (!focused) throw new Error(`the start layout has no focused card: ${JSON.stringify(grid?.cards ?? null)}`);
  const active = focused.tabs?.find((tab) => tab.id === focused.active);
  if (active?.plugin !== PLUGIN) await s.run("core.card.add-tab", { card: focused.id, plugin: PLUGIN });
}

/** Waits until the visible term surfaces are registered and apply their theme, then returns those surfaces. */
export async function termReady(s) {
  const registered = (x) => x.exposes.includes("status core.surface.document") &&
    x.exposes.includes("status term.session") && x.exposes.includes("element term.view");
  await s.until("core.surfaces", (all) => all.some((x) => x.visible && x.plugin === PLUGIN && registered(x)),
    "no visible term surface registered its document, session, and view");
  // A notification that satisfies the predicate can describe the surface just before a reload replaces it. The function reads the
  // current registry before it returns the id, so it does not proceed with a stale surface id.
  const active = new Set((await s.get("core.grid")).cards.map((card) => card.active).filter(Boolean));
  const terms = (await s.surfaces(PLUGIN)).filter((x) => active.has(x.surface) && registered(x));
  for (const term of terms) {
    await s.until("core.surface.document", (doc) => doc !== null && doc.readyState === "complete" && doc.themed,
      `term ${term.surface} did not apply its theme`, { surface: term.surface });
  }
  return terms;
}

/** The surface registration rows of the trace that the event log gained after the offsets. */
async function registrationTimeline(s, offsets) {
  await s.flushLog();
  return traceRows(readEvents(s.app.configDir, offsets).events).filter((row) => row.event === "surface.registration");
}

/**
 * Puts the window in the start state of a check and returns the start term, an entry of core.surfaces. `log` is the log policy that the
 * check declares and `reads` the records below `error` that it reads (prepareFixture); with the performance trace the registration
 * timeline of a failed start is read too.
 */
export async function fresh(s, { performanceTrace = TRACE, settings = {}, log = {}, reads = [] } = {}) {
  const traceOffsets = currentEventOffsets(s.app.configDir);
  const declared = performanceTrace ? [...reads, "workbench.trace.surface.registration"] : reads;
  await prepareFixture(s, { settings: { ...settings, "term.shell": CHECK_SHELL }, performanceTrace, log,
    reads: declared, catalog: declared.length ? recordCatalog(s.app.configDir) : undefined });
  let term;
  try {
    await replacePlaceholders(s);
    await focusedTerm(s);
    [term] = await termReady(s);
  } catch (error) {
    if (!performanceTrace) throw error;
    throw new Error(`${error.message}; registration timeline: ${JSON.stringify(await registrationTimeline(s, traceOffsets))}`, { cause: error });
  }
  await s.presented();
  try {
    await s.get("term.session", term.surface);
  } catch (error) {
    throw new Error(`term readiness returned stale surface ${term.surface}: ${error.message}; ` +
      `current surfaces: ${JSON.stringify(await s.get("core.surfaces"))}`);
  }
  return term;
}
