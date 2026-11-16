# Window checks

[한국어](window-checks.ko.md)

The window checks of the term view run in this repository, against the published core application of one core release, through `@soksak/window-check` ([window checks of a plugin](https://github.com/soksak-app/core/blob/main/docs/spec/plugins.md#window-checks-of-a-plugin)). They read no source of core and name no path of its repository.

## Run

```sh
make install     # once: installs the locked dependencies, among them @soksak/window-check
make test-app    # pnpm exec sok-test-app
```

`make test-app` runs on a computer with a display, only locally. No workflow of this repository runs it, because the checks need a running application that presents frames; `make test` and `make check` are the checks of CI.

`package.json` names the release file of the package as a development dependency, `https://github.com/soksak-app/core/releases/download/v<version>/soksak-window-check-<version>.tgz`, and the version is a core release inside `engines.soksak`. The version of the installed package selects the application of the run: `sok-test-app` downloads the application zip of that core release into `build/app-cache/<version>/`, packs this repository with `make pack OUT={out}`, installs the plugin and its sidecar into a new configuration folder under `build/test-app/`, starts the application with that folder, runs `node --test` on the files under `e2e/`, and quits the application. A passed run removes its folder; a failed run keeps it. The package holds `@soksak/client`, `@soksak/log-contract` and `@soksak/plugin-api` inside its release file, so pnpm installs it with its default settings; `pnpm-workspace.yaml` allows the build script of `@parcel/watcher`, which the package uses to watch folders.

`test/window-checks.test.mjs` checks the declaration: the development dependency names a core release file of the package inside the `engines.soksak` range, `e2e/` holds the check, and `make test-app` runs `pnpm exec sok-test-app`.

## Checks

`e2e/term-view.test.mjs` runs two tests for each application of the run. Each test has its own time limit of 180 seconds, waits on statuses and records (no timer), uses only the input that the host emulates inside the application, and starts from the state that `fresh` of `@soksak/window-check/start.mjs` prepares in a disposable configuration folder, with the shell `e2e/check-shell` (its prompt is `sh-3.2$`).

- The process contract: `runViewMeasurements` judges the measurements of `collectViewStartAndMemory` and `collectViewReclaimMeasurements` against core `docs/spec/plugin-processes.md#pass-values`: the memory of one view and of three views, the five process starts, the first display and the warm reuse (the plugin has no recorded DOM mount baseline, so the first display is judged against the margin alone), and the reclaim of the process group when the views close. A view counts as displayed when `term.screen.read` shows the prompt in the visible document region.
- The frame contract: after a card width change the image region `view` presents a raster of its new frame size (`host.window` regions `presented`), the screen read shows the prompt at that size, and the view reports at least one content frame with the dimensions of its document while its observer (`term.view.frames`) runs.
