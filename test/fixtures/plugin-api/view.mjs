// The view bridge of the plugin API fixtures (`@soksak/plugin-api/view`), which the page of a terminal view builds over its channel
// (docs/spec/native-surfaces.md#view-surfaces). The page makes its calls through `calls.request(command, params)`, subscribes through the
// runtime, and answers the host requests of its commands. This module makes those calls on the channel that the test passes as
// `handler`, and it delivers the events of the channel to the subscriptions of the page. The channel is the test's arrangement:
//
//     call(command, params)   returns the answer of a page call, or throws its refusal
//     listen(event, fn)       calls fn(data) for each event that the test pushes; returns the function that removes it
//     handle(command, fn)     answers a host request of the command with fn(params); returns the function that removes it
//     levels()                returns the log levels of the view
//     plugin                  the id of the plugin of the view; the log names of the page carry it as plugin.<id>.<name>
//
// Nothing here implements the host or the wire of the view channel.

/** The events of the log, from the lowest level to the highest. */
const LEVELS = ["trace", "debug", "info", "warn", "error"];

/**
 * Returns the view bridge of one page. The page passes the channel as handler and the function that reports a bridge failure as report.
 */
export function createViewBridge({ handler, report }) {
  if (handler === null || typeof handler !== "object" || ["call", "listen", "handle", "levels"].some((name) => typeof handler[name] !== "function")) {
    throw new TypeError("createViewBridge requires the channel of the view with call, listen, handle and levels");
  }
  if (typeof report !== "function") throw new TypeError("createViewBridge requires a report function");
  if (typeof handler.plugin !== "string" || handler.plugin === "") throw new TypeError("createViewBridge requires the plugin id of the channel");

  const request = (command, params) => handler.call(command, params);

  /** Subscribes the page to an event of the host after the host answers the subscription; resolves with the function that removes it. */
  const subscribe = (params, command, release) => request(command, params).then(() => release, (error) => {
    release();
    throw error;
  });

  const writeLog = (level) => (name, fields = {}, { cids = null } = {}) => {
    const event = { event: `plugin.${handler.plugin}.${name}`, level, fields: typeof fields === "function" ? fields() : fields, cids };
    request("runtime.log", { action: "batch", events: [event] }).catch((error) => report({ kind: "log", error }));
  };
  const log = {
    levels: () => handler.levels(),
    ...Object.fromEntries(LEVELS.map((level) => [level, writeLog(level)])),
  };

  const sidecar = (name) => ({
    on: (surface, fn) => subscribe({ sidecar: name, id: surface }, "runtime.sidecar.on", handler.listen("sidecar.message", (data) => {
      if (data.id === surface) fn(data.body);
    })),
    onFailure: (surface, fn) => subscribe({ sidecar: name, id: surface }, "runtime.sidecar.onFailure", handler.listen("sidecar.failure", (data) => {
      if (data.id === surface) fn(data.reason);
    })),
  });

  const composition = {
    /** Attaches the regions of the composition of the view and returns the composition that holds them. */
    create: async (elements) => {
      // The input of the view region is delivered to the input handler that the page gives at the creation (docs/spec/surface-composition.md).
      const input = elements.input?.view;
      if (input !== undefined) handler.listen("image-event", (data) => { if (data.name === "view") input(data.event); });
      const declaration = await request("composition.declaration", null);
      const names = Object.keys(elements.regions);
      const regions = names.map((name) => {
        const declared = declaration.regions.find((region) => region.name === name);
        if (declared === undefined) throw new Error(`the composition declares no region ${name}`);
        return { name, sidecar: declared.sidecar };
      });
      await request("composition.place", { regions, overlays: Object.keys(elements.overlays ?? {}) });
      for (const { name, sidecar } of regions) await request("image.attach", { name, sidecar });
      let disposed = false;
      return {
        region(name) {
          if (!names.includes(name)) throw new Error(`the composition holds no region ${name}`);
          return {
            focus: () => request("image.focus", { name }),
            setCaret: (caret) => request("image.caret", { name, caret }),
            on: (type, fn) => handler.listen("image-event", (data) => {
              if (data.name === name && data.event?.type === type) fn(data.event);
            }),
          };
        },
        async dispose() {
          // A composition ends once; a second dispose of the page has no region left to detach.
          if (disposed) return;
          disposed = true;
          for (const name of names) await request("image.detach", { name });
        },
      };
    },
  };

  return {
    calls: { request },
    runtime: {
      theme: (fn) => handler.listen("theme", fn),
      textSize: {
        read: () => request("runtime.textSize.read", null),
        on: (fn) => subscribe({}, "runtime.textSize.on", handler.listen("textSize", fn)),
      },
      settings: {
        read: () => request("runtime.settings.read", null),
        on: (fn) => subscribe({}, "runtime.settings.on", handler.listen("settings", fn)),
      },
      clipboard: {
        read: (type) => request("runtime.clipboard.read", type),
        writeText: (text) => request("runtime.clipboard.writeText", text),
      },
      error: (where, text) => request("runtime.error", { where, text }),
      log,
      native: {
        on: (name, fn) => subscribe({ name }, "runtime.native.on", handler.listen(name, fn)),
      },
      sidecar,
      // A watch of a status makes the call runtime.status.watch and delivers each `status` event of its name; its end makes the call
      // runtime.status.unwatch (core docs/spec/native-surfaces.md#view-surfaces, view events).
      status: {
        watch: (name, fn, { surface } = {}) => {
          const params = surface === undefined ? { name } : { name, surface };
          const release = handler.listen("status", (data) => { if (data.name === name && data.surface === surface) fn(data.value); });
          request("runtime.status.watch", params).catch((error) => report({ kind: "status", error }));
          return () => {
            release();
            request("runtime.status.unwatch", params).catch((error) => report({ kind: "status", error }));
          };
        },
      },
    },
    composition,
    commands: {
      register: (name, run) => {
        const release = handler.handle(name, run);
        return request("runtime.command.register", { name }).then(() => release, (error) => {
          release();
          throw error;
        });
      },
    },
    exposure: {
      register: (kind, name) => request("runtime.native.call", { name: "registered", payload: { kind, name } }),
      reply: (id, payload) => request("runtime.native.call", { name: "exposureReply", payload: { id, ...payload } }),
      changed: (name, value, version) => request("runtime.native.call", { name: "changed", payload: { name, value, version } }),
    },
  };
}
