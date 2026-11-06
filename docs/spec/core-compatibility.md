# Core compatibility

[한국어](core-compatibility.ko.md)

The plugin declares `engines.soksak: "^0.0.40"`, which admits core 0.0.40 and every later 0.0 release ([versions and ranges](https://github.com/soksak-app/core/blob/main/docs/spec/installation.md#versions-and-ranges)). 0.0.40 is the version of the core release of F502-13 (F502-13-1), the first core release that accepts `exposes.element`, which `plugin.json` declares; core 0.0.39 and earlier accept only the exposes kinds `status`, `commands` and `dom`, so they refuse it. The same release is the first core release that carries core F518, which takes the PNG of a view clipboard call through the binary path, and core F617, which gives the answer of a sidecar the cids of its request; the view clipboard and the held input of the view read both. Core 0.0.32 is the first core release whose image region accepts `present: "lease"`, which `plugin.json` declares for the region `view`, so earlier core releases refuse the plugin.

`make check` runs the event source check and the document check of the kit that `package.json` pins. The application validates `plugin.json` when it installs the release, and the registry check compares the exposed names of the release with the declarations of each listed core.
