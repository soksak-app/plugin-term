// Registers the resolve hook of the plugin API fixtures. The test command loads this module with `node --import`, so each test process
// resolves the specifiers of `@soksak/plugin-api` to the fixture modules of this repository.
import { register } from "node:module";

register(new URL("./resolve.mjs", import.meta.url).href);
