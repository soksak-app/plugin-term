# Changelog

[한국어](CHANGELOG.ko.md)

## Unreleased

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
