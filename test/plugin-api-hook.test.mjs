// The resolve hook of the plugin API fixtures (test/fixtures/plugin-api/register.mjs). The page imports `@soksak/plugin-api` and its subpaths
// through the import map of the application; the tests resolve the same specifiers to fixture modules of this repository.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const UI = new URL("../ui/", import.meta.url);
const FIXTURES = new URL("./fixtures/plugin-api/", import.meta.url);

/** The names that each page module imports from the plugin API, read from the sources of ui/ (each import of a plugin API specifier). */
function importedNames() {
  const names = new Map();
  for (const file of readdirSync(UI)) {
    if (!file.endsWith(".js")) continue;
    const text = readFileSync(new URL(file, UI), "utf8");
    for (const match of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(@soksak\/plugin-api(?:\/[a-z-]+)?)"/g)) {
      const specifier = match[2];
      const set = names.get(specifier) ?? new Set();
      for (const name of match[1].split(",").map((part) => part.trim()).filter(Boolean)) set.add(name);
      names.set(specifier, set);
    }
  }
  return names;
}

test("each plugin API specifier that the page imports resolves to a fixture module of this repository", async () => {
  const specifiers = [...importedNames().keys()].sort();
  assert.deepEqual(specifiers, ["@soksak/plugin-api", "@soksak/plugin-api/screen-hash", "@soksak/plugin-api/view"]);
  for (const specifier of specifiers) {
    const module = await import(specifier);
    const url = new URL(import.meta.resolve(specifier));
    assert.ok(url.href.startsWith(FIXTURES.href), `${specifier} resolved outside the fixtures: ${url.href}`);
    for (const name of importedNames().get(specifier)) {
      assert.equal(typeof module[name], "function", `${specifier} does not export ${name}`);
    }
  }
});

test("the diagnostic module of the page resolves to a fixture that exports observeViewDocumentFrames", async () => {
  const module = await import("@soksak/plugin-api/diagnostic-view-frames");
  assert.equal(typeof module.observeViewDocumentFrames, "function");
});

test("a plugin API subpath that the import map does not list is refused with its name", async () => {
  await assert.rejects(import("@soksak/plugin-api/testing"), (error) => {
    assert.match(error.message, /@soksak\/plugin-api\/testing is not a plugin API module of the fixtures/);
    return true;
  });
});

test("a specifier outside the plugin API is left to the default resolution", async () => {
  await assert.rejects(import("@soksak/not-a-module-of-this-plugin"), (error) => {
    assert.equal(error.code, "ERR_MODULE_NOT_FOUND");
    return true;
  });
});
