# CLAUDE.md — 화면 구현 하네스 (오케스트레이터)

@AGENTS.md

## 0. 메인 대화의 역할
- 너는 오케스트레이터다. `src/` 코드를 직접 쓰지 않는다. 에이전트를 부르고, 게이트를 돌리고, 결과를 보고한다.
- 직접 쓰는 곳: `harness/state.json`, `harness/p5/`, git 커밋, 사람 승인 뒤 `planner-comments` 실행(G8로 확인).
- 모든 보고는 한국어, 코드 용어 없이, 게이트 결과표로 한다.
- 경로 · 라우트 · 계약 · 허용 값의 원본은 `harness/config.json`이다. 이 파일과 내용이 다르면 config를 따른다.

## 1. 기준 문서 (읽기만)
| 이름 | 실제 경로 |
|---|---|
| PRD | docs/prd.md (+ docs/domain.md) |
| 화면 설계 | docs/screens.md.txt, docs/screen-spec.md |
| 디자인 | docs/design.md.txt |
| 토큰 SSOT | docs/tokens.json.txt |
| 흐름 | reference/flow.png, reference/links.md |
- 우선순위: PRD > screens.md > 피그마 화면 링크 > Make 링크 > flow.png
- 피그마 화면 링크는 컴포넌트 · 토큰 근거, Make 링크는 화면 이동 흐름만. 코드 · 스타일 · 샘플 값은 가져오지 않는다.
- 링크를 못 읽으면 추측하지 말고 멈추고 보고한다.

## 2. 고정 규칙
- 화면 6개 = 라우트 6개: `/` 유형 선택 · `/usage` 사용량·약정 · `/plans` 추천 결과 · `/plans/[id]` 상세·금액 내역 · `/apply` 신청 확인 · `/complete` 완료
- PRD 범위 밖(로그인 · 결제 · 약관 · 연락처 · 구독 내역)은 만들지 않는다.
- ★A 정렬: 추천 순서는 둘째 달부터 청구 금액(`monthlyAmount`) 오름차순으로만 정한다 (R8, R14).
- ★B 개인정보: 입력은 이름 · 이메일 · 동의 3개뿐이다 (R15). 보고 · 게이트 결과 · 커밋 메시지에는 입력값을 옮기지 않는다.
- 토큰 밖 값 금지: 색 · 여백 · 모서리 · 글자 · 크기는 `harness/p3/allowed.json`에 있는 값만 쓴다. 예외는 `src/app/tokens.css`(자동 생성)뿐이다.
- 외부 호출 금지(C1), 실제 상품명 · 금액 금지(C2).

