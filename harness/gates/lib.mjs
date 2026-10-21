// 하네스 게이트 공용 함수. 게이트 스크립트와 훅이 함께 쓴다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// HARNESS_ROOT: 시험용 복사본에서 돌릴 때만 지정한다.
export const ROOT = path.resolve(process.env.HARNESS_ROOT ?? path.join(HERE, "..", ".."));
export const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "harness", "config.json"), "utf8"));

export const abs = (p) => path.join(ROOT, p);
export const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
export const exists = (p) => fs.existsSync(abs(p));
export const read = (p) => fs.readFileSync(abs(p), "utf8");
export const readJson = (p) => JSON.parse(read(p));

export function walk(dir, exts) {
  const out = [];
  const start = abs(dir);
  if (!fs.existsSync(start)) return out;
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (!exts || exts.includes(path.extname(ent.name))) out.push(rel(full));
    }
  }
  return out.sort();
}

export const lineOf = (text, index) => text.slice(0, index).split("\n").length;

// 게이트 결과: { gate, pass, violations: [{ file, line, msg }] }
export function result(gate, violations, extra = {}) {
  return { gate, pass: violations.length === 0, violations, ...extra };
}

export async function cli(meta, run) {
  if (!process.argv[1] || pathToFileURL(path.resolve(process.argv[1])).href !== meta.url) return;
  try {
    const r = await run(process.argv.slice(2));
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.pass ? 0 : 1);
  } catch (e) {
    console.log(JSON.stringify({ gate: path.basename(process.argv[1]), pass: false, violations: [{ msg: String(e?.stack ?? e) }] }, null, 2));
    process.exit(1);
  }
}

export function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

// git status 기준으로 바뀐 파일 목록 (staged · unstaged · untracked)
export function changedFiles() {
  const out = git(["status", "--porcelain", "-uall"]);
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      let p = l.slice(3);
      if (p.includes(" -> ")) p = p.split(" -> ")[1];
      return p.replace(/^"|"$/g, "");
    });
}

export const underAny = (file, prefixes) => prefixes.some((p) => (p.endsWith("/") ? file.startsWith(p) : file === p));

// ---------------------------------------------------------------------------
// 토큰 검사 (H1 훅 · G2 게이트 공용)
// ---------------------------------------------------------------------------

const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_PREFIX = "bg|text|border|border-[trblxyse]|ring|outline|fill|stroke|divide|placeholder|decoration|from|via|to|caret|accent|shadow";
const SPACING_UTIL = "p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left|start|end|indent|scroll-m|scroll-p";
const SIZE_UTIL = "w|h|size|min-w|min-h|max-w|max-h|basis";
const TEXT_MISC = new Set(["left", "center", "right", "justify", "start", "end", "wrap", "nowrap", "balance", "pretty", "ellipsis", "clip", "transparent", "current", "inherit"]);
const BG_MISC = new Set(["transparent", "current", "inherit", "none", "cover", "contain", "center", "no-repeat", "repeat", "fixed", "local", "scroll", "clip-text", "clip-border", "clip-padding", "clip-content"]);
const BORDER_MISC = new Set(["solid", "dashed", "dotted", "double", "hidden", "none", "collapse", "separate", "transparent", "current", "inherit", "0", "1", "2"]);
const WEIGHTS = "thin|extralight|light|normal|medium|semibold|bold|extrabold|black";

// JS/TS 문자열 리터럴 내용만 뽑는다. import 경로("./", "@/", "/")는 뺀다.
export function stringsOf(text) {
  const out = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/gs;
  let m;
  while ((m = re.exec(text))) {
    const s = m[2];
    if (/^(\.{1,2}\/|@\/|\/|node:|next\/|react)/.test(s)) continue;
    out.push({ s, index: m.index + 1 });
  }
  return out;
}

