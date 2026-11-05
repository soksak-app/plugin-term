# 변경 기록

[English](CHANGELOG.md)

## Unreleased

- P20: 열리는 session이 값과 무관하게 region의 focus를 읽으므로, reload된 view가 다시 붙는 preserved session에 filled cursor가 남지 않는다.
- P19: 열리는 session이 region의 현재 focus를 읽으므로, 키보드를 가진 terminal의 cursor는 service가 다시 떠도 focus 상태를 유지한다.
- P11: plugin은 노출하는 element를 element entry로 선언한다. `plugin.json`은 `exposes.element`를 선언하고, view는 `expose.element`를 호출한다. `engines.soksak`은 F502-13의 core release version인 `^0.0.35`를 요구하고, KR9의 records kit release pin은 그 release를 기다린다. Red: test가 215개 중 191개 실패했고, 대부분 `expose.dom is not a function`이었다. Green: 통과한다.
- P17: test fake의 contract case는 `test/fixtures/contract`에 있는 publish된 `clipboard.json`과 `screen-hash.json`의 byte 사본이고, release가 싣는 `contract-copies.json`이 각 사본을 SHA-256과 함께 적는다. `scripts/test-sdk-cases.json`의 각 module은 그 사본을 나열하고, fake가 재생하지 않는 case는 이유와 함께 skip 목록에 있으며, 둘 다 아닌 case에서 build가 실패한다. Red: inline 사본에서 test가 실패했고, skip 목록이 없으면 build가 inline 사본에 없던 다섯 case를 적었다. Green: 통과한다.
- P16: core 호환성 문서는 package가 선언한 범위 `^0.0.34`를 적고, test가 두 문서를 `engines.soksak`과 비교한다. Red: test가 `^0.0.34`에 대한 `^0.0.33`로 실패했다. Green: 통과한다.
- P15: view clipboard는 PNG를 view document의 binary path로 나른다. `persistPNG`는 bytes를 upload하고 그 id를 `{binary}`로 보내며, `png` read는 그 id의 bytes를 download한다. F518을 담은 core release가 나올 때까지 `engines.soksak`은 `^0.0.34`로 남는다. Red: `test/view-clipboard.test.mjs`의 13 test 중 8개가 실패했고, 그중 `the view clipboard downloads the bytes of the binary id of a PNG read`는 `clipboard png response is invalid`로 실패했다. Green: 13 test가 통과한다.
- P14: sidecar 범위와 package version을 검사하던 manifest test `the local transaction candidate requires the sidecar input transaction contract`를 `the plugin depends on the sidecar release that bounds the output and the input of a session`과 `the package declares the version of its next release`로 나눴고, assertion은 바꾸지 않았다.
- P13: P10의 이름과 package 설명을 담는 version 0.0.8. release된 0.0.7에는 둘 다 없다. Red: `test/manifest.test.mjs`가 `'0.0.7' !== '0.0.8'`로 실패했다. Green: 통과한다.
- P10: plugin 이름은 `네이티브 터미널`이고, package 설명과 README는 sidecar가 각 frame을 CPU로 바뀐 행의 strip에 그리고 host가 그 frame을 image region의 lease 방식으로 보인다고 적는다. Red: `test/frame-description.test.mjs`의 test가 `The input was expected to not match the regular expression /gpu/i. Input: 'GPU 터미널'`, `these descriptions name the GPU`, `these descriptions do not state that the sidecar draws each frame on the CPU into the strips of the rows that changed`, `these descriptions do not state that the host presents the frame in the lease mode of its image region`으로 실패했다. Green: 4 test가 통과한다.
- F466-term: 저장소가 local build log와 임시 log의 인용을 보고하는 kit release를 pin한다.
- F467-term: 저장소가 `@soksak/kit`을 pin한다.
- F463-term: 저장소가 checks kit과 실행 파일 하나 `soksak-check`를 쓴다.
- F462-term: `engines.soksak`은 `^0.0.35`이고, version은 0.0.8이다. Red: core version test가 `^0.0.34`에서 실패했다. Green: 통과한다.
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
