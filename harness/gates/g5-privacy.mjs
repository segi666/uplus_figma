// ★G5 개인정보 (어기면 안 되는 것 B · R15)
// 입력칸은 name(text) · email(email) · privacyConsent(checkbox) 3개뿐,
// 저장 객체 키 = Application 필드 11개, 금지어 0건.
import { cfg, exists, read, walk, result, cli, importTs, lineOf } from "./lib.mjs";

const FILE = "src/lib/application.ts";
const FIELD_TAGS = /<(input|Input|Checkbox|textarea|Textarea|select|Select)\b([^>]*?)\/?>/gs;

export async function run() {
  const v = [];
  const { fieldNames, applicationKeys, forbiddenWords, forbiddenInputTypes } = cfg.privacy;
  const all = walk("src", [".ts", ".tsx", ".js", ".jsx"]);

  // 1) 금지어 · 금지 입력 타입 (src 전체)
  for (const f of all) {
    const text = read(f);
    for (const w of forbiddenWords) {
      for (const m of text.matchAll(new RegExp(w, "gi"))) v.push({ file: f, line: lineOf(text, m.index), msg: `금지어: ${m[0]}` });
    }
    for (const m of text.matchAll(/type\s*=\s*["'{`]+\s*(\w+)/g)) {
      if (forbiddenInputTypes.includes(m[1])) v.push({ file: f, line: lineOf(text, m.index), msg: `금지 입력 타입: ${m[1]}` });
    }
    if (/<(textarea|select)\b/i.test(text)) v.push({ file: f, msg: "textarea · select 금지" });
  }

  // 2) 페이지에서 쓰는 입력 요소: name 문자 그대로, 정확히 3개
  const seen = {};
  for (const f of all.filter((x) => x.startsWith("src/app/") && x.endsWith(".tsx"))) {
    const text = read(f);
    for (const m of text.matchAll(FIELD_TAGS)) {
      const attrs = m[2];
      const name = attrs.match(/\bname\s*=\s*["']([^"']+)["']/)?.[1];
      if (!name) {
        v.push({ file: f, line: lineOf(text, m.index), msg: `<${m[1]}>에 name="..." 문자 그대로 없음` });
        continue;
      }
      if (!(name in fieldNames)) v.push({ file: f, line: lineOf(text, m.index), msg: `허용되지 않은 입력칸: ${name}` });
      seen[name] = (seen[name] ?? 0) + 1;
      const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/)?.[1];
      const want = fieldNames[name];
      const isCheckboxTag = /checkbox/i.test(m[1]);
      if (want && !(type === want || (want === "checkbox" && isCheckboxTag) || (want === "text" && !type && m[1] !== "Checkbox"))) {
        v.push({ file: f, line: lineOf(text, m.index), msg: `${name}의 type이 ${want}가 아님 (${type ?? "없음"})` });
      }
    }
  }
  // 2-1) 공용 컴포넌트 안의 실제 <input>: type은 허용 타입이거나 넘겨받은 값({...})만
  const allowedTypes = new Set(Object.values(fieldNames));
  for (const f of all.filter((x) => x.startsWith("src/components/"))) {
    const text = read(f);
    for (const m of text.matchAll(/<input\b([^>]*?)\/?>/gs)) {
      const type = m[1].match(/\btype\s*=\s*["']([^"']+)["']/)?.[1];
      if (type && !allowedTypes.has(type)) v.push({ file: f, line: lineOf(text, m.index), msg: `컴포넌트 안 입력 요소 type=${type} (허용: ${[...allowedTypes].join(", ")})` });
      if (/\bhidden\b/.test(m[1]) && !/aria-hidden/.test(m[1])) v.push({ file: f, line: lineOf(text, m.index), msg: "숨긴 입력 요소 금지" });
    }
  }
  // 실제 화면의 입력 요소 수는 G7이 /apply DOM에서 다시 센다.
  const total = Object.values(seen).reduce((a, b) => a + b, 0);
  for (const n of Object.keys(fieldNames)) if (seen[n] !== 1) v.push({ msg: `입력칸 ${n}: ${seen[n] ?? 0}개 (정확히 1개여야 함)` });
  if (total !== Object.keys(fieldNames).length) v.push({ msg: `입력칸 합계 ${total} ≠ ${Object.keys(fieldNames).length}` });

  // 3) 저장 객체 키
  if (!exists(FILE)) {
    v.push({ file: FILE, msg: "application.ts 없음 → P4" });
  } else {
    const mod = await importTs(FILE);
    const data = await importTs("src/lib/data.ts").catch(() => ({}));
    if (typeof mod.buildApplication !== "function") {
      v.push({ file: FILE, msg: "export function buildApplication 없음" });
    } else {
      const planId = data.plans?.[0]?.id;
      const app = await mod.buildApplication({
        customerType: "change",
        purpose: "more-data",
        contractMonths: 24,
        planId,
        name: "홍길동",
        email: "user@example.com",
        privacyConsent: true,
      });
      const keys = Object.keys(app ?? {}).sort();
      const want = [...applicationKeys].sort();
      const extra = keys.filter((k) => !want.includes(k));
      const missing = want.filter((k) => !keys.includes(k));
      if (extra.length) v.push({ file: FILE, msg: `Application에 없는 키 저장: ${extra.join(", ")}` });
      if (missing.length) v.push({ file: FILE, msg: `Application 키 누락: ${missing.join(", ")}` });
    }
  }
  return result("G5 개인정보(B)", v, { inputs: seen });
}

await cli(import.meta, run);