export function checkTokens(text, file, allowed) {
  const v = [];
  const add = (index, msg) => v.push({ file, line: lineOf(text, index), msg });
  const isCss = file.endsWith(".css");

  // 1) 색상 리터럴 (파일 전체)
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(/g)) {
    add(m.index, `색상 리터럴 금지: ${m[0]} → allowed.json colors의 토큰 클래스를 쓰세요`);
  }

  if (isCss) {
    // CSS: 숫자+단위 금지 (0 제외). 토큰은 tokens.css에만.
    for (const m of text.matchAll(/(?<![\w-])(?!0(?:px|rem|em)?\b)\d*\.?\d+(px|rem|em|vh|vw|%)\b/g)) {
      add(m.index, `CSS 숫자 값 금지: ${m[0]} → tokens.css의 변수나 Tailwind 토큰 클래스를 쓰세요`);
    }
    return v;
  }

  // 2) 인라인 style 안의 숫자 · 색
  for (const m of text.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
    if (/\d|#/.test(m[1])) add(m.index, `인라인 style의 숫자·색 금지: style={{${m[1].trim().slice(0, 40)}}}`);
  }

  const colors = new Set(Object.keys(allowed.colors));
  const spacing = new Set(allowed.spacing.map(String));
  const sizes = new Set([...allowed.spacing, ...allowed.sizes].map(String));
  const radius = new Set(Object.keys(allowed.radius));
  const textStyles = new Set(Object.keys(allowed.textStyles));
  const borderArb = new Set(allowed.borderArbitrary);

  for (const { s, index } of stringsOf(text)) {
    for (const cm of s.matchAll(/[^\s"'`{}()]+/g)) {
      const raw = cm[0];
      const at = index + cm.index;
      // 변형 접두(hover:, md: 등)와 ! 제거
      const cls = raw.split(":").pop().replace(/^!/, "").replace(/!$/, "");
      const neg = cls.startsWith("-") ? cls.slice(1) : cls;

      // 3) 임의 값 [...]
      const arb = neg.match(/^([\w-]+?)-\[([^\]]*)\]$/) || neg.match(/^\[([^\]]*)\]$/);
      if (arb) {
        const util = arb.length === 3 ? arb[1] : "";
        const val = arb.length === 3 ? arb[2] : arb[1];
        if (/^border(-[trblxyse])?$/.test(util) && borderArb.has(val)) continue;
        if (/\d|#/.test(val)) add(at, `임의 값 금지: ${raw}`);
        continue;
      }
      if (/^[\w-]+-\(/.test(neg)) {
        add(at, `CSS 변수 직접 지정 금지: ${raw} → 토큰 클래스를 쓰세요`);
        continue;
      }

      // 4) 기본 팔레트 · white/black
      let m;
      if ((m = neg.match(new RegExp(`^(?:${COLOR_PREFIX})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|white|black)(?:/\\d+)?$`)))) {
        add(at, `Tailwind 기본 팔레트 금지: ${raw}`);
        continue;
      }

      // 5) 여백
      if ((m = neg.match(new RegExp(`^(?:${SPACING_UTIL})-(\\d+(?:\\.\\d+)?)$`)))) {
        if (!spacing.has(m[1])) add(at, `여백 토큰 밖 값: ${raw} (허용: ${allowed.spacing.join(", ")})`);
        continue;
      }
      // 6) 크기
      if ((m = neg.match(new RegExp(`^(?:${SIZE_UTIL})-(\\d+(?:\\.\\d+)?)$`)))) {
        if (!sizes.has(m[1])) add(at, `크기 토큰 밖 값: ${raw} (허용: spacing + sizes)`);
        continue;
      }
      // 7) 모서리
      if (neg === "rounded") {
        add(at, `rounded 단독 금지 → rounded-<radius 키>`);
        continue;
      }
      if ((m = neg.match(/^rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?-([\w.]+)$/))) {
        if (!radius.has(m[1])) add(at, `모서리 토큰 밖 값: ${raw} (허용: ${[...radius].join(", ")})`);
        continue;
      }
      // 8) 글자 굵기 · 줄높이 · 자간 (텍스트 스타일로만)
      if (new RegExp(`^(?:font-(?:${WEIGHTS})|leading-.+|tracking-.+)$`).test(neg)) {
        add(at, `텍스트 스타일 밖 조합 금지: ${raw} → text-<textStyles 키>`);
        continue;
      }
      // 9) text-* : 색 · 텍스트 스타일 · 정렬만
      if ((m = neg.match(/^text-(.+)$/))) {
        const val = m[1].replace(/\/\d+$/, "");
        if (!colors.has(val) && !textStyles.has(val) && !TEXT_MISC.has(val)) add(at, `text 토큰 밖 값: ${raw}`);
        continue;
      }
      // 10) bg-* : 색만
      if ((m = neg.match(/^bg-(.+)$/))) {
        const val = m[1].replace(/\/\d+$/, "");
        if (!colors.has(val) && !BG_MISC.has(val) && !/^(linear|radial|conic)/.test(val)) add(at, `bg 토큰 밖 값: ${raw}`);
        continue;
      }
      // 11) border-* : 색 · 두께(0,1,2) · 스타일. border-t 같은 한쪽 테두리 단독은 허용
      if (/^border(?:-[trblxyse])?$/.test(neg)) continue;
      if ((m = neg.match(/^border(?:-[trblxyse])?-(.+)$/))) {
        const val = m[1].replace(/\/\d+$/, "");
        if (!colors.has(val) && !BORDER_MISC.has(val)) add(at, `border 토큰 밖 값: ${raw}`);
        continue;
      }
      // 12) 그림자: 토큰 없음
      if (/^shadow(-(?:2xs|xs|sm|md|lg|xl|2xl|inner))?$/.test(neg)) {
        add(at, `그림자 효과 스타일은 토큰에 없음: ${raw}`);
      }
    }
  }
  return v;
}

export function loadAllowed() {
  const p = cfg.outputs.p3Allowed;
  if (!exists(p)) return null;
  return readJson(p);
}

// ---------------------------------------------------------------------------
// src/lib/*.ts 를 node로 바로 불러오기 (Node 24 타입 제거 + @/ · 확장자 생략 해석)
// ---------------------------------------------------------------------------
let hooked = false;
export async function importTs(relPath) {
  if (!hooked) {
    registerHooks({
      resolve(spec, ctx, next) {
        let s = spec;
        if (s.startsWith("@/")) s = pathToFileURL(path.join(ROOT, "src", s.slice(2))).href;
        const local = s.startsWith(".") || s.startsWith("file:");
        if (local && !/\.(m|c)?(j|t)sx?$/.test(s)) {
          for (const ext of [".ts", "/index.ts", ".js"]) {
            try {
              return next(s + ext, ctx);
            } catch {}
          }
        }
        return next(s, ctx);
      },
    });
    hooked = true;
  }
  return import(pathToFileURL(abs(relPath)).href);
}