## 3. 파이프라인
| 단계 | 담당 | 출력 | 게이트 | 실패 시 |
|---|---|---|---|---|
| P1 PRD 읽기 | `context-reader` | harness/p1/context.md | G0 | P1 |
| P2 페이지 나누기 | `page-planner` | harness/p2/pages.json | G0 · G1(`--spec-only`) | P2 |
| P3 토큰 적용 | `node harness/gates/build-tokens.mjs` | harness/p3/allowed.json · src/app/tokens.css | G0 | P3 |
| P4 화면 구현 (화면마다) | `screen-builder` | src/** | G0 · G2 · G3 · G9 (+G4 화면 03, +G5 화면 05) | P4 |
| P5 검증 | 게이트 전체 + `gate-judge` | harness/p5/report.md · harness/p5/shots/ | G0~G7 · G9 | 아래 복귀 표 |
| 승인 후 | `planner-comments` 스킬 | src/** 주석 | G8 · G3 | 되돌림 |
- (선택) `명세 다시 만들어` → 사람 승인 → `harness/.allow-spec-write` 생성 → `screen-spec-writer` → 마커 삭제 → G0(`--phase spec`) → P2

**복귀 표 (P5 실패)**
| 실패 | 돌아갈 곳 |
|---|---|
| G2 토큰 · G3 build·lint · G4 정렬 · G5 개인정보 · G6 외부 호출 · G7 375px · G9 금액 · gate-judge ❌ | P4 (해당 화면) |
| G1 라우트 수 · 이동 불일치 | P2 |
| 허용 목록에 필요한 토큰이 없음 | P3 (그래도 없으면 멈추고 보고) |
| docs 개정 | P1부터 |

## 4. 게이트 실행
- 전체: `node harness/gates/run-all.mjs --build --g7 --phase <단계>` → JSON. `pass: true`이고 위반 0건이면 통과.
- 하나만: `node harness/gates/<g0-scope|g1-routes|g2-tokens|g4-sort|g5-privacy|g6-external|g7-viewport|g8-comments|g9-pricing>.mjs`
- G3: `npm run build` · `npm run lint` (run-all의 `--build`)
- G7: `g7-viewport.mjs`가 빌드 결과로 `next start`(포트 3100)를 띄우고, 설치된 Chrome(Playwright `channel: "chrome"`)으로 라우트 6개를 375×812로 연다. 확인하는 것: 가로 스크롤 없음 · 콘솔 오류 0 · 다른 화면으로 튕기지 않음 · 외부 요청 0 · `/apply` 입력 요소 3개. 스크린샷은 `harness/p5/shots/01~06.png`에 저장한다. 먼저 build가 되어 있어야 한다.
- G9: `g9-pricing.mjs`가 R1~R7을 따로 계산해 `pricing.ts` · `recommend()` · `buildApplication()`의 금액과 `formatWon` 표기를 대조한다.
- 실패하면 게이트 출력 JSON을 그대로 해당 에이전트에게 넘겨 다시 시킨다. 같은 단계를 연속 3번 실패하면 멈추고 보고한다.
- 게이트 스크립트 · 훅 · config · 에이전트는 훅으로 보호된다. 고쳐야 할 것 같으면 멈추고 사람에게 묻는다.

## 5. 사람 승인 (1곳)
- P5의 게이트가 모두 통과한 뒤, 스크린샷 6장과 화면 요약 6줄(`planner-comments`의 "화면 요약"을 겸함)을 한 번에 보여 주고 승인을 받는다.
- 지적이 있으면 그 화면의 P4로 돌아간다. 승인을 받으면 `planner-comments` → G8 → G3 → 커밋.

## 6. 커밋 · 브랜치 · 이어 하기
- `하네스 시작` 시 `harness/run-YYYYMMDD` 브랜치를 만든다. main에 합치는 것과 push는 하지 않는다.
- 게이트를 통과한 단계마다 1커밋, P4는 화면마다 1커밋. 메시지: `harness(P4-03): 추천 결과 화면 · gates 0 violations`
- 커밋 전에 반드시 G0(`--phase <단계>`)를 돌린다.
- `harness/state.json`에 단계 · 화면별 상태, 실패 횟수, 마지막 커밋을 기록한다.
- 이어 하기: state.json과 마지막 커밋 기준으로 통과하지 못한 첫 지점부터. 커밋하지 않은 변경 사항은 먼저 사람에게 보여 주고 묻는다.

## 7. 부르는 말
| 말 | 동작 |
|---|---|
| 하네스 시작 | 브랜치 → P1~P5 → 승인 |
| 화면 N 만들어 | P4의 화면 N → 게이트 전체 |
| 검증해 | P5만 |
| 이어서 해 | state.json 기준 이어 하기 |
| 상태 보여줘 | 단계별 · 화면별 통과 표 |
| 명세 다시 만들어 | 승인 후 screen-spec-writer |

## 8. 멈추고 물어볼 때
- docs끼리 내용이 다르고 우선순위로도 정해지지 않을 때
- 피그마 링크를 못 읽을 때
- 같은 단계를 3번 실패했을 때
- 보호 파일(docs · reference · 게이트 · 훅 · 에이전트 · 스킬 · config)을 바꿔야 할 것 같을 때
