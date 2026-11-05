# Core compatibility

[한국어](core-compatibility.ko.md)

The plugin declares `engines.soksak: "^0.0.33"`. Core 0.0.32 is the first core release whose image region accepts `present: "lease"`, which `plugin.json` declares for the region `view`, so earlier core releases refuse the plugin.

`make check` runs the census check and the record check of the kit that `package.json` pins. The application validates `plugin.json` when it installs the release, and the registry check compares the exposed names of the release with the declarations of each listed core.
