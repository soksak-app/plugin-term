// Checks that the name and the descriptions of the plugin state how its frames are drawn: the sidecar draws each frame on
// the CPU into the strips of the rows that changed, and its image region presents the frame in the lease mode.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");
const manifest = JSON.parse(read("plugin.json"));
const pkg = JSON.parse(read("package.json"));

const english = /draws each frame on the CPU into the strips of the rows that changed/;
const korean = /각 frame을 CPU로 바뀐 행의 strip에 그/;

/** The descriptions of the plugin, each with its source and the statement of the strip frame in its language. */
const descriptions = [
  { source: "package.json description", text: pkg.description, statement: english },
  { source: "README.md", text: read("README.md"), statement: english },
  { source: "README.ko.md", text: read("README.ko.md"), statement: korean },
];

test("the plugin name names no GPU", () => {
  assert.doesNotMatch(manifest.name, /gpu/i);
  assert.equal(manifest.name, "네이티브 터미널");
});

test("the descriptions of the plugin name no GPU", () => {
  const sources = [{ source: "plugin.json description", text: manifest.description }, ...descriptions];
  assert.deepEqual(sources.filter(({ text }) => /gpu/i.test(text)).map(({ source }) => source), [],
    "these descriptions name the GPU");
});

test("the package description and the READMEs state that the sidecar draws each frame on the CPU into strips", () => {
  assert.deepEqual(descriptions.filter(({ text, statement }) => !statement.test(text)).map(({ source }) => source), [],
    "these descriptions do not state that the sidecar draws each frame on the CPU into the strips of the rows that changed");
});
