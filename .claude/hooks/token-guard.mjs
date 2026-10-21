// H1 토큰 훅: src/ 아래 코드에 토큰 밖 값이 들어가면 저장을 거부한다.
// 검사 규칙은 G2와 같다 (harness/gates/lib.mjs 의 checkTokens).
import { cfg, checkTokens, loadAllowed } from "../../harness/gates/lib.mjs";
import { readInput, block } from "./read-input.mjs";

const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];

const { file, text } = await readInput();
if (!file || !file.startsWith("src/") || file === cfg.outputs.p3Css) process.exit(0);
if (!EXTS.some((e) => file.endsWith(e))) process.exit(0);

const allowed = loadAllowed();
if (!allowed) {
  block([`[H1 토큰 훅] ${cfg.outputs.p3Allowed} 가 없어 src/ 코드를 쓸 수 없습니다. P3(node harness/gates/build-tokens.mjs)을 먼저 돌리세요.`]);
}

const v = checkTokens(text, file, allowed);
if (v.length) {
  block([
    `[H1 토큰 훅] ${file}: 토큰 밖 값 ${v.length}건 — 저장하지 않았습니다.`,
    ...v.slice(0, 20).map((x) => `- (조각 ${x.line}줄) ${x.msg}`),
    v.length > 20 ? `- … 외 ${v.length - 20}건` : "",
    `허용 값: ${cfg.outputs.p3Allowed}. 토큰이 모자라면 임의 값으로 메우지 말고 보고하세요.`,
  ]);
}
