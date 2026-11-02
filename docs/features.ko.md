# 기능

[English](features.md)

- [!] P1 — P1: image region이 `@soksak/sidecar-alacritty`의 frame을 core lease 방식(F386)으로 보이고 screen을 요청할 때 읽는 terminal plugin. copy 방식 기준인 terminal plugin 옆에 둔다. Held: P1-1부터 P1-3까지 완료했고 P1-4는 측정을 기다린다. Cause: 측정은 개발 뒤에 한다. Retry when: P1-4의 측정이 시작된다.
  - [o] P1-1 — P1: 저장소는 terminal plugin의 tree에서 시작한다. id는 `term`, package는 `@soksak/plugin-term` 0.0.1, command·status·event 이름은 `term`, sidecar는 `@soksak/sidecar-alacritty` `^0.0.1`, region `view`는 `present: "lease"`다. Red: `test/manifest.test.mjs`가 이름 `terminal`, sidecar `@soksak/sidecar-vt-alacritty`, `present` `copy`를 가진 terminal plugin의 manifest에서 실패했다. Green: 이 저장소의 manifest에서 통과하고, `make test`와 `make check`가 통과한다.
  - [o] P1-2 — P1: sidecar는 요청할 때만 screen을 보내므로, view는 frame의 커서, caret, scrollback을 sidecar의 `view` 이벤트(S1-7)에서 받고 `term.screen`은 각 read를 따른다([인수 기준](spec/acceptance.ko.md)). Red: `test/terminal.test.mjs`의 `a view event publishes the cursor of its frame, moves the input-method caret and reports the scrollback`이 `term.cursor`의 null caret과 frame으로 실패했다. Green: 통과하고, grid 밖 caret은 오류로 거부된다. `make test`와 `make check`가 통과한다.
  - [o] P1-3 — P1: 저장소를 `soksak-app/plugin-term`으로 공개하고, sidecar release 0.0.1 뒤에 0.0.1을 release해서 registry에 넣는다. 결과: 저장소는 공개됐고, core F393이 workspace registry에 선언했으며, P1-3-1의 CI run의 release job이 sidecar `v0.0.1` 뒤에 `soksak-plugin-term-0.0.1.tgz`를 담은 `v0.0.1`을 게시했고, registry가 그것을 등록했다(registry G74). registry의 `make build`는 그 release를 받아 `sha256`을 확인한다.
    - [o] P1-3-1 — P1: pre-push hook은 origin/main이 없는 저장소의 첫 push에서 push하는 head의 commit을 모두 검사한다. Red: `test/pre-push.test.mjs`가 첫 push에서 `ambiguous argument 'origin/main..<sha>'`로 실패했다. Green: 첫 push와 이미 있는 remote ref의 push에서 통과한다.
  - [!] P1-4 — P2: 같은 창과 같은 출력에서 terminal plugin과 frame당 CPU 시간을 잰다. Held: 측정은 개발 뒤에 한다. Cause: 측정은 완성된 구현을 비교한다. Retry when: P1-1부터 P1-3까지 완료된다.
