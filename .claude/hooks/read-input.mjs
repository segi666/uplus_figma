// 훅 공용: stdin의 도구 호출 JSON을 읽어 { tool, file, text }로 돌려준다.
import path from "node:path";
import { ROOT } from "../../harness/gates/lib.mjs";

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || "{}");
  const ti = input.tool_input ?? {};
  const filePath = ti.file_path ?? ti.notebook_path ?? null;
  let file = null;
  if (filePath) {
    const r = path.relative(ROOT, path.resolve(input.cwd ?? ROOT, filePath)).split(path.sep).join("/");
    file = r.startsWith("..") || path.isAbsolute(r) ? null : r;
  }
  const text =
    ti.content ??
    ti.new_string ??
    (Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string ?? "").join("\n") : null) ??
    ti.new_source ??
    "";
  return { tool: input.tool_name, file, text };
}

// 종료 코드 2 = 도구 호출 거부. stderr 내용이 Claude에게 전달된다.
export function block(lines) {
  process.stderr.write(lines.join("\n") + "\n");
  process.exit(2);
}
