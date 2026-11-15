// The fixtures of the terminal view opened with openView (@soksak/plugin-api/testing). The page module is the real ui/view.js, which the
// test loads with view.load(PAGE). Only what leaves the plugin is answered here: the sidecar of the terminal, the image region and the
// surface composition of the host, and the calls of the page that the host records. The declarations and the composition come from
// the plugin manifest, and the diagnostic declaration from diagnostics.json.
import { readFileSync } from "node:fs";
import { openView } from "@soksak/plugin-api/testing";

const manifest = JSON.parse(readFileSync(new URL("../../plugin.json", import.meta.url), "utf8"));
const diagnostics = JSON.parse(readFileSync(new URL("../../diagnostics.json", import.meta.url), "utf8"));

/** The page module of the terminal view, which the application serves as ui/terminal.html. */
export const PAGE = new URL("../../ui/view.js", import.meta.url);
/** The surface of the views of these tests, and the sidecar that plugin.json lists as its only dependency. */
export const SURFACE = "terminal-1";
const SIDECAR = Object.keys(manifest.dependencies)[0];
/** The exposure declarations of the plugin, and the declarations of a diagnostic build (the host merges diagnostics.json the same way). */
export const DECLARATIONS = manifest.exposes;
const DIAGNOSTIC_DECLARATIONS = {
  status: [...manifest.exposes.status, ...diagnostics.exposes.status],
  commands: [...manifest.exposes.commands, ...diagnostics.exposes.commands],
  element: manifest.exposes.element,
};
const DIAGNOSTIC_START = diagnostics;

/** The log levels of the page: each category writes its records at trace. */
const LOG_LEVELS = { lifecycle: "trace", input: "trace", call: "trace", io: "trace", frame: "trace" };

/** The settings of the plugin with their defaults, and the shell of the session. */
const settingsValues = () => ({
  ...Object.fromEntries(Object.entries(manifest.settings).map(([key, { default: value }]) => [key, value])),
  shell: "/bin/sh",
});

/** The theme of the window: the card tokens of the plugin's page, which the session receives as its colors. */
const THEME = { scheme: "dark", tokens: { "--card": "#ffffff", "--fg": "#252735", "--edge": "#d8dbe4", "--rail": "#5962e8" } };

/**
 * Opens the terminal view and loads its page. Options: diagnostic (whether the build is a diagnostic build), sidecar (the function that
 * answers each body the view sends to the sidecar), image (the fixtures of the image region: attach, focus, caret, text, detach), native
 * (the host answers of runtime.native.call beyond the bridge entries), faults (route names that reject), declarations (the exposure
 * declarations of the plugin, which the host checks each registration and binding against), and layout.
 */
export async function openTerminal(t, { diagnostic = true, declarations = diagnostic ? DIAGNOSTIC_DECLARATIONS : DECLARATIONS, sidecar = () => null, image = {}, native = {}, faults, layout = {} } = {}) {
  const view = await openView("term", {
    host: {
      surface: SURFACE,
      declarations,
      settings: settingsValues(),
      textSize: 1,
      logLevels: LOG_LEVELS,
      faults,
      sidecars: [SIDECAR],
      sidecar: { [SIDECAR]: sidecar },
      native: { registered: () => null, changed: () => null, exposureReply: () => null, ...native },
      composition: {
        declaration: () => manifest.surface.composition,
        place: () => null,
        report: () => null,
        image: { attach: () => null, focus: () => null, caret: () => null, text: () => null, detach: () => null, ...image },
      },
    },
    start: { surface: SURFACE, params: null, origin: { directory: null }, project: null, diagnostics: diagnostic ? DIAGNOSTIC_START : null },
    declarations,
    layout,
  });
  view.window.sokTheme = THEME;
  await view.load(PAGE);
  // The host sends the theme of the window as a message after the page starts, and the page passes it to its listeners.
  hostMessage(view, { event: "theme", data: THEME });
  await settleAll(view);
  // The view ends once: the test ends it when the test ends, unless the test ended it before.
  const close = view.close;
  let ended = false;
  view.close = async () => {
    if (ended) return;
    ended = true;
    await close();
  };
  t.after(() => view.close());
  return view;
}

/** Posts a message of the host to the window of the view, as the host posts the events and replies of the view. */
function hostMessage(view, message) {
  view.window.dispatchEvent(new view.window.MessageEvent("message", { data: { sok: 1, ...message }, source: view.window }));
}

/** The names of the commands that the page registered through runtime.command.register, in order (the core entries left out). */
export const commandsRegistered = (view) => view.calls.filter(({ command }) => command === "runtime.command.register")
  .map(({ params }) => params.name).filter((name) => !name.startsWith("core."));

/** The element of the terminal that the page exposes as term.view, which the page mounts in the shadow root of its body. */
export function terminalElement(view) {
  const host = view.window.document.body.firstElementChild;
  return host.shadowRoot.querySelector('[data-expose="term.view"]');
}

// The request ids of the exposure relay of the test, which are unique in the process.
let exposureRequests = 0;

/** Waits until the view has no more work: each reply and follow-up call of the page is sent. */
async function settleAll(view) {
  let sent = -1;
  while (sent !== view.sent.length) {
    sent = view.sent.length;
    await view.settled();
  }
}

/** Sends an exposure request of the method with params to the view, and resolves with the result the page answered (or rejects with its error). */
export async function exposure(view, method, params) {
  const id = ++exposureRequests;
  await view.push("exposure-request", { id, surface: SURFACE, method, params });
  await settleAll(view);
  const answer = view.calls.find((call) => call.command === "runtime.native.call" && call.params.name === "exposureReply" && call.params.payload.id === id);
  if (answer === undefined) throw new Error(`the page did not answer the exposure request ${method}`);
  const { error, result } = answer.params.payload;
  if (error !== undefined) throw new Error(error.message);
  return result;
}

/** The names of the image region calls of the view, in order, with their params. */
export const imageCalls = (view) => view.calls.filter((call) => call.command.startsWith("image.")).map(({ command, params }) => [command, params]);

/** The sends of the terminal to its sidecar session, in order: {id, body, cids}. */
export const sidecarSends = (view) => view.observed.sidecar.map(({ id, body, cids }) => ({ id, body, cids }));

/** Delivers a sidecar message of the session of the surface to the view, and waits until the page has handled it. */
export async function sidecarState(view, body) {
  view.sidecarMessage(SIDECAR, SURFACE, { body });
  await settleAll(view);
}

/** Delivers a region input event to the view, as the host delivers the input of the image region. */
export async function regionInput(view, event) {
  await view.push("image-event", { name: "view", event });
  await settleAll(view);
}
