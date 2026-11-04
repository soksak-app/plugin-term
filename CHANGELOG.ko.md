# 변경 기록

[English](CHANGELOG.md)

## Unreleased

- F432-term: `engines.soksak`은 `^0.0.34`이고, sidecar `^0.0.6`을 요구하며 version은 0.0.7이다. Red: core version test가 `^0.0.33`에서 실패했다. Green: 통과한다.
- P9: 세션의 첫 state 전의 포인터가 입력을 보내지 않아 터미널 오류가 나타나지 않는다.
- P8: page가 `view` 이벤트의 caret을 그 이벤트의 격자로 판정한다.
- P7: `term.screen` status는 view event 뒤의 screen read로 그린 frame마다 watcher에게 알리고, status의 read는 현재 화면을 돌려준다.
- F402-term: `engines.soksak`은 `^0.0.33`이고 version은 0.0.6이다. Red: core version test가 `^0.0.32`에서 실패했다. Green: 통과한다.
- P6: 느린 selection 응답의 test는 고정 시간 대신 gesture를 끝내는 message를 기다린다.
- P5: sidecar `^0.0.5`을 요구하는 version 0.0.5.
- P4: session status는 `exit` event로 session의 child가 끝났음을 기록하며, 이 event는 붙잡힌 입력을 지우고 warning을 남기지 않는다. `state` event와 `session` event는 실행 중인 session을 연다(`session`은 붙잡힌 입력을 유지한다). 끝난 연결은 붙잡힌 입력을 지운다. Red: test `an exit event marks the session as ended and clears the held input without a warning`가 `a session has not ended before its exit event`로, `a connection that ends while input is held clears the held input`가 `the sidecar sends no held:false after a connection ends, so the page clears it`로 실패했다. Green: 두 test가 통과하며, test 파일은 183개 중 183개 통과한다.
- P3: session status는 sidecar가 붙잡고 있는 입력을 `inputHeld`로 드러낸다. 붙잡혀 있는 동안은 `{queued, held}`이고, 그 밖에는 `null`이다. 잘못된 `input_held` event는 입력 오류로 거부한다.
- P2: plugin은 sidecar 0.0.4를 요구하고 version은 0.0.4다.
- P1-4: plugin `terminal`과의 비교를 쟀다. 상태 줄 frame은 앱 CPU 1.5 ms 대 12.4 ms, 20행을 다시 쓰는 frame은 4.1 ms 대 14.6 ms다.
- P1-6: plugin을 sidecar 0.0.3과 함께 0.0.3으로 release했다.
- P1-5: plugin을 sidecar 0.0.2와 함께 0.0.2로 release하고 registry에 등록했다.
- P1-3: plugin은 `soksak-app/plugin-term`으로 공개되고, 0.0.1로 release되고, registry에 등록됐다.
- P1-3-1: pre-push hook은 저장소의 첫 push에서 push하는 commit을 모두 검사한다.
- P1-2: view는 frame의 커서, caret, scrollback을 sidecar의 `view` 이벤트에서 받는다.
- P1-1: plugin `term`은 terminal plugin에서 시작해서 자기 이름, sidecar `@soksak/sidecar-alacritty`, lease 표시 방식을 가진다.
