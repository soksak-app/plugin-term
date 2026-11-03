# Changelog

[한국어](CHANGELOG.ko.md)

## Unreleased

- P1-4: The comparison with the plugin `terminal` is measured: a frame of a status line takes 1.5 ms of application CPU against 12.4 ms, and a frame of 20 rewritten rows takes 4.1 ms against 14.6 ms.
- P1-6: The plugin is released as 0.0.3 with the sidecar 0.0.3.
- P1-5: The plugin is released as 0.0.2 with the sidecar 0.0.2 and listed in the registry.
- P1-3: The plugin is public as `soksak-app/plugin-term`, released as 0.0.1 and listed in the registry.
- P1-3-1: The pre-push hook checks every pushed commit on the first push of a repository.
- P1-2: The view takes the cursor, caret and scrollback of a frame from the `view` event of the sidecar.
- P1-1: The plugin `term` starts from the terminal plugin with its own names, the sidecar `@soksak/sidecar-alacritty` and the lease presentation mode.
