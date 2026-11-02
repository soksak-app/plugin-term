# Features

[한국어](features.ko.md)

- [~] P1 — P1: A terminal plugin whose image region presents the frames of `@soksak/sidecar-alacritty` in the lease mode of core (F386) and reads the screen on request, beside the terminal plugin that stays the copy-mode baseline. Active: P1-2 is next; P1-1 is complete.
  - [o] P1-1 — P1: The repository starts from the tree of the terminal plugin with the id `term`, the package `@soksak/plugin-term` 0.0.1, the commands, statuses and events named `term`, the sidecar `@soksak/sidecar-alacritty` `^0.0.1` and the region `view` with `present: "lease"`. Red: `test/manifest.test.mjs` failed on the manifests of the terminal plugin with the names `terminal`, the sidecar `@soksak/sidecar-vt-alacritty` and `present` `copy`. Green: it passes on the manifests of this repository, and `make test` and `make check` pass.
  - [ ] P1-2 — P1: The view reads the screen with `screen.read` and holds no screen of a frame, because the sidecar sends a screen only on request; `term.screen` and the frame record follow each read.
  - [ ] P1-3 — P1: Publish the repository as `soksak-app/plugin-term`, release 0.0.1 after the sidecar release 0.0.1, and add it to the registry.
  - [!] P1-4 — P2: Measure the CPU time of a frame against the terminal plugin with the same window and output. Held: measurement follows development. Cause: the measurement compares finished implementations. Retry when: P1-1 to P1-3 are complete.
