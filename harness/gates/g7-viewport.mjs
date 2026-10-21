// G7 375px (N1) + 실행 중 검사: 라우트 6개를 375×812로 열어
// 가로 스크롤 없음 · 콘솔 오류 0 · 다른 화면으로 튕기지 않음 · 외부 요청 0(C1) · /apply 입력칸 3개(B)를 확인하고
// 스크린샷을 harness/p5/shots/01~06.png에 저장한다.
// 사용: node harness/gates/g7-viewport.mjs   (먼저 npm run build 가 되어 있어야 한다)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { cfg, ROOT, abs, exists, result, cli, importTs } from "./lib.mjs";

const { width, height, port, storage, seed } = cfg.g7;
const BASE = `http://localhost:${port}`;

async function waitForServer(ms = 60000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(BASE);
      if (r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function run() {
  const v = [];
  if (!exists(".next/BUILD_ID")) return result("G7 375px", [{ msg: "빌드 결과 없음 → npm run build 먼저" }]);

  const { plans } = await importTs("src/lib/data.ts");
  const { buildApplication } = await importTs("src/lib/application.ts");
  const planId = plans[0].id;
  const selection = { ...seed.selection, planId };
  const application = await buildApplication({ ...seed.selection, planId, ...seed.applicant });

  const routes = cfg.routes.map((r) => ({ ...r, path: r.route.replace("[id]", planId) }));
  const shots = cfg.outputs.p5Shots;
  fs.mkdirSync(abs(shots), { recursive: true });

  const server = spawn(process.execPath, [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)], { cwd: ROOT, stdio: "ignore" });
  let browser;
  try {
    if (!(await waitForServer())) return result("G7 375px", [{ msg: `서버가 ${BASE}에서 뜨지 않음` }]);
    const { chromium } = await import("playwright");
    browser = await chromium.launch(cfg.g7.channel ? { channel: cfg.g7.channel } : {});
    for (const r of routes) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
      await ctx.addInitScript(
        ([sk, sv, lk, lv]) => {
          window.sessionStorage.setItem(sk, sv);
          window.localStorage.setItem(lk, lv);
        },
        [storage.selection, JSON.stringify(selection), storage.application, JSON.stringify(application)],
      );
      const page = await ctx.newPage();
      const errors = [];
      const external = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("request", (q) => !q.url().startsWith(BASE) && !q.url().startsWith("data:") && external.push(q.url()));

      await page.goto(BASE + r.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const tag = `${r.id} ${r.path}`;

      const landed = new URL(page.url()).pathname;
      if (landed !== r.path) v.push({ msg: `${tag}: ${landed}로 이동됨 (화면이 열리지 않음)` });
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) v.push({ msg: `${tag}: 가로 스크롤 (scrollWidth ${sw} > ${width})` });
      for (const e of errors) v.push({ msg: `${tag}: 콘솔 오류 ${e.slice(0, 200)}` });
      for (const u of external) v.push({ msg: `${tag}: 외부 요청 ${u}` });

      if (r.route === "/apply") {
        const fields = await page.evaluate(() =>
          [...document.querySelectorAll("input, textarea, select")].map((el) => ({ name: el.getAttribute("name"), type: el.getAttribute("type") ?? el.tagName.toLowerCase() })),
        );
        const want = cfg.privacy.fieldNames;
        if (fields.length !== Object.keys(want).length) v.push({ msg: `${tag}: 화면의 입력 요소 ${fields.length}개 (정확히 ${Object.keys(want).length}개여야 함)` });
        for (const f of fields) {
          if (!(f.name in want)) v.push({ msg: `${tag}: 허용되지 않은 입력 요소 name=${f.name} type=${f.type}` });
          else if (want[f.name] !== f.type) v.push({ msg: `${tag}: ${f.name}의 type ${f.type} (기대 ${want[f.name]})` });
        }
      }

      // 하단 고정(sticky) 영역이 본문을 덮어 찍히지 않도록, 창을 페이지 전체 높이로 늘린 뒤 찍는다
      const fullH = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height: Math.max(height, fullH) });
      await page.waitForTimeout(150);
      await page.screenshot({ path: abs(`${shots}/${r.id}.png`) });
      await ctx.close();
    }
  } finally {
    await browser?.close();
    server.kill();
  }
  return result("G7 375px", v, { shots: routes.map((r) => `${shots}/${r.id}.png`) });
}

await cli(import.meta, run);
