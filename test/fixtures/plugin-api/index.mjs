// The main module of the plugin API fixtures (`@soksak/plugin-api`). The page imports two names from it: shellQuotePath, whose answer the
// test arranges (arrange.mjs), and createExpose, the exposure of the view that answers the requests of the host as the exposure
// relay states them (docs/spec/exposure.md#relay).
import { arrangement } from "./arrange.mjs";

/** Returns the quoted shell word of a path; the answer is the one that the test arranged. */
export function shellQuotePath(path) {
  if (arrangement.shellQuotePath === null) throw new Error(`shellQuotePath(${JSON.stringify(path)}) has no arranged answer`);
  return arrangement.shellQuotePath(path);
}

/**
 * Returns the exposure of a view over its port, which the page declares by the names that `declared()` returns. The port has register,
 * onRequest, reply, changed and report (ui/view-exposure-port.js). A declared name is registered once; a request of the host answers
 * the provider that the page registered for its name: status.get reads the status, status.watch sends its value, and command.run runs
 * the command. A name that the page did not declare is refused.
 */
export function createExpose(port, declared) {
  const providers = { status: new Map(), command: new Map() };
  const binds = [];
  const isDeclared = (kind, name) => (declared()[kind === "command" ? "commands" : kind] ?? []).some((entry) => entry.name === name);
  const declare = (kind, name) => {
    if (!isDeclared(kind, name)) throw new Error(`${kind} ${name} is not declared by the view`);
    return port.register(kind, name);
  };
  const run = (name, params) => {
    const handler = providers.command.get(name);
    if (handler === undefined) return Promise.reject(new Error(`command ${name} has no handler in the view`));
    return Promise.resolve(handler(params));
  };
  const answer = async ({ id, method, params }) => {
    if (method === "status.get") {
      const provider = providers.status.get(params.name);
      if (provider === undefined) throw new Error(`status ${params.name} has no provider in the view`);
      return provider.read();
    }
    if (method === "status.watch") {
      // The host asks the view to follow a status: the current value is sent at once, and each later change through the subscription.
      const provider = providers.status.get(params.name);
      if (provider === undefined) throw new Error(`status ${params.name} has no provider in the view`);
      if (!provider.watching) {
        provider.watching = true;
        provider.subscribe((value) => {
          provider.version += 1;
          port.changed(params.name, value, provider.version);
        });
      }
      provider.version += 1;
      port.changed(params.name, provider.read(), provider.version);
      return null;
    }
    if (method === "command.run") return run(params.name, params.params);
    throw new Error(`the view exposure does not answer ${method}`);
  };
  port.onRequest(({ id, method, params }) => {
    answer({ id, method, params }).then(
      (result) => port.reply(id, { result: result ?? null }),
      (error) => port.reply(id, { error: { code: -32000, message: error?.message ?? String(error) } }),
    );
  });
  return {
    async status(name, read, subscribe) {
      await declare("status", name);
      providers.status.set(name, { read, subscribe, version: 0, watching: false });
    },
    async command(name, handler) {
      await declare("command", name);
      providers.command.set(name, handler);
    },
    async element(name, element) {
      await declare("element", name);
      element.dataset.expose = name;
    },
    mark(element, name) {
      element.dataset.expose = name;
    },
    async bind(element, name, params, { event, when, failed }) {
      // A control points to its command with data-command (docs/spec/exposure.md, user interface).
      element.dataset.command = name;
      const listener = (domEvent) => {
        if (!when(domEvent)) return;
        run(name, params).catch(failed);
      };
      element.addEventListener(event, listener);
      binds.push(() => element.removeEventListener(event, listener));
    },
    async dispose() {
      for (const release of binds.splice(0)) release();
      providers.status.clear();
      providers.command.clear();
    },
  };
}
