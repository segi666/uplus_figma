// ★G4 정렬 (어기면 안 되는 것 A · R8, R14)
// 모든 조합(유형 × 약정 × 목적)에서 recommend() 결과가 monthlyAmount 오름차순인가,
// 숨은 정렬 기준이 없는가, 화면에 추천 근거·정렬 기준 문구가 나가는가.
import { cfg, exists, read, walk, result, cli, importTs, lineOf } from "./lib.mjs";

const FILE = "src/lib/recommend.ts";

// .sort( ... ) / .toSorted( ... ) 호출의 괄호 안 내용
function sortCalls(text) {
  const out = [];
  for (const m of text.matchAll(/\.(sort|toSorted)\s*\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const from = i;
    while (i < text.length && depth > 0) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") depth--;
      i++;
    }
    out.push({ body: text.slice(from, i - 1), index: m.index });
  }
  return out;
}

export async function run() {
  const v = [];
  const { key, forbiddenKeys, basisPattern, sortPattern } = cfg.sort;
  if (!exists(FILE)) return result("G4 정렬(A)", [{ file: FILE, msg: "recommend.ts 없음 → P4" }]);

  // 정적 검사: 정렬 키 · 숨은 기준
  for (const f of walk("src/lib", [".ts"])) {
    const text = read(f);
    for (const k of forbiddenKeys) {
      for (const m of text.matchAll(new RegExp(`\\b${k}\\b`, "gi"))) v.push({ file: f, line: lineOf(text, m.index), msg: `숨은 정렬 기준 의심 단어: ${m[0]}` });
    }
  }
  const src = read(FILE);
  const calls = sortCalls(src);
  if (calls.length === 0) v.push({ file: FILE, msg: "정렬 호출(.sort/.toSorted)이 없음" });
  for (const c of calls) {
    const props = [...c.body.matchAll(/\.\s*([A-Za-z_]\w*)/g)].map((m) => m[1]).filter((p) => !["localeCompare"].includes(p));
    if (!props.includes(key)) v.push({ file: FILE, line: lineOf(src, c.index), msg: `정렬 기준에 ${key}가 없음` });
    const others = [...new Set(props.filter((p) => p !== key))];
    if (others.length) v.push({ file: FILE, line: lineOf(src, c.index), msg: `정렬 기준에 ${key} 말고 다른 값이 있음: ${others.join(", ")}` });
  }

  // 실행 검사: 모든 조합
  const mod = await importTs(FILE);
  if (typeof mod.recommend !== "function") return result("G4 정렬(A)", [...v, { file: FILE, msg: "export function recommend 없음" }]);
  let combos = 0;
  const { customerTypes, contractMonths, purposes } = cfg.contracts;
  for (const customerType of customerTypes) {
    for (const months of contractMonths) {
      for (const purpose of purposes[customerType]) {
        combos++;
        const label = `${customerType}/${months}/${purpose ?? "-"}`;
        const r = await mod.recommend({ customerType, contractMonths: months, purpose });
        const items = r?.items;
        if (!Array.isArray(items) || items.length === 0) {
          v.push({ msg: `${label}: items가 비어 있음 (빈 상태에도 가장 가까운 요금제를 보여야 함)` });
          continue;
        }
        for (let i = 1; i < items.length; i++) {
          if (!(items[i - 1][key] <= items[i][key])) v.push({ msg: `${label}: ${i}번째와 ${i + 1}번째가 오름차순 아님 (${items[i - 1][key]} > ${items[i][key]})` });
        }
        if (items.some((it) => !Number.isInteger(it[key]))) v.push({ msg: `${label}: ${key}가 원 단위 정수가 아님 (R7)` });
        if (!String(r.basisText ?? "").includes(basisPattern)) v.push({ msg: `${label}: basisText에 "${basisPattern}" 없음 (R13)` });
        if (!String(r.sortText ?? "").includes(sortPattern)) v.push({ msg: `${label}: sortText에 "${sortPattern}" 없음` });
      }
    }
  }

  // 화면 3이 두 문구를 실제로 보여 주는가
  const ui = walk("src/app", [".tsx"]).concat(walk("src/components", [".tsx"])).map((f) => read(f)).join("\n");
  for (const name of ["basisText", "sortText"]) if (!ui.includes(name)) v.push({ msg: `화면 코드에서 ${name}를 쓰지 않음 (화면 3에 표시해야 함)` });

  return result("G4 정렬(A)", v, { combos });
}

await cli(import.meta, run);
