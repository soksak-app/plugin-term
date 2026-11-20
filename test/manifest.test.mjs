import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../plugin.json", import.meta.url), "utf8"));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const diagnostics = JSON.parse(readFileSync(new URL("../diagnostics.json", import.meta.url), "utf8"));

/** 소스에서 등록한 공개 항목을 `<종류> <이름>` 으로 모은다. */
const registrations = (source) => [
  ...[...source.matchAll(/expose\.status\(\s*["']([^"']+)["']/g)].map((match) => `status ${match[1]}`),
  ...[...source.matchAll(/expose\.command\(\s*["']([^"']+)["']/g)].map((match) => `command ${match[1]}`),
  ...[...source.matchAll(/expose\.element\(\s*["']([^"']+)["']/g)].map((match) => `element ${match[1]}`),
].sort();
const kinds = { status: "status", commands: "command", element: "element" };
const declarations = (exposes) => Object.entries(exposes ?? {})
  .flatMap(([kind, entries]) => entries.map((entry) => `${kinds[kind]} ${entry.name}`))
  .sort();

test("the package publishes the manifest and the view page", () => {
  assert.ok(pkg.files.includes("plugin.json"));
  const page = manifest.surface.composition.page;
  assert.ok(existsSync(new URL(`../${page}`, import.meta.url)), page);
  assert.ok(pkg.files.some((entry) => page === entry || page.startsWith(`${entry}/`)), `${page} is published`);
  assert.equal(manifest.surface.module, undefined, "a view surface has no module");
});

test("compose and cursor preedit schemas use the supported range keywords", () => {
  const statuses = manifest.exposes.status;
  const compose = statuses.find(({ name }) => name === "term.compose").schema;
  const cursor = statuses.find(({ name }) => name === "term.cursor").schema.properties.preedit;
  const diagnostic = diagnostics.exposes.commands.find(({ name }) => name === "term.compose.update").params;
  for (const schema of [compose, cursor, diagnostic]) {
    assert.equal(Object.hasOwn(schema, "required"), false);
    assert.deepEqual(schema.properties.markedRange.type, ["object", "null"]);
    assert.equal(Object.hasOwn(schema.properties.markedRange, "required"), false);
    assert.equal(schema.properties.markedRange.properties.location.type, "integer");
    assert.equal(schema.properties.markedRange.properties.length.type, "integer");
  }
});

test("term.cursor declares its nullable screen frame", () => {
  const cursor = manifest.exposes.status.find(({ name }) => name === "term.cursor").schema;
  assert.deepEqual(cursor.properties.frame.type, ["object", "null"]);
  assert.deepEqual(Object.keys(cursor.properties.frame.properties).sort(), ["generation", "raster", "sequence"]);
  assert.ok(Object.values(cursor.properties.frame.properties).every(({ type }) => type === "integer"));
});

test("term.cursor declares its required nullable frame-effective caret", () => {
  const cursor = manifest.exposes.status.find(({ name }) => name === "term.cursor").schema;
  assert.deepEqual(cursor.properties.caret.type, ["object", "null"]);
  assert.deepEqual(Object.keys(cursor.properties.caret.properties).sort(), ["col", "row"]);
  assert.ok(Object.values(cursor.properties.caret.properties).every(({ type }) => type === "integer"));
  assert.match(manifest.exposes.status.find(({ name }) => name === "term.cursor").description,
    /frame-effective nullable caret/);
});

test("term.cursor declares its required nullable screen render metadata", () => {
  const cursor = manifest.exposes.status.find(({ name }) => name === "term.cursor").schema;
  assert.deepEqual(cursor.properties.render.type, ["object", "null"]);
  assert.equal(Object.hasOwn(cursor.properties.render, "description"), false,
    "the manifest schema dialect does not permit description on a schema object");
  assert.match(manifest.exposes.status.find(({ name }) => name === "term.cursor").description,
    /required nullable render/);
  assert.match(manifest.exposes.status.find(({ name }) => name === "term.cursor").description,
    /null means no matching draw/);
  assert.deepEqual(cursor.properties.render.properties.pixel.properties.format.enum, ["bgra8"]);
  assert.deepEqual(cursor.properties.render.properties.pixel.properties.alpha.enum, ["premultiplied"]);
  assert.deepEqual(cursor.properties.render.properties.underline.properties.colorSource.enum, ["glyph.foreground"]);
  assert.deepEqual(cursor.properties.render.properties.cursor.properties.color.type, ["string", "null"]);
});

test("the view page delegates terminal startup", () => {
  const source = readFileSync(new URL(`../${manifest.surface.composition.page}`, import.meta.url).pathname.replace(/\.html$/, ".js"), "utf8");
  assert.match(source, /startTerminal/);
});

test("registered terminal exposures match manifest declarations", () => {
  const viewSource = readFileSync(new URL("../ui/view.js", import.meta.url), "utf8");
  const terminalSource = readFileSync(new URL("../ui/terminal.js", import.meta.url), "utf8");
  assert.deepEqual(registrations(`${viewSource}\n${terminalSource}`), declarations(manifest.exposes));
});

// Every release holds the diagnostic declaration and its module, and only a diagnostic build reads them (core docs/spec/plugins.md).
test("diagnostics.json declares the entries its module registers and is published", () => {
  const source = readFileSync(new URL(`../${diagnostics.module}`, import.meta.url), "utf8");
  assert.deepEqual(registrations(source), declarations(diagnostics.exposes));
  for (const path of ["diagnostics.json", diagnostics.module]) {
    assert.equal(pkg.files.some((entry) => path === entry || path.startsWith(`${entry}/`)), true, `${path} is not published`);
  }
});

test("diagnostics.json declares the fixed source clock resolution with the supported enum keyword", { timeout: 5000 }, () => {
  const resolution = diagnostics.exposes.commands.find(({ name }) => name === "term.view.frames")
    .result.properties.sourceClock.properties.sourceResolutionMs;
  assert.deepEqual(resolution, { type: "number", enum: [1] });
});

test("the diagnostic entries inject preedit and record the IME trace", () => {
  const names = (kind) => diagnostics.exposes[kind].map((entry) => entry.name).sort();
  assert.deepEqual(names("status"), ["term.ime.trace", "term.pointer.trace", "term.view.frames"]);
  assert.deepEqual(names("commands"), ["term.compose.update", "term.ime.trace", "term.pointer.trace", "term.pty.pending", "term.screen.alter", "term.view.frames", "term.view.history"]);
});

test("the terminal exposes its session, input, preedit, paste, file drop, screen.read, close commands, and view", () => {
  const names = (kind) => manifest.exposes[kind].map((entry) => entry.name).sort();
  assert.deepEqual(names("status"), ["term.activity", "term.compose", "term.cursor", "term.messages", "term.screen", "term.session", "term.state"]);
  assert.deepEqual(names("commands"), ["term.close", "term.copy", "term.cursor.set", "term.drop", "term.focus", "term.image.inline.delete", "term.input", "term.link.open", "term.messages.read", "term.messages.wait", "term.paste", "term.screen.read", "term.screen.rows", "term.screen.scroll.read", "term.scrollback.set"]);
  assert.deepEqual(names("element"), ["term.scrollbar", "term.scrollbar.thumb", "term.view"]);
});

// A schema of an exposure entry is the JSON Schema subset of core docs/spec/exposure.md (entry fields): the keywords type,
// properties, items and enum; the reader of core refuses the manifest at install for any other keyword.
test("the schemas of the exposure entries use only the keywords that core reads (P51)", () => {
  const KEYWORDS = new Set(["type", "properties", "items", "enum"]);
  const found = [];
  const walk = (schema, where) => {
    if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return;
    for (const key of Object.keys(schema)) if (!KEYWORDS.has(key)) found.push(`${where}: ${key}`);
    for (const [name, member] of Object.entries(schema.properties ?? {})) walk(member, `${where}.${name}`);
    if (schema.items !== undefined) walk(schema.items, `${where}[]`);
  };
  for (const [file, declaration] of [["plugin.json", manifest], ["diagnostics.json", diagnostics]]) {
    for (const [kind, entries] of Object.entries(declaration.exposes ?? {})) {
      for (const entry of entries) {
        for (const field of ["params", "result", "schema"]) {
          if (entry[field] !== undefined) walk(entry[field], `${file} ${kind} ${entry.name} ${field}`);
        }
      }
    }
  }
  assert.deepEqual(found, []);
});

// The messages of core docs/spec/messaging.md#path-of-the-reads: the reads take the cursor {after, registration}, and the status
// names the registered folder. The schema form of a manifest has type, properties, items and enum only, so the descriptions state
// the bound of after and that no other member is accepted.
test("the messages commands declare the cursor parameters and term.messages the registered folder", () => {
  for (const name of ["term.messages.read", "term.messages.wait"]) {
    const command = manifest.exposes.commands.find((entry) => entry.name === name);
    assert.ok(command, `${name} is declared`);
    assert.deepEqual(command.params, { type: "object", properties: { after: { type: "integer" }, registration: { type: "string" } } });
    assert.match(command.description, /after is an integer of at least 0/, name);
    assert.match(command.description, /no other member/, name);
  }
  const status = manifest.exposes.status.find((entry) => entry.name === "term.messages");
  assert.ok(status, "term.messages is declared");
  assert.deepEqual(status.schema, { type: ["object", "null"], properties: { folder: { type: "string" }, registration: { type: "string" } } });
});

test("the context menu of the surface copies and pastes", () => {
  assert.deepEqual(manifest.surface.menu, [
    { command: "term.copy", title: "복사" },
    { command: "term.paste", title: "붙여넣기" },
  ]);
  for (const { command } of manifest.surface.menu) {
    assert.ok(manifest.exposes.commands.some((entry) => entry.name === command), `${command} is not declared`);
  }
});

test("the image region declares the lease presentation mode", { timeout: 1000 }, () => {
  const [region] = manifest.surface.composition.regions;
  assert.equal(region.kind, "image");
  assert.equal(region.present, "lease");
});
