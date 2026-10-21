// G1 라우트: 화면 수 = 6 = page.tsx 수, 라우트 목록 일치, 이동 대상이 모두 존재.
// 사용: node harness/gates/g1-routes.mjs [--spec-only]   (--spec-only: P2 직후, page.tsx 검사 생략)
import { cfg, exists, readJson, walk, result, cli } from "./lib.mjs";

// src/app/(group)/plans/[id]/page.tsx → /plans/[id]
export function routeOf(file) {
  const parts = file.replace(/^src\/app\//, "").split("/").slice(0, -1);
  const segs = parts.filter((p) => !/^\(.*\)$/.test(p) && !p.startsWith("@") && !p.startsWith("_"));
  return "/" + segs.join("/");
}

export async function run(args = []) {
  const v = [];
  const expected = cfg.routes;
  const ids = new Set(expected.map((r) => r.id));

  if (!exists(cfg.outputs.p2)) return result("G1 라우트", [{ file: cfg.outputs.p2, msg: "pages.json 없음 → P2" }]);
  const spec = readJson(cfg.outputs.p2);
  const screens = spec.screens ?? [];

  if (screens.length !== expected.length) v.push({ file: cfg.outputs.p2, msg: `화면 수 ${screens.length} ≠ ${expected.length}` });
  for (const r of expected) {
    const s = screens.find((x) => x.id === r.id);
    if (!s) v.push({ file: cfg.outputs.p2, msg: `화면 ${r.id} 없음` });
    else if (s.route !== r.route) v.push({ file: cfg.outputs.p2, msg: `화면 ${r.id} 라우트 ${s.route} ≠ ${r.route}` });
  }
  for (const s of screens) {
    if (!ids.has(s.id)) v.push({ file: cfg.outputs.p2, msg: `범위 밖 화면 ${s.id} ${s.name ?? ""}` });
    for (const key of ["components", "states", "next"]) {
      if (!Array.isArray(s[key]) || s[key].length === 0) v.push({ file: cfg.outputs.p2, msg: `화면 ${s.id}: ${key} 비어 있음` });
    }
    for (const n of s.next ?? []) if (!ids.has(n.to)) v.push({ file: cfg.outputs.p2, msg: `화면 ${s.id}: 없는 화면으로 이동 ${n.to}` });
    if (s.back != null && !ids.has(s.back)) v.push({ file: cfg.outputs.p2, msg: `화면 ${s.id}: 없는 화면으로 뒤로 ${s.back}` });
  }
  // 첫 화면에서 모든 화면에 도달할 수 있는가
  const reach = new Set([expected[0].id]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of screens) {
      if (!reach.has(s.id)) continue;
      for (const n of s.next ?? []) if (!reach.has(n.to) && ids.has(n.to)) reach.add(n.to), (changed = true);
    }
  }
  for (const id of ids) if (!reach.has(id)) v.push({ file: cfg.outputs.p2, msg: `화면 ${id}: 첫 화면에서 도달할 수 없음` });

  let pages = [];
  if (!args.includes("--spec-only")) {
    pages = walk("src/app", [".tsx", ".ts", ".jsx", ".js"]).filter((f) => /\/page\.(t|j)sx?$/.test(f));
    const found = pages.map(routeOf);
    if (pages.length !== expected.length) v.push({ msg: `page 파일 수 ${pages.length} ≠ ${expected.length}` });
    for (const r of expected) if (!found.includes(r.route)) v.push({ msg: `라우트 ${r.route} (${r.id}) 의 page 파일 없음` });
    for (const [i, route] of found.entries()) if (!expected.some((r) => r.route === route)) v.push({ file: pages[i], msg: `범위 밖 라우트 ${route}` });
  }
  return result("G1 라우트", v, { screens: screens.length, pages: pages.length });
}

await cli(import.meta, run);
