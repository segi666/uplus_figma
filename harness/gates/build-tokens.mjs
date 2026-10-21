// P3 토큰 적용: docs/tokens.json.txt(SSOT) + docs/design.md.txt 2.2(텍스트 스타일)
//   → harness/p3/allowed.json, src/app/tokens.css
// 같은 입력이면 항상 같은 결과를 만든다. 결과 파일은 직접 고치지 않는다.
import fs from "node:fs";
import path from "node:path";
import { cfg, abs, read, result, cli } from "./lib.mjs";

const slug = (name) => name.replace(/\//g, "-");
const toHex = ({ hex, alpha }) => {
  const base = hex.toUpperCase();
  if (alpha === undefined || alpha >= 1) return base;
  return base + Math.round(alpha * 255).toString(16).padStart(2, "0").toUpperCase();
};
const byNumber = (obj) => Object.entries(obj).sort((a, b) => a[1] - b[1]);

// design.md 2.2 표: | `heading/h1` | 32 / 44 | Bold 700 | ...
export function parseTextStyles(md) {
  const start = md.indexOf("### 2.2");
  const end = md.indexOf("### 2.3");
  if (start < 0 || end < 0) throw new Error("design.md에서 2.2 제품 UI 스타일 표를 찾지 못했습니다");
  const styles = {};
  for (const line of md.slice(start, end).split("\n")) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|\s*[A-Za-z]+\s+(\d{3})\s*\|/);
    if (m) styles[slug(m[1])] = { size: +m[2], lineHeight: +m[3], weight: +m[4], source: m[1] };
  }
  return styles;
}

export function buildTokens() {
  const tokens = JSON.parse(read(cfg.docs.tokens));
  const textStyles = parseTextStyles(read(cfg.docs.design));
  const errors = [];

  if (Object.keys(textStyles).length !== 15) errors.push({ msg: `텍스트 스타일이 15개가 아닙니다: ${Object.keys(textStyles).length}개` });
  const fontSizes = new Set(Object.entries(tokens.typography).filter(([k]) => k.startsWith("font-size/")).map(([, v]) => v));
  for (const [k, s] of Object.entries(textStyles)) {
    if (!fontSizes.has(s.size)) errors.push({ msg: `텍스트 스타일 ${k}의 크기 ${s.size}가 tokens.json typography에 없습니다` });
  }

  const colors = Object.fromEntries(Object.entries(tokens.semantic).map(([k, v]) => [slug(k), toHex(v)]));
  const spacing = byNumber(tokens.spacing).map(([, v]) => v);
  const radius = Object.fromEntries(
    byNumber(tokens.radius).map(([k, v]) => [k.replace(/^radius\//, ""), v]),
  );
  const font = tokens.typography["font-family/family-font"];

  const allowed = {
    generatedBy: "node harness/gates/build-tokens.mjs",
    sources: [cfg.docs.tokens, `${cfg.docs.design} 2.2`, "harness/config.json tokens"],
    font,
    colors,
    spacing,
    sizes: cfg.tokens.sizes,
    radius,
    textStyles,
    borderArbitrary: cfg.tokens.borderArbitrary,
  };

  const lines = [
    "/* 자동 생성 파일: node harness/gates/build-tokens.mjs — 직접 고치지 마세요. */",
    `/* 원본: ${cfg.docs.tokens}, ${cfg.docs.design} 2.2 */`,
    "@theme {",
    "  --color-*: initial;",
    "  --radius-*: initial;",
    "  --text-*: initial;",
    "  --shadow-*: initial;",
    "  --font-*: initial;",
    `  --font-sans: "${font}", sans-serif;`,
    "  /* 여백·크기 클래스의 숫자 = px (예: p-16 = 16px) */",
    "  --spacing: 1px;",
    "",
    ...Object.entries(colors).map(([k, v]) => `  --color-${k}: ${v};`),
    "",
    ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v}px;`),
    "",
    ...Object.entries(textStyles).flatMap(([k, s]) => [
      `  --text-${k}: ${s.size}px;`,
      `  --text-${k}--line-height: ${s.lineHeight}px;`,
      `  --text-${k}--font-weight: ${s.weight};`,
    ]),
    "}",
    "",
  ];

  return { allowed, css: lines.join("\n"), errors };
}

await cli(import.meta, async (args) => {
  const { allowed, css, errors } = buildTokens();
  if (errors.length) return result("P3 build-tokens", errors);
  if (!args.includes("--dry-run")) {
    for (const [p, body] of [
      [cfg.outputs.p3Allowed, JSON.stringify(allowed, null, 2) + "\n"],
      [cfg.outputs.p3Css, css],
    ]) {
      fs.mkdirSync(path.dirname(abs(p)), { recursive: true });
      fs.writeFileSync(abs(p), body, "utf8");
    }
  }
  return result("P3 build-tokens", [], {
    counts: {
      colors: Object.keys(allowed.colors).length,
      spacing: allowed.spacing.length,
      radius: Object.keys(allowed.radius).length,
      textStyles: Object.keys(allowed.textStyles).length,
    },
    wrote: args.includes("--dry-run") ? [] : [cfg.outputs.p3Allowed, cfg.outputs.p3Css],
  });
});
