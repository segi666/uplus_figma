// G0 범위: 이번 단계에서 바뀐 파일이 모두 그 단계의 편집 폴더 안에 있는가.
// 사용: node harness/gates/g0-scope.mjs --phase P1|P2|P3|P4|P5|comments|spec
import { cfg, result, cli, changedFiles, underAny } from "./lib.mjs";

export async function run(args = []) {
  const i = args.indexOf("--phase");
  const phase = i >= 0 ? args[i + 1] : null;
  const scopes = cfg.phaseScopes;
  if (!phase || !scopes[phase] || ["always", "excludeFromP4"].includes(phase)) {
    return result("G0 범위", [{ msg: `--phase 를 지정하세요: P1 P2 P3 P4 P5 comments spec` }]);
  }
  const allowed = [...scopes[phase], ...scopes.always];
  const excluded = phase === "P4" || phase === "comments" ? scopes.excludeFromP4 : [];
  const files = changedFiles();
  const violations = [];
  for (const f of files) {
    if (underAny(f, excluded)) violations.push({ file: f, msg: `${phase}에서 바꿀 수 없는 파일 (P3 스크립트 전용)` });
    else if (!underAny(f, allowed)) violations.push({ file: f, msg: `${phase} 편집 폴더 밖 (허용: ${scopes[phase].join(", ")})` });
  }
  return result("G0 범위", violations, { phase, changed: files.length });
}

await cli(import.meta, run);
