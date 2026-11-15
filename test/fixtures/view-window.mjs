// The window of a view page for the plugin tests. The view is a jsdom window at soksak://<plugin id>/, and the page modules of this plugin run
// in it unchanged. The page reaches the plugin API through its channel, which this module provides as the `sok-view` message handler of
// the window: the page makes each call of the plugin API on the channel (call), subscribes to the events of the host (listen), and answers
// the host requests of its commands (handle). The channel is the test's arrangement of the answers of the host: each call is recorded,
// and it is answered as the options arrange, or refused with an explicit error when the options arrange no answer. Nothing here
// implements the host or the wire of the view channel; the calls reach the page through @soksak/plugin-api/view.
import { randomUUID } from "node:crypto";
import { JSDOM } from "jsdom";

/** The globals of Node that the page keeps: the window does not replace them. */
const NODE_GLOBALS = new Set(["console", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "clearImmediate",
  "queueMicrotask", "structuredClone", "performance", "crypto", "fetch", "URL", "URLSearchParams", "TextEncoder", "TextDecoder", "AbortController",
  "AbortSignal", "Blob", "File", "FormData", "Headers", "Request", "Response", "WebSocket", "process", "Buffer", "global", "globalThis"]);

/** The view that is open in this process: the globals of the window are installed for it and restored when it closes. */
let openWindow = null;

/** The loads of page modules in this process: each load of a page is a module of its own, because a module evaluates once per URL. */
let pageLoads = 0;

/** The entries of the document that the core declares for each view: the page registers them, so the start values declare them too. */
const CORE_DECLARATIONS = {
  status: [{ name: "core.surface.document" }, { name: "core.surface.input" }],
  commands: [{ name: "core.surface.hit" }, { name: "core.surface.clock" }],
};

/** A call that the host refuses or fails: its message is the message of the error, and its code is the error code. */
class CallError extends Error {
  constructor(message, code = -32000) {
    super(message);
    this.code = code;
  }
}

/** Installs the own properties of the window as globals and returns the function that restores the previous globals. */
function installGlobals(window) {
  const previous = new Map();
  // The members of the prototypes of the window (addEventListener, for one) fill the names that no global of Node has.
  const inherited = [];
  for (let proto = Object.getPrototypeOf(window); proto !== null && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== "constructor" && typeof Object.getOwnPropertyDescriptor(proto, name).value === "function" && !inherited.includes(name)) inherited.push(name);
    }
  }
  for (const name of inherited) {
    if (name in globalThis) continue;
    previous.set(name, undefined);
    Object.defineProperty(globalThis, name, { value: window[name].bind(window), configurable: true, writable: true });
  }
  for (const name of Object.getOwnPropertyNames(window)) {
    if (NODE_GLOBALS.has(name)) continue;
    const before = Object.getOwnPropertyDescriptor(globalThis, name);
    if (before !== undefined && before.configurable === false) continue;
    const own = Object.getOwnPropertyDescriptor(window, name);
    previous.set(name, before);
    // An accessor of the window stays an accessor: the storage accessors throw for the opaque origin of a view.
    if (own.get !== undefined) {
      Object.defineProperty(globalThis, name, { get: () => window[name], configurable: true, enumerable: false });
      continue;
    }
    const value = own.value;
    const bound = typeof value === "function" && /^[a-z]/.test(name) ? value.bind(window) : value;
    Object.defineProperty(globalThis, name, { value: bound, configurable: true, writable: true, enumerable: false });
  }
  return () => {
    for (const [name, before] of previous) {
      if (before === undefined) delete globalThis[name];
      else Object.defineProperty(globalThis, name, before);
    }
  };
}

/**
 * The ResizeObserver of the view window. jsdom has no layout observer, so the observer records its targets, and the test delivers each
 * size change to its callback through notify(entries).
 */
class ViewResizeObserver {
  constructor(callback) {
    if (typeof callback !== "function") throw new TypeError("ResizeObserver requires a callback");
    this.callback = callback;
    this.targets = [];
    openWindow?.observers.push(this);
  }

  observe(target) {
    if (!this.targets.includes(target)) this.targets.push(target);
  }

  unobserve(target) {
    this.targets = this.targets.filter((observed) => observed !== target);
  }

  disconnect() {
    this.targets = [];
  }

  notify(entries) {
    this.callback(entries, this);
  }
}

/** The declarations of the view with the entries of the core document added: the status and command lists of the plugin come first. */
function withCoreDeclarations(declarations) {
  return {
    ...declarations,
    status: [...declarations.status ?? [], ...CORE_DECLARATIONS.status],
    commands: [...declarations.commands ?? [], ...CORE_DECLARATIONS.commands],
  };
}

