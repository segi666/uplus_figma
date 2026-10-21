// 게이트 전체 실행: G1 G2 G4 G5 G6 (+ --build 이면 G3 build·lint, --phase X 이면 G0)
// G7(375px)은 오케스트레이터가 브라우저 미리보기로 돌린다.
// 사용: node harness/gates/run-all.mjs [--build] [--phase P5]
import { execSync } from "node:child_process";
import { ROOT, result, cli } from "./lib.mjs";
import { run as g0 } from "./g0-scope.mjs";
import { run as g1 } from "./g1-routes.mjs";
import { run as g2 } from "./g2-tokens.mjs";
import { run as g4 } from "./g4-sort.mjs";
import { run as g5 } from "./g5-privacy.mjs";
import { run as g6 } from "./g6-external.mjs";

function g3() {
  const v = [];
  for (const cmd of ["npm run build", "npm run lint"]) {
    try {
      execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
    } catch (e) {
      const out = `${e.stdout ?? ""}\n${e.stderr ?? ""}`.trim().split("\n").slice(-30).join("\n");
      v.push({ msg: `${cmd} 실패 (종료 코드 ${e.status})\n${out}` });
    }
  }
  return result("G3 build·lint", v);
}

const safe = async (name, fn) => {
  try {
    return await fn();
  } catch (e) {
    return result(name, [{ msg: String(e?.stack ?? e) }]);
  }
};

export async function run(args = []) {
  const results = [];
  if (args.includes("--phase")) results.push(await safe("G0 범위", () => g0(args)));
  results.push(await safe("G1 라우트", () => g1(args)));
  results.push(await safe("G2 토큰", () => g2()));
  if (args.includes("--build")) results.push(await safe("G3 build·lint", () => g3()));
  results.push(await safe("G4 정렬(A)", () => g4()));
  results.push(await safe("G5 개인정보(B)", () => g5()));
  results.push(await safe("G6 외부 호출·실명", () => g6()));

  const summary = results.map((r) => ({ gate: r.gate, pass: r.pass, violations: r.violations.length }));
  const violations = results.flatMap((r) => r.violations.map((x) => ({ gate: r.gate, ...x })));
  return { gate: "run-all", pass: results.every((r) => r.pass), summary, violations };
}

await cli(import.meta, run);
