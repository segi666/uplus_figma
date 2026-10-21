// G8 주석 전용: planner-comments 실행 뒤 src/의 변경이 [기획] 주석 줄 추가뿐인가.
import { git, result, cli, changedFiles } from "./lib.mjs";

export async function run() {
  const v = [];
  for (const f of changedFiles().filter((x) => x.startsWith("src/"))) {
    const status = git(["status", "--porcelain", "--", f]).slice(0, 2);
    if (status.includes("?")) v.push({ file: f, msg: "새 파일 추가 금지 (주석만 추가해야 함)" });
  }

  const diff = git(["diff", "HEAD", "-U0", "--no-color", "--", "src/"]);
  let file = null;
  let inBlock = false; // [기획]으로 시작한 여러 줄 주석 안인가
  let line = 0;
  for (const l of diff.split("\n")) {
    if (l.startsWith("+++ ")) {
      file = l.slice(6);
      inBlock = false;
      continue;
    }
    if (l.startsWith("--- ") || l.startsWith("diff ") || l.startsWith("index ")) continue;
    const hunk = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      line = +hunk[1];
      inBlock = false;
      continue;
    }
    if (l.startsWith("-")) {
      v.push({ file, msg: `지운 줄이 있음: ${l.slice(1).trim().slice(0, 60)}` });
      continue;
    }
    if (!l.startsWith("+")) continue;
    const body = l.slice(1).trim();
    const opens = /^(\{\/\*|\/\*|<!--)/.test(body);
    const closes = /(\*\/\}?|-->)$/.test(body);
    const ok =
      body === "" ||
      inBlock ||
      (/^\/\/\s*\[기획\]/.test(body)) ||
      (opens && body.includes("[기획]"));
    if (!ok) v.push({ file, line, msg: `주석이 아닌 줄 추가: ${body.slice(0, 60)}` });
    if (opens && body.includes("[기획]") && !closes) inBlock = true;
    else if (inBlock && closes) inBlock = false;
    line++;
  }
  return result("G8 주석 전용", v);
}

await cli(import.meta, run);
