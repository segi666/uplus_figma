// G2 토큰 전수: src/ 전체에서 토큰 밖 값 0건 (H1 훅을 우회한 경우를 잡는다).
import { cfg, read, exists, walk, result, cli, checkTokens, loadAllowed } from "./lib.mjs";

export async function run() {
  const allowed = loadAllowed();
  if (!allowed) return result("G2 토큰", [{ file: cfg.outputs.p3Allowed, msg: "allowed.json 없음 → P3" }]);
  const files = walk("src", [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]).filter((f) => f !== cfg.outputs.p3Css);
  const v = files.flatMap((f) => checkTokens(read(f), f, allowed));

  const globals = "src/app/globals.css";
  if (exists(globals) && !/@import\s+["']\.\/tokens\.css["']/.test(read(globals))) {
    v.push({ file: globals, msg: 'globals.css에 @import "./tokens.css"; 가 없음' });
  }
  if (!exists(cfg.outputs.p3Css)) v.push({ file: cfg.outputs.p3Css, msg: "tokens.css 없음 → P3" });
  return result("G2 토큰", v, { files: files.length });
}

await cli(import.meta, run);
