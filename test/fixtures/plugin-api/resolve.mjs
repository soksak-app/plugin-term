// The resolve hook of the plugin API fixtures. The page of a plugin resolves `@soksak/plugin-api` and its subpaths through the import
// map of the application (docs/spec/plugins.md, page), and this hook gives the same specifiers the modules of this repository. It maps
// no other specifier; a subpath that the import map does not list is refused with an error that names it.
const FIXTURES = new URL("./", import.meta.url);

/** The specifiers of the plugin API that the page imports, with the fixture module of each. */
const MODULES = new Map([
  ["@soksak/plugin-api", "index.mjs"],
  ["@soksak/plugin-api/view", "view.mjs"],
  ["@soksak/plugin-api/screen-hash", "screen-hash.mjs"],
  ["@soksak/plugin-api/diagnostic-view-frames", "diagnostic-view-frames.mjs"],
]);

export async function resolve(specifier, context, nextResolve) {
  if (specifier !== "@soksak/plugin-api" && !specifier.startsWith("@soksak/plugin-api/")) return nextResolve(specifier, context);
  const file = MODULES.get(specifier);
  if (file === undefined) {
    throw new Error(`${specifier} is not a plugin API module of the fixtures; the page imports ${[...MODULES.keys()].join(", ")}`);
  }
  return { url: new URL(file, FIXTURES).href, format: "module", shortCircuit: true };
}
