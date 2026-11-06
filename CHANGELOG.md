# Changelog

[한국어](CHANGELOG.ko.md)

## Unreleased

- P27: The core compatibility documents state that `^0.0.40` admits core 0.0.40 and every later 0.0 release, and a test requires it. Red: the test failed on the earlier statement. Green: it passes.
- P11: `engines.soksak` is `^0.0.40`, the core release of F502-13, because core 0.0.35 to 0.0.39 were released without it and refuse `exposes.element`; it is also the first core release that carries F518 and F617, which P15 and P24 read. Red: the version test failed on `^0.0.39`. Green: it passes.
- P18: The push check and CI run the checklist history check of the kit: `package.json` pins kit 0.0.14, which holds KR14 and KR15, `make check-push` runs `sok-check docs --range` on the pushed range, and CI runs `make check-push` on the range of its event. Red: the tests of the push check failed on the Makefile and `ci.yml` before the change. Green: they pass.
- P26: The core compatibility documents state `^0.0.39`, the range that `package.json` declares.
- P25: The core compatibility documents state `^0.0.37`, the range that `package.json` declares.
- P24: Input without an answer of a service that ended reaches the new session, instead of disappearing after a successful answer.
- P23: Input that reaches a respawned service before the view hears of it flows into the session that reopens, instead of being lost with an error on the session.
- P22: A session that opens resolves the answer `Session not open`, so `term.session` holds no such error after the service respawned.
- P21: `term.input` and `term.paste` end with the reason when the open of the session failed or its connection failed, instead of waiting until the host ends the command after 10 s.
- P20: A session that opens reads the focus of the region whichever value it has, so a view that reloads does not leave a filled cursor on the preserved session it attaches to.
- P19: A session that opens reads the current focus of the region, so the cursor of a terminal that holds the keyboard stays focused after its service respawns.
- P11: The plugin declares its exposed elements as element entries: `plugin.json` declares `exposes.element`, and the view calls `expose.element`. `engines.soksak` is `^0.0.35`, the version of the core release of F502-13, and the pin of the records kit release of KR19 waits for that release. Red: the tests failed 191 of 215, most with `expose.dom is not a function`. Green: they pass.
- P17: The contract cases of the test fakes are byte copies of the published `clipboard.json` and `screen-hash.json` in `test/fixtures/contract`, and `contract-copies.json`, which the release carries, names each copy with its SHA-256. Each module of `scripts/test-sdk-cases.json` lists its copies, and a case that the fake does not replay is in a skip list with its reason; the build fails on a case that is neither. Red: the tests failed on the inline copies, and without the skip list the build named the five cases that the inline copies did not hold. Green: they pass.
- P16: The core compatibility document states `^0.0.34`, the range that the package declares, and a test compares both documents with `engines.soksak`. Red: the test failed with `^0.0.33` against `^0.0.34`. Green: it passes.
- P15: The view clipboard carries a PNG through the binary path of the view document: `persistPNG` uploads the bytes and sends their id as `{binary}`, and a `png` read downloads the bytes of its id. `engines.soksak` stays `^0.0.34` until a core release carries F518. Red: 8 of the 13 tests of `test/view-clipboard.test.mjs` failed, among them `the view clipboard downloads the bytes of the binary id of a PNG read` with `clipboard png response is invalid`. Green: the 13 tests pass.
- P14: The manifest test of the sidecar range and the package version, named `the local transaction candidate requires the sidecar input transaction contract`, is split into `the plugin depends on the sidecar release that bounds the output and the input of a session` and `the package declares the version of its next release`, with its assertions unchanged.
- P13: Version 0.0.8, which carries the name and the package description of P10, because the released 0.0.7 holds neither. Red: `test/manifest.test.mjs` failed with `'0.0.7' !== '0.0.8'`. Green: it passes.
- P10: The plugin is named `네이티브 터미널`, and the package description and the README state that the sidecar draws each frame on the CPU into the strips of the rows that changed and that the host presents the frame in the lease mode of its image region. Red: the tests of `test/frame-description.test.mjs` failed with `The input was expected to not match the regular expression /gpu/i. Input: 'GPU 터미널'`, `these descriptions name the GPU`, `these descriptions do not state that the sidecar draws each frame on the CPU into the strips of the rows that changed` and `these descriptions do not state that the host presents the frame in the lease mode of its image region`. Green: the 4 tests pass.
- F497-term: `engines.soksak` is `^0.0.39`, and the version is 0.0.12.
- F494-term: `engines.soksak` is `^0.0.38`, and the version is 0.0.11.
- F479-term: The release run published v0.0.10, and the registry lists it.
- F479-term: `engines.soksak` is `^0.0.37`, and the version is 0.0.10.
- F476-term: The tests repeat no declared version.
- F474-term: The release run published v0.0.9, and the registry lists it.
- F474-term: `engines.soksak` is `^0.0.36`, and the version is 0.0.9. It requires `@soksak/sidecar-alacritty` `^0.0.7`, whose executables have the current names. Red: the core version test failed on `^0.0.35`. Green: it passes.
- F460-term: `.gitignore` names the local output folder `/build/`.
- F472-term: The names of the commands state what they do, and `sok-check commands` holds them.
- F468-term: The repository runs `soksak-check docs` and `soksak-check events` of the kit with `event-sources.json`.
- F466-term: The repository pins the kit release that reports a citation of a local build log or a temporary log.
- F467-term: The repository pins `@soksak/kit`.
- F463-term: The repository uses the checks kit and its one executable `soksak-check`.
- F462-term: `engines.soksak` is `^0.0.35`, and the version is 0.0.8. Red: the core version test failed on `^0.0.34`. Green: it passes.
- F432-term: `engines.soksak` is `^0.0.34`, and it requires `^0.0.6` of its sidecar, and the version is 0.0.7. Red: the core version test failed on `^0.0.33`. Green: it passes.
- P9: A pointer before the first state of a session sends no input, so it shows no terminal error.
- P8: The page judges the caret of a `view` event against the grid of that event.
- P7: The `term.screen` status notifies a watcher of each drawn frame through a screen read that follows its view event, and a read of the status returns the current screen.
- F402-term: `engines.soksak` is `^0.0.33`, and the version is 0.0.6. Red: the core version test failed on `^0.0.32`. Green: it passes.
- P6: The tests of a slow selection reply wait for the message that ends the gesture instead of a fixed time.
- P5: Version 0.0.5, which requires the sidecar `^0.0.5`.
- P4: The session status records that the child of the session ended, from the `exit` event, which clears the held input and records no warning. A `state` or `session` event opens a running session (`session` keeps the held input), and a connection that ends clears it. Red: the test `an exit event marks the session as ended and clears the held input without a warning` failed with `a session has not ended before its exit event`, and `a connection that ends while input is held clears the held input` failed with `the sidecar sends no held:false after a connection ends, so the page clears it`. Green: both pass, and the test file passes 183 of 183.
- P3: The session status exposes the input that the sidecar holds as `inputHeld`, which is `{queued, held}` while held and `null` otherwise. An invalid `input_held` event is refused as an input error. Red: the test `an input_held event publishes the held input and clears it when reads resume` failed with `no input is held before the first input_held event`; Green: it passes, and the test file passes 181 of 181.
- P2: The plugin requires the sidecar 0.0.4, and the version is 0.0.4.
- P1-4: The comparison with the plugin `terminal` is measured: a frame of a status line takes 1.5 ms of application CPU against 12.4 ms, and a frame of 20 rewritten rows takes 4.1 ms against 14.6 ms.
- P1-6: The plugin is released as 0.0.3 with the sidecar 0.0.3.
- P1-5: The plugin is released as 0.0.2 with the sidecar 0.0.2 and listed in the registry.
- P1-3: The plugin is public as `soksak-app/plugin-term`, released as 0.0.1 and listed in the registry.
- P1-3-1: The pre-push hook checks every pushed commit on the first push of a repository.
- P1-2: The view takes the cursor, caret and scrollback of a frame from the `view` event of the sidecar.
- P1-1: The plugin `term` starts from the terminal plugin with its own names, the sidecar `@soksak/sidecar-alacritty` and the lease presentation mode.
