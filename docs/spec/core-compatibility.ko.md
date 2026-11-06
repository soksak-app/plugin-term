# Core 호환성

[English](core-compatibility.md)

Plugin은 `engines.soksak: "^0.0.40"`을 선언하고, 이 범위는 core 0.0.40부터 그 뒤의 모든 0.0 release를 허용한다([version과 범위](https://github.com/soksak-app/core/blob/main/docs/spec/installation.ko.md#version과-범위)). 0.0.40은 `plugin.json`이 선언하는 `exposes.element`를 받는 첫 core release인 F502-13의 core release(F502-13-1)의 version이고, core 0.0.39와 그 이전은 exposes 종류 `status`, `commands`, `dom`만 받으므로 그것을 거부한다. 같은 release는 view clipboard call의 PNG를 binary path로 나르는 core F518과, sidecar의 답에 그 요청의 cids를 주는 core F617을 담는 첫 core release이고, view clipboard와 view가 붙잡은 input이 둘 다 읽는다. Core 0.0.32는 image region이 `present: "lease"`를 받는 첫 core release이고, `plugin.json`은 region `view`에 이 값을 선언하므로 그보다 앞선 core release는 plugin을 거부한다.

`make check`는 `package.json`이 pin한 kit의 event source 검사와 document 검사를 실행한다. application은 release를 설치할 때 `plugin.json`을 검증하고, registry 검사는 release의 exposed 이름을 각 listed core의 선언과 비교한다.