/** The text of an error that a call reports: the message of an Error, or the text of any other value. */
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Opens the window of a view page and returns the host of the view. Options:
 *
 *     plugin        the plugin id, which is the host of the view origin
 *     surface       the surface of the view
 *     start         the start values of the surface (window.sokSurface), or undefined for a view without start values
 *     theme         the theme of the window (window.sokTheme)
 *     declarations  the exposure declarations of the plugin: {status, commands, element}
 *     sidecars      the sidecars that plugin.json declares, as names
 *     composition   the composition declaration of the view (plugin.json surface.composition)
 *     sidecar       function(body, {id}) that answers each runtime.sidecar.send: its return value is the result, a throw is the error
 *     image         {attach, focus, caret, detach}: functions of the params of each image call of the composition
 *     native        {name: function(payload)} that answers runtime.native.call beyond the registrations and the exposure reply
 *     clipboard     {read(type), readPNG(), writeText(text)} that answer the clipboard calls; a clipboard with no payload reads null
 *     faults        {route: message} for routes that reject with the message; an image call routes as composition.<call>
 *     settings      the settings values that runtime.settings.read answers
 *     textSize      the text scale that runtime.textSize.read answers
 *     levels        the log levels of the view
 *
 * Returns the host: window, calls, observed {errors, sidecar}, events, observers, registered(kind), request(command, params),
 * push(event, data), sidecarMessage(sidecar, surface, message), sidecarFailure(sidecar, surface, reason), settled(), load(url), close().
 */
