// H2 보호 훅: docs · reference · 게이트 · 훅 · 에이전트 · 스킬 · config · 자동 생성 파일에 쓰기를 거부한다.
// 예외: harness/.allow-spec-write 가 있을 때만 docs/screen-spec.md 쓰기 허용 (사람 승인 후 screen-spec-writer).
import { cfg, exists, underAny } from "../../harness/gates/lib.mjs";
import { readInput, block } from "./read-input.mjs";

const { file } = await readInput();
if (!file) process.exit(0);

if (file === cfg.docs.screenSpec && exists(cfg.specUnlockMarker)) process.exit(0);

if (underAny(file, cfg.protected)) {
  block([
    `[H2 보호 훅] ${file} 는 보호된 파일이라 쓸 수 없습니다.`,
    "보호 대상: " + cfg.protected.join(", "),
    "자동 생성 파일(tokens.css, harness/p3/)은 node harness/gates/build-tokens.mjs 로만 만듭니다.",
    "정말 바꿔야 한다면 작업을 멈추고 사람에게 보고하세요.",
  ]);
}
