# Core 호환성

[English](core-compatibility.md)

Plugin은 `engines.soksak: "^0.0.32"`를 선언한다. Core 0.0.32는 image region이 `present: "lease"`를 받는 첫 core release이고, `plugin.json`은 region `view`에 이 값을 선언하므로 그보다 앞선 core release는 plugin을 거부한다.

`make check`는 `package.json`이 pin한 events kit의 census 검사와 records kit의 record 검사를 실행한다. application은 release를 설치할 때 `plugin.json`을 검증하고, registry 검사는 release의 exposed 이름을 각 listed core의 선언과 비교한다.
