# Window check

[English](window-checks.md)

term view의 window check는 이 repository에서, 한 core release의 published application에 대해 `@soksak/window-check`로 실행한다([plugin의 window check](https://github.com/soksak-app/core/blob/main/docs/spec/plugins.md#window-checks-of-a-plugin)). core의 source를 읽지 않고 그 repository의 경로를 이름으로 쓰지 않는다.

## 실행

```sh
make install     # 한 번: locked dependency와 그 안의 @soksak/window-check를 설치
make test-app    # pnpm exec sok-test-app
```

`make test-app`은 display가 있는 computer에서 local로만 실행한다. 이 repository의 workflow는 실행하지 않는다. check는 frame을 보이는 실행 중인 application이 필요하기 때문이며, CI의 check는 `make test`와 `make check`다.

`package.json`은 package의 release file `https://github.com/soksak-app/core/releases/download/v<version>/soksak-window-check-<version>.tgz`를 development dependency로 이름 짓고, 그 version은 `engines.soksak` 안의 core release다. 설치한 package의 version이 run의 application을 정한다. `sok-test-app`은 그 core release의 application zip을 `build/app-cache/<version>/`에 내려받고, 이 repository를 `make pack OUT={out}`으로 pack하고, plugin과 sidecar를 `build/test-app/` 아래 새 configuration folder에 설치하고, 그 folder로 application을 시작하고, `e2e/`의 파일에 `node --test`를 실행한 뒤 application을 종료한다. 통과한 run은 그 folder를 지우고, 실패한 run은 남긴다. package는 `@soksak/client`, `@soksak/log-contract`, `@soksak/plugin-api`를 release file 안에 담으므로 pnpm이 기본 설정으로 설치한다. `pnpm-workspace.yaml`은 package가 folder 감시에 쓰는 `@parcel/watcher`의 build script를 허용한다.

`test/window-checks.test.mjs`는 선언을 검사한다: development dependency가 `engines.soksak` 범위 안의 package의 core release file을 이름 짓고, `e2e/`에 check가 있고, `make test-app`이 `pnpm exec sok-test-app`을 실행한다.

## Check

`e2e/term-view.test.mjs`는 run의 각 application마다 test 둘을 실행한다. 각 test는 180초의 자기 time limit을 갖고, status와 record를 기다리며(timer 없음), host가 application 안에서 흉내 내는 입력만 쓰고, disposable configuration folder에서 `@soksak/window-check/start.mjs`의 `fresh`가 준비한 상태와 shell `e2e/check-shell`(prompt는 `sh-3.2$`)로 시작한다.

- Process 계약: `runViewMeasurements`가 `collectViewStartAndMemory`와 `collectViewReclaimMeasurements`의 측정을 core `docs/spec/plugin-processes.md#pass-values`에 대해 판정한다: view 하나와 셋의 memory, process start 다섯 번, 첫 display와 warm reuse(plugin에 기록된 DOM mount baseline이 없으므로 첫 display는 margin만으로 판정한다), view를 닫을 때 process group의 reclaim. 보이는 document region에서 `term.screen.read`가 prompt를 보일 때 view가 표시된 것으로 센다.
- Frame 계약: card 폭을 바꾼 뒤 image region `view`가 새 frame 크기의 raster를 보이고(`host.window` regions `presented`), screen read가 그 크기에서 prompt를 보이고, observer(`term.view.frames`)가 도는 동안 view가 자기 document 크기를 가진 content frame을 하나 이상 보고한다.