export function openViewWindow(options) {
  if (openWindow !== null) throw new Error("a view window is already open in this test process; close it before opening another");
  const { plugin, surface, start, theme, declarations, sidecars, composition, sidecar = () => null, image = {}, native = {},
    clipboard = {}, faults = {}, settings = {}, textSize = 1, levels } = options;
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: `soksak://${plugin}/ui/terminal.html`,
    pretendToBeVisual: true,
  });
  const window = dom.window;
  const listeners = new Map();
  const handlers = new Map();
  const host = {
    window,
    calls: [],
    observed: { errors: [], sidecar: [] },
    events: [],
    observers: [],
    registered: (kind) => host.calls
      .filter(({ command, params }) => command === "runtime.native.call" && params.name === "registered" && params.payload.kind === kind)
      .map(({ params }) => params.payload.name).filter((name) => !name.startsWith("core.")),
    request,
    push,
    sidecarMessage,
    sidecarFailure,
    settled,
    load,
    close,
  };
  // The routes that the page has open: the sidecar sessions that route messages and failures to the view.
  const sidecarRoutes = new Set();
  const failureRoutes = new Set();
  // The page calls that the host has not answered yet: settled() waits until none is left.
  let inFlight = 0;
  const idle = [];
  let closed = false;

  const restoreGlobals = installGlobals(window);
  // The start values carry the declarations of the plugin with the core entries of the view document.
  if (start !== undefined) {
    window.sokSurface = start === null ? null : { ...start, levels, declarations: withCoreDeclarations(start.declarations) };
  }
  // The channel of the view: the page passes it to @soksak/plugin-api/view as its handler.
  const channel = {
    call(command, params) {
      const call = { command, params };
      host.calls.push(call);
      inFlight += 1;
      // The answer comes after the call returns to the page, as the host answers a call through its own queue.
      return new Promise((resolve, reject) => {
        setImmediate(() => {
          Promise.resolve()
            .then(() => route(command, params))
            .then(resolve, reject)
            .finally(finish);
        });
      });
    },
    listen(event, fn) {
      if (typeof fn !== "function") throw new TypeError(`listen ${event} requires a function`);
      const set = listeners.get(event) ?? new Set();
      set.add(fn);
      listeners.set(event, set);
      return () => set.delete(fn);
    },
    handle(command, fn) {
      if (handlers.has(command)) throw new Error(`the view already handles ${command}`);
      handlers.set(command, fn);
      return () => handlers.delete(command);
    },
    levels: () => levels,
    plugin,
  };
  window.webkit = { messageHandlers: { "sok-view": channel } };
  window.sokTheme = theme;
  window.ResizeObserver = ViewResizeObserver;
  // jsdom has no visual viewport: the viewport is the window itself at its own size and scale.
  Object.defineProperty(window, "visualViewport", {
    value: Object.assign(new window.EventTarget(), { width: window.innerWidth, height: window.innerHeight, scale: 1, offsetLeft: 0, offsetTop: 0 }),
    configurable: true,
  });
  openWindow = host;

  /** Waits until the page has no call in flight and sends nothing more after one turn of the event loop. */
  async function settled() {
    for (;;) {
      while (inFlight > 0) await new Promise((resolve) => idle.push(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      if (inFlight === 0) return;
    }
  }

  function finish() {
    inFlight -= 1;
    if (inFlight === 0) for (const resolve of idle.splice(0)) resolve();
  }

  /** The answer of one page call by its route. A route with a fault rejects with the message of the fault. */
  async function route(command, params) {
    const name = command.startsWith("image.") ? `composition.${command}` : command;
    if (Object.hasOwn(faults, name)) throw new CallError(faults[name]);
    if (command.startsWith("image.")) {
      const operation = image[command.slice("image.".length)];
      if (typeof operation !== "function") throw new Error(`the view has no answer for ${command}`);
      return operation(params);
    }
    switch (command) {
      case "composition.declaration": return composition;
      case "composition.place":
      case "composition.report":
      case "tab.focus":
      case "tab.title":
      case "tab.footer":
      case "tab.directory":
      case "tab.modified":
      case "tab.error":
      case "tab.notify":
      case "tab.keep":
      case "runtime.command.register":
      case "runtime.native.on":
      case "runtime.sidecar.on":
      case "runtime.sidecar.onFailure":
      case "runtime.textSize.on":
      case "runtime.settings.on":
      case "runtime.log.levels.on":
      case "runtime.status.watch":
      case "runtime.status.unwatch":
      case "runtime.contributions.fail":
      case "runtime.links.open":
      case "runtime.clipboard.writeText":
      case "runtime.data.set":
        return subscribe(command, params);
      case "runtime.error":
        host.observed.errors.push(`error workbench surface ${surface} ${params.where}: ${params.text}`);
        return null;
      case "runtime.log":
        return logCall(params);
      case "runtime.native.call":
        return nativeCall(params);
      case "runtime.sidecar.send":
        return sidecarSend(params);
      case "runtime.textSize.read": return textSize;
      case "runtime.settings.read": return settings;
      case "runtime.clipboard.read": return clipboardRead(params);
      case "surface.menu": return false;
      case "runtime.contributions": return [];
      default:
        throw new Error(`the view has no answer for ${command}`);
    }
  }

  /** The subscriptions and registrations of the page: each records its route and replies null. */
  function subscribe(command, params) {
    if (command === "runtime.sidecar.on" || command === "runtime.sidecar.onFailure") {
      checkSidecar(params.sidecar);
      (command === "runtime.sidecar.on" ? sidecarRoutes : failureRoutes).add(`${params.sidecar}\u0000${params.id}`);
    }
    if (command === "runtime.command.register" && !params.name.startsWith("core.")) {
      if (!(declarations.commands ?? []).some(({ name }) => name === params.name)) {
        throw new CallError(`command ${params.name} is not declared by ${plugin}`);
      }
    }
    return null;
  }

  function checkSidecar(name) {
    if (!sidecars.includes(name)) throw new CallError(`${plugin} declares no sidecar ${name}`);
  }

  function logCall(params) {
    if (params.action === "clock") {
      return { ts_us: Math.round(Date.now() * 1000), mono_ns: Number(process.hrtime.bigint()) };
    }
    if (params.action !== "batch") throw new CallError(`runtime.log has no action ${String(params.action)}`);
    host.events.push(...params.events);
    return null;
  }

  function nativeCall({ name, payload }) {
    if (name === "registered") {
      const { kind, name: entry } = payload;
      if (!entry.startsWith("core.")) {
        const list = kind === "element" ? declarations.element : declarations[kind === "command" ? "commands" : kind];
        if (!Array.isArray(list) || !list.some((declared) => declared.name === entry)) {
          throw new CallError(`registered: ${entry} is not declared as ${kind} by ${plugin}`);
        }
      }
      return null;
    }
    if (name === "changed" || name === "exposureReply") return null;
    if (Object.hasOwn(native, name)) return native[name](payload);
    throw new Error(`the view has no native call ${name}`);
  }

  function sidecarSend({ id, sidecar: name, body, cids }) {
    checkSidecar(name);
    host.observed.sidecar.push({ sidecar: name, id, body, cids });
    return sidecar(body, { id });
  }

  function clipboardRead(type) {
    if (type === "png") return clipboard.readPNG ? clipboard.readPNG() : null;
    return clipboard.read ? clipboard.read(type) : null;
  }

  /** Delivers an event of the host to the page's subscriptions of that event. */
  function push(event, data) {
    for (const fn of listeners.get(event) ?? []) fn(data);
  }

  /** Delivers a sidecar message of a session to the view when the view subscribed to that session (docs/spec/native-surfaces.md). */
  function sidecarMessage(name, id, { body, cids }) {
    if (!sidecarRoutes.has(`${name}\u0000${id}`)) return;
    push("sidecar.message", { id, cids, body });
  }

  /** Delivers a sidecar failure of a session to the view when the view subscribed to that session under the failure route. */
  function sidecarFailure(name, id, reason) {
    if (!failureRoutes.has(`${name}\u0000${id}`)) return;
    push("sidecar.failure", { id, reason });
  }

  /** Makes a host request of a command that the page handles, and resolves with the answer of the page. */
  function request(command, params) {
    const handler = handlers.get(command);
    if (handler === undefined) return Promise.reject(new Error(`the view handles no command ${command}`));
    inFlight += 1;
    return Promise.resolve().then(() => handler(params)).finally(finish);
  }

  /** Loads a page module into the window, as the view loads its page: the module evaluates against the globals of this window. */
  async function load(url) {
    pageLoads += 1;
    return import(`${url.href}?view=${pageLoads}`);
  }

  /** Ends the view: the page is hidden, its calls settle, and the window and the globals are released. Closing twice is a no-op. */
  async function close() {
    if (closed) return;
    closed = true;
    try {
      window.dispatchEvent(new window.Event("pagehide"));
      await settled();
    } finally {
      window.close();
      restoreGlobals();
      openWindow = null;
    }
  }

  return host;
}
