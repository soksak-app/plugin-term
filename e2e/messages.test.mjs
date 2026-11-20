// The window check of the messages of a term terminal (core docs/spec/messaging.md#path-of-the-reads and #injected-message): an agent
// in one terminal waits through the MCP tool messages_wait and reads the message that the shell of another terminal writes with
// `sok message send`, the page of the receiving terminal injects the message, and the send prints the hold of the receiver.
// The agent is a script: the MCP client of the ecosystem (@modelcontextprotocol/sdk) runs `sok mcp` of the application with the
// environment of a process of the first terminal, so no agent program, account or prompt takes part. The check opens a project
// window, because a terminal registers its folder <root>/.soksak/messages/<surface> only in the window of a project. Every wait
// ends on the status, the open call or the tool result that it names; no timer judges the check.
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { APPS, open } from "@soksak/window-check/app.mjs";
import { fresh } from "@soksak/window-check/start.mjs";

const PLUGIN = "term";
const PROMPT = "sh-3.2$";
const CHECK_SHELL = fileURLToPath(new URL("./check-shell", import.meta.url));
// The time limit of the test. The library ends a request at its own request timeout, so the call of messages_wait sets that
// timeout above the limit of the test: the arrival of the message ends the wait, and the limit of the test ends a check that
// never receives it.
const LIMIT = 180000;
const TEXT = "hello from the other terminal";
// The seconds that the shell of the sender waits before the send. The sidecar records a request in progress after 10 seconds as the
// error sidecar.alacritty.request_waiting (docs/spec/alacritty-core.md of the sidecar), and a pending messages_wait is no request in
// progress, so the wait lasts beyond that bound; each error of the application log fails the check. The program sleep holds the
// command for the time, and the check waits on the screen of the sender, not on a timer.
const WAIT_SECONDS = 11;

/** The text of the rows that term.screen reports, one line for each row without its trailing spaces. */
const screenLines = (rows) => rows.map((row) => row.map((cell) => (cell.ch === undefined ? " ".repeat(cell.width) : cell.ch)).join("").trimEnd());

/** The JSON value of the text content of a tool result; a tool error fails with its text. */
function toolValue(result, tool) {
  const text = result.content?.find((item) => item.type === "text")?.text;
  assert.equal(result.isError ?? false, false, `${tool} failed: ${text}`);
  assert.equal(typeof text, "string", `${tool} returned no text content: ${JSON.stringify(result)}`);
  return JSON.parse(text);
}

/** Waits until the term tab `surface` shows the prompt of the check shell. */
const untilPrompt = (p, surface) => p.until(`${PLUGIN}.screen`, (rows) => screenLines(rows).some((line) => line.startsWith(PROMPT)),
  `${PLUGIN} tab ${surface} did not display its shell prompt`, { surface });

/** The number of open calls of the plugin in core.plugin.open-calls. */
const openCalls = (calls) => calls.find((entry) => entry.plugin === PLUGIN)?.count ?? 0;

