# 변경 기록

[English](CHANGELOG.md)

## Unreleased

- P2: plugin은 sidecar 0.0.4를 요구하고 version은 0.0.4다.
- P1-4: plugin `terminal`과의 비교를 쟀다. 상태 줄 frame은 앱 CPU 1.5 ms 대 12.4 ms, 20행을 다시 쓰는 frame은 4.1 ms 대 14.6 ms다.
- P1-6: plugin을 sidecar 0.0.3과 함께 0.0.3으로 release했다.
- P1-5: plugin을 sidecar 0.0.2와 함께 0.0.2로 release하고 registry에 등록했다.
- P1-3: plugin은 `soksak-app/plugin-term`으로 공개되고, 0.0.1로 release되고, registry에 등록됐다.
- P1-3-1: pre-push hook은 저장소의 첫 push에서 push하는 commit을 모두 검사한다.
- P1-2: view는 frame의 커서, caret, scrollback을 sidecar의 `view` 이벤트에서 받는다.
- P1-1: plugin `term`은 terminal plugin에서 시작해서 자기 이름, sidecar `@soksak/sidecar-alacritty`, lease 표시 방식을 가진다.
