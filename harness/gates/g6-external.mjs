// G6 외부 호출 · 실명 (C1, C2): 외부 호출 0건, 요금제명 · 혜택명은 자리표시자만.
import { cfg, exists, read, walk, result, cli, importTs, lineOf } from "./lib.mjs";

const CALLS = [/\bfetch\s*\(/g, /\baxios\b/g, /\bXMLHttpRequest\b/g, /new\s+WebSocket\b/g, /\bsendBeacon\b/g, /new\s+EventSource\b/g];

export async function run() {
  const v = [];
  for (const f of walk("src", [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"])) {
    const text = read(f);
    for (const re of CALLS) for (const m of text.matchAll(re)) v.push({ file: f, line: lineOf(text, m.index), msg: `외부 호출 금지: ${m[0]}` });
    for (const m of text.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
      if (!cfg.external.allowUrls.some((u) => m[0].startsWith(u))) v.push({ file: f, line: lineOf(text, m.index), msg: `외부 URL 금지: ${m[0]}` });
    }
  }

  const DATA = "src/lib/data.ts";
  if (!exists(DATA)) {
    v.push({ file: DATA, msg: "data.ts 없음 → P4" });
  } else {
    const { plans } = await importTs(DATA);
    const planRe = new RegExp(cfg.placeholder.planName);
    const benefitRe = new RegExp(cfg.placeholder.benefitName);
    if (!Array.isArray(plans) || plans.length === 0) v.push({ file: DATA, msg: "plans가 비어 있음" });
    for (const p of plans ?? []) {
      if (!planRe.test(p.name)) v.push({ file: DATA, msg: `요금제명이 자리표시자 형식이 아님: ${p.name}` });
      for (const b of p.benefits ?? []) if (!benefitRe.test(b.name)) v.push({ file: DATA, msg: `혜택명이 자리표시자 형식이 아님: ${b.name}` });
    }
  }
  return result("G6 외부 호출·실명", v);
}

await cli(import.meta, run);
