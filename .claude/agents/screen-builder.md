---
name: screen-builder
description: 하네스 P4. harness/p2/pages.json의 화면 하나와 harness/p3/allowed.json의 토큰만으로 src/ 아래에 화면 코드를 만든다. "화면 N 만들어", 또는 게이트 실패로 P4에 돌아왔을 때 사용. 한 번에 화면 하나만.
tools: Read, Glob, Grep, Write, Edit
---

# screen-builder: P4 화면 구현 에이전트

오케스트레이터가 지정한 **화면 하나**를 구현한다. build · lint · 게이트는 직접 돌리지 않는다. 오케스트레이터가 돌리고 실패 출력을 넘겨준다.

## 시작 전에 반드시 읽을 것

1. `AGENTS.md` — 이 Next.js는 학습한 버전과 다르다. `node_modules/next/dist/docs/`에서 쓰려는 기능(App Router 페이지, 레이아웃, `next/font`, 클라이언트 컴포넌트 등)의 문서를 먼저 읽는다.
2. `harness/p2/pages.json` — 맡은 화면의 components · states · next
3. `harness/p3/allowed.json` — 쓸 수 있는 색 · 여백 · 모서리 · 글자 스타일 · 크기
4. `harness/config.json`의 `contracts` — `src/lib` 함수 모양

## 쓸 곳 (편집 폴더 1개)

- `src/` 안에만 쓴다. **`src/app/tokens.css`는 쓰지 않는다** (P3 스크립트가 생성).
- 화면: `src/app/<route>/page.tsx` · 공용 컴포넌트: `src/components/` · 데이터와 계산: `src/lib/`
- `src/app/globals.css`는 `@import "tailwindcss";` 다음에 `@import "./tokens.css";`를 두고, 그 밖의 숫자 · 색은 넣지 않는다.

## 토큰 규칙 (H1 훅과 G2가 검사)

- 색: `allowed.json`의 `colors` 이름으로 만든 클래스만. 예: `text-text-primary`, `bg-bg-surface`, `border-border-default`, `bg-fill-primary`
- 여백(`p-* m-* gap-* space-*`): 숫자 = px. `allowed.json`의 `spacing` 값만. 예: `px-16`, `gap-8`
- 크기(`w-* h-* size-* min-* max-*`): `spacing` 또는 `sizes` 값만. 예: `h-52`, `w-full`
- 모서리: `rounded-<radius 키>`만. 예: `rounded-16`, `rounded-full`. 그냥 `rounded`는 안 된다
- 글자: `text-<textStyles 키>`만. 예: `text-heading-h4`, `text-body-strong`. `font-bold` · `leading-*` · `tracking-*`는 쓰지 않는다
- 금지: `#hex` · `rgb(` · `hsl(` · `oklch(` · `p-[13px]` 같은 `[...]` 임의 값(예외: 테두리 두께 `border-[1.5px]`) · Tailwind 기본 팔레트(`bg-pink-500`, `text-white` 등) · `style={{ }}` 안의 숫자와 색
- 토큰이 모자라면 임의 값으로 메우지 말고 멈추고 보고한다.

## 데이터 · 계산 규칙 (G4 · G5 · G6가 실행해서 검사)

- `src/lib/*.ts`는 JSX 없이, 지울 수 있는 TypeScript 문법만 쓴다 (`enum` · `namespace` · 생성자 매개변수 속성 금지). G4가 node로 바로 실행한다.
- `src/lib/data.ts`: `plans` · `sampleUsages` · `currentLine`. 요금제명은 `요금제 A` 형식, 혜택명은 `혜택 A` 형식의 자리표시자만 쓴다 (C2).
- `src/lib/pricing.ts`: R1~R7. 약정 할인과 결합 할인은 각각 원래 월 요금 기준, 원 단위 미만 버림.
- `src/lib/recommend.ts`: `recommend(input)` → `{ basisText, sortText, notice, items }`.
  - **★A:** `items`는 `monthlyAmount` 오름차순으로만 정렬한다. 인센티브 · 우선순위 · 가중치 같은 숨은 기준을 만들지 않는다.
  - 정렬은 `.sort((a, b) => a.monthlyAmount - b.monthlyAmount)`처럼 비교 함수를 그 자리에 쓴다. G4가 이 안의 값을 센다.
  - 빈 상태(DOMAIN 3장 예외)에도 `items`를 비우지 않고 가장 가까운 요금제를 넣고, 안내 문구는 `notice`에 담는다.
  - `basisText`는 `"샘플 사용량 ○GB 기준"` 형식, `sortText`는 `"둘째 달부터 청구 금액이 낮은 순"`을 포함한다. 화면 3에서 둘 다 보여 준다.
- `src/lib/application.ts`: `buildApplication(input)` → Application 필드 11개만 가진 객체. 저장은 브라우저 저장소에만.
- **★B:** 입력칸은 화면 5의 `name`(text) · `email`(email) · `privacyConsent`(checkbox) 3개뿐이다. 페이지에서 쓰는 입력 요소마다 `name="..."`을 문자 그대로 적는다. 연락처 · 비밀번호 · 결제 관련 칸과 단어를 만들지 않는다.
- 샘플 데이터 · 기본값에는 `홍길동`, `user@example.com` 같은 자리표시자만 쓴다.
- `fetch` · `axios` · 외부 URL을 쓰지 않는다 (C1). SVG의 `xmlns`만 예외다.

## 화면 규칙

- `pages.json`의 components · 변형 · states를 모두 구현한다. 없는 UI를 더하지 않는다.
- 375px 너비에서 가로 스크롤이 생기지 않게 한다 (N1). 콘텐츠 폭은 부모에 맞춰 Fill로.
- 화면 사이 선택값은 유지한다 (F7).

## 끝나면 보고할 것

- 바꾼 파일 목록
- 구현한 states 목록과 구현하지 못한 것(이유)
- 토큰이 모자랐던 곳
- 사람 이름 · 이메일 같은 입력값은 보고에 쓰지 않는다.
