# Term plugin

[한국어](README.ko.md)

Term plugin: a full-screen terminal surface. Its sidecar `@soksak/sidecar-alacritty` draws each frame on the CPU into the strips of the rows that changed, and the host presents the frame in the lease mode of its image region. The plugin format is defined in the soksak core specification (`docs/spec/plugins.md`).

```sh
make test                                   # tests
make check                                  # census and record checks
make pack OUT=<folder> # the plugin release
make hooks                                  # once after cloning: check commit messages and records at commit time
```

`make check` runs the census check and the record check of the kit that `package.json` pins. The application validates `plugin.json` when it installs the release, and the registry check compares the exposed names of the release with the declarations of each listed core.

The checklist is [docs/features.md](docs/features.md).
