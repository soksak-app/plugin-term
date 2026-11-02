import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sok = process.env.SOK;
const registry = process.env.CANDIDATE_REGISTRY;
const expectedTermVersion = process.env.EXPECTED_TERM_VERSION;
const previousSidecarVersion = process.env.PREVIOUS_SIDECAR_VERSION;
const expectedSidecarVersion = process.env.EXPECTED_SIDECAR_VERSION;

for (const [name, value] of Object.entries({ SOK: sok, CANDIDATE_REGISTRY: registry,
  EXPECTED_TERM_VERSION: expectedTermVersion, PREVIOUS_SIDECAR_VERSION: previousSidecarVersion,
  EXPECTED_SIDECAR_VERSION: expectedSidecarVersion })) {
  if (!value) throw new Error(`${name} is required`);
}

const index = JSON.parse(readFileSync(path.join(registry, "index.json"), "utf8"));
const term = index.plugins.find(({ id }) => id === "term");
const sidecar = index.sidecars.find(({ name }) => name === "@soksak/sidecar-alacritty");
assert.ok(term?.versions.some(({ version }) => version === expectedTermVersion),
  `registry does not list term ${expectedTermVersion}`);
assert.ok(sidecar?.versions.some(({ version }) => version === previousSidecarVersion),
  `registry must include prior sidecar ${previousSidecarVersion} for the controlled selection check`);
assert.ok(sidecar?.versions.some(({ version }) => version === expectedSidecarVersion),
  `registry must include sidecar ${expectedSidecarVersion} for the controlled selection check`);

const config = mkdtempSync(path.join(os.tmpdir(), "soksak-term-candidate-install-"));

const run = (name, args) => {
  const started = performance.now();
  process.stdout.write(`running ${name}\n`);
  const result = spawnSync(sok, args, { encoding: "utf8", timeout: 120000 });
  const elapsed = (performance.now() - started).toFixed(3);
  if (result.error) {
    process.stdout.write(`failed ${name} ${elapsed} ms: ${result.error.message}\n`);
    throw new Error(`sok ${args.join(" ")} could not start\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`, { cause: result.error });
  }
  if (result.status !== 0) {
    process.stdout.write(`failed ${name} ${elapsed} ms: exit ${result.status}\n`);
    throw new Error(`sok ${args.join(" ")} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  process.stdout.write(`finished ${name} ${elapsed} ms\n`);
  return result.stdout;
};

try {
  run("registry use", ["registry", "use", path.join(registry, "index.json"), "--config-dir", config]);
  run("plugin install", ["plugin", "install", "term", "--config-dir", config]);

  const installed = JSON.parse(readFileSync(path.join(config, "plugins", "installed.json"), "utf8"));
  process.stdout.write(`observed term ${installed.plugins.term.version}; sidecar ${installed.sidecars["@soksak/sidecar-alacritty"].version}\n`);
  assert.equal(installed.format, 3, "installer writes the current installed manifest format");
  assert.equal(installed.plugins.term.version, expectedTermVersion,
    "installer selected the expected term package version");
  assert.equal(installed.sidecars["@soksak/sidecar-alacritty"].version, expectedSidecarVersion,
    `candidate installation selects sidecar ${expectedSidecarVersion} for diagnostic input transactions`);
  const pluginDirectory = path.join(config, installed.plugins.term.path);
  const diagnosticsPath = path.join(pluginDirectory, "diagnostics.json");
  assert.ok(existsSync(diagnosticsPath), "installed diagnostic candidate includes diagnostics.json");
  const diagnostics = JSON.parse(readFileSync(diagnosticsPath, "utf8"));
  assert.equal(diagnostics.module, "ui/terminal-diagnostics.js",
    "diagnostics.json names the module loaded by the term view");
  const diagnosticsModule = path.join(pluginDirectory, diagnostics.module);
  assert.ok(existsSync(diagnosticsModule) && statSync(diagnosticsModule).isFile(),
    "installed diagnostic candidate includes the declared diagnostics module file");
  process.stdout.write(`observed diagnostic module ${diagnostics.module}\n`);
  process.stdout.write("candidate installation check passed\n");
} finally {
  rmSync(config, { recursive: true, force: true });
}
