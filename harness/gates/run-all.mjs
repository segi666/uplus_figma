// 게이트 전체 실행: G1 G2 G4 G5 G6 G9 (+ --build 이면 G3 build·lint, --g7 이면 G7 375px, --phase X 이면 G0)
// G7은 빌드 결과가 필요하다: --build 와 함께 쓰거나 먼저 npm run build.
// 사용: node harness/gates/run-all.mjs [--build] [--g7] [--phase P5]
import { execSync } from "node:child_process";
import { ROOT, result, cli } from "./lib.mjs";
import { run as g0 } from "./g0-scope.mjs";
import { run as g1 } from "./g1-routes.mjs";
import { run as g2 } from "./g2-tokens.mjs";
import { run as g4 } from "./g4-sort.mjs";
import { run as g5 } from "./g5-privacy.mjs";
import { run as g6 } from "./g6-external.mjs";
import { run as g7 } from "./g7-viewport.mjs";
import { run as g9 } from "./g9-pricing.mjs";

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
  results.push(await safe("G9 금액", () => g9()));
  if (args.includes("--g7")) results.push(await safe("G7 375px", () => g7()));

  const summary = results.map((r) => ({ gate: r.gate, pass: r.pass, violations: r.violations.length }));
  const violations = results.flatMap((r) => r.violations.map((x) => ({ gate: r.gate, ...x })));
  return { gate: "run-all", pass: results.every((r) => r.pass), summary, violations };
}

await cli(import.meta, run);