for (const app of Object.values(APPS)) {
  test(`${app.name}: an agent of one term terminal waits for and reads the message of another`, { timeout: LIMIT }, async (t) => {
    const s = await open(t, app);
    await fresh(s, { settings: { "term.shell": CHECK_SHELL } });

    const root = realpathSync(mkdtempSync(join(tmpdir(), "soksak-messages-")));
    s.cleanup(() => rmSync(root, { recursive: true, force: true }));
    s.cleanupSteps(
      async () => {
        for (const window of await s.get("host.windows")) {
          if (window.window !== s.window) await s.on(window.window).close();
        }
        await s.windows(1, "the check left an extra window");
      },
      async () => {
        for (const project of await s.get("core.projects")) {
          if (project.root === root) await s.run("core.project.close", { id: project.id });
        }
        await s.run("core.projects.flush");
      },
    );
    await s.run("core.settings.set", { patch: { projectOpening: "windows" }, scope: "common" });
    await s.run("core.project.open", { root, color: "#7db4ff" });
    const windows = await s.windows(2, "the project window did not open");
    const p = s.on(windows.find((w) => w.window !== s.window).window);

    // The reader is a tab of the focused card of the project window and the sender a tab of a card beside it, so both show.
    const grid = await p.get("core.grid");
    const focused = grid.cards.find((card) => card.focused);
    assert.ok(focused, `the project window has no focused card: ${JSON.stringify(grid.cards)}`);
    const { tab: reader } = await p.run("core.card.add-tab", { card: focused.id, plugin: PLUGIN });
    const { tab: sender } = await p.run("core.card.split", { card: focused.id, side: "right", plugin: PLUGIN });
    const folder = join(root, ".soksak", "messages", reader);
    const registered = await p.until(`${PLUGIN}.messages`, (value) => value?.folder === folder && typeof value.registration === "string",
      `${PLUGIN} tab ${reader} did not register the folder ${folder}`, { surface: reader });
    await untilPrompt(p, sender);

    const client = new Client({ name: "soksak-window-check", version: "0.0.0" });
    const transport = new StdioClientTransport({
      command: join(dirname(app.binary), "sok"),
      args: ["mcp"],
      env: { ...process.env, SOKSAK_CONFIG_DIR: app.configDir, SOKSAK_SURFACE: reader },
      stderr: "inherit",
    });
    await client.connect(transport);
    s.cleanup(() => client.close());

    const before = toolValue(await client.callTool({ name: "messages_read", arguments: { terminal: reader } }), "messages_read");
    assert.equal(before.registration, registered.registration, "messages_read answered another registration than term.messages");
    assert.deepEqual(before.messages, [], `the folder of ${reader} held messages before the send: ${JSON.stringify(before.messages)}`);

    const calls = openCalls(await p.get("core.plugin.open-calls"));
    const waiting = client.callTool({ name: "messages_wait", arguments: { terminal: reader, after: before.last, registration: before.registration } },
      undefined, { timeout: 2 * LIMIT });
    // The send follows the open call of term.messages.wait, so the reply of the wait is the arrival of a message after the wait began.
    await p.until("core.plugin.open-calls", (value) => openCalls(value) > calls, `term.messages.wait of ${reader} did not open a call`);

    await p.run(`${PLUGIN}.input`,
      { bytes: `sleep ${WAIT_SECONDS} && '${join(dirname(app.binary), "sok")}' message send '${folder}' '${TEXT}'\r` }, sender);
    // The reply of the command, or its error, follows the command line on the screen of the sender. The screen wraps long lines, so
    // the rows from the prompt line of the command to the next prompt are joined, without the space that ends a wrapped row; the command
    // line itself holds neither `{"path":` nor `sok: `. The reply is {path, receiver} with the receiver {surface, plugin, held} of the
    // folder (core docs/spec/cli.md#commands); an error or any other output is a failed send, which the check reports with its text.
    const output = (rows) => {
      const lines = screenLines(rows);
      const start = lines.findLastIndex((line) => line.startsWith(`${PROMPT} sleep `));
      return start < 0 ? "" : lines.slice(start).join("");
    };
    const reply = (text) => text.match(/(\{"path":"[^"]+".*\}|sok: .*?)sh-3\.2\$$/)?.[1];
    const text = reply(output(await p.until(`${PLUGIN}.screen`, (rows) => reply(output(rows)) !== undefined,
      `sok message send in ${PLUGIN} tab ${sender} printed no reply`, { surface: sender })));
    assert.ok(text.startsWith("{"), `sok message send failed in ${PLUGIN} tab ${sender}: ${text}`);
    const sent = JSON.parse(text);
    const name = sent.path;
    // The receiver holds no injection: its shell waits at the prompt, no program reports a record, and nobody types into it.
    assert.deepEqual(sent, { path: name, receiver: { surface: reader, plugin: PLUGIN, held: null } },
      `sok message send printed another reply than {path, receiver}: ${text}`);
    const arrived = toolValue(await waiting, "messages_wait");
    assert.equal(arrived.registration, before.registration, "messages_wait answered another registration");
    assert.equal(arrived.messages.length, 1, `messages_wait did not answer one message: ${JSON.stringify(arrived)}`);
    const [message] = arrived.messages;
    assert.equal(message.text, TEXT, "the message does not hold the sent text");
    assert.equal(message.from, sender, "the sender of the message is not the surface of the sending terminal");
    assert.equal(message.path, name, "the message is not the file that sok message send wrote");
    assert.ok(message.path.startsWith(`${sender}.`) && message.path.endsWith(".txt"), `the message file ${message.path} is not named by its sender`);
    assert.ok(message.seq > before.last && arrived.last >= message.seq, `the cursor did not advance: ${JSON.stringify({ before: before.last, arrived })}`);

    // The page of the reader injects the message into the input of its shell and reports the decision in term.messages.
    const delivered = await p.until(`${PLUGIN}.messages`, (value) => value?.last?.path === name,
      `${PLUGIN} tab ${reader} decided no delivery of ${name}`, { surface: reader });
    assert.deepEqual(delivered.last, { seq: message.seq, path: name, from: sender, state: "injected", reason: null },
      `${PLUGIN} tab ${reader} did not inject ${name}`);
    assert.equal(delivered.held, null, `${PLUGIN} tab ${reader} holds the injection: ${JSON.stringify(delivered.held)}`);

    // A read with the same cursor answers the same message, because a message is not consumed.
    const again = toolValue(await client.callTool({ name: "messages_read",
      arguments: { terminal: reader, after: before.last, registration: before.registration } }), "messages_read");
    assert.deepEqual(again.messages, arrived.messages, "a second read with the same cursor answered other messages");
  });
}
