import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../plugin.json", import.meta.url), "utf8"));
const command = (name) => manifest.exposes.commands.find((entry) => entry.name === name);

// The read modes of core docs/spec/terminal-read.md: each read command states its mode, what it is used for and what it cannot
// see, and the next mode, so that an agent takes the first mode that holds the text that it needs.
test("the read commands state their read mode, its use and what it cannot see", () => {
  const read = command("term.screen.read").description;
  assert.match(read, /Read mode Visible/, read);
  assert.match(read, /cannot see the rows above the viewport/, read);
  assert.match(read, /term\.screen\.rows/, read);
  const rows = command("term.screen.rows").description;
  assert.match(rows, /Read mode Kept rows/, rows);
  assert.match(rows, /screen is primary or alternate/, rows);
  assert.match(rows, /no input reaches the program/, rows);
  assert.match(rows, /cannot see the rows that the program never drew/, rows);
  assert.match(rows, /alternate\.active/, rows);
});

test("term.screen.rows declares screen as a parameter of two values that it requires", () => {
  const { params } = command("term.screen.rows");
  assert.deepEqual(params.properties.screen, { type: "string", enum: ["primary", "alternate"] });
  // The schema form of a manifest has no required list, so the description states that screen is required.
  assert.match(command("term.screen.rows").description, /screen is required/);
});

test("term.session declares the members that choose a read mode", () => {
  const session = manifest.exposes.status.find((entry) => entry.name === "term.session");
  const { properties } = session.schema;
  assert.deepEqual(Object.keys(properties.scrollback.properties), ["offset", "history", "dropped"]);
  assert.deepEqual(Object.keys(properties.alternate.properties), ["active", "history", "dropped"]);
  assert.deepEqual(Object.keys(properties.foreground.properties), ["pid", "command", "cwd", "error"]);
  for (const member of ["alternate", "dropped", "foreground"]) assert.match(session.description, new RegExp(member), member);
});

// The program scroll of core docs/spec/terminal-read.md#program-scroll: the description states the mode, that input reaches the
// program, the restore, and the modes to take first.
const params = (entry) => entry.params.properties;
test("term.screen.scroll.read states the read mode Program scroll and declares by and the quiet setting", () => {
  const scroll = command("term.screen.scroll.read");
  assert.match(scroll.description, /Read mode Program scroll/, scroll.description);
  assert.match(scroll.description, /input reaches the program/, scroll.description);
  assert.match(scroll.description, /restored/, scroll.description);
  assert.match(scroll.description, /term\.screen\.rows/, scroll.description);
  assert.deepEqual(params(scroll), { by: { type: "integer" } });
  // The schema form of a manifest has no required list and no bounds, so the description states them.
  assert.match(scroll.description, /by is required, an integer from -1000 to 1000 other than 0/, scroll.description);
  const quiet = manifest.settings.scrollReadQuiet;
  assert.deepEqual({ type: quiet.type, default: quiet.default, minimum: quiet.minimum, maximum: quiet.maximum },
    { type: "integer", default: 6, minimum: 1, maximum: 120 });
  assert.match(command("term.screen.rows").description, /term\.screen\.scroll\.read/);
});
