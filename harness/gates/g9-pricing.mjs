// G9 금액 (R1~R7, N3): pricing.ts의 계산을 규칙에서 따로 계산한 값과 대조한다.
// recommend()와 buildApplication()이 내놓는 금액도 같은 값인지 본다.
import { cfg, exists, result, cli, importTs } from "./lib.mjs";

// 규칙에서 직접 계산한 기대값 (pricing.ts를 쓰지 않는다)
export function expected(plan, customerType, contractMonths, line) {
  const fee = plan.monthlyFee;
  const contractDiscount = contractMonths === 0 ? 0 : Math.floor((fee * 25) / 100); // R3 · R4 · R7
  const bundleDiscount = customerType === "change" || customerType === "add" ? line.bundleDiscount : 0; // R5
  const earlyTerminationFee = customerType === "change" ? line.earlyTerminationFee : 0; // R6
  const monthlyAmount = Math.floor(fee - bundleDiscount - contractDiscount); // R1 · R7
  const firstMonthAmount = monthlyAmount + earlyTerminationFee; // R2
  return { monthlyFee: fee, contractDiscount, bundleDiscount, monthlyAmount, earlyTerminationFee, firstMonthAmount };
}

const FIELDS = ["monthlyFee", "contractDiscount", "bundleDiscount", "monthlyAmount", "earlyTerminationFee", "firstMonthAmount"];

export async function run() {
  const v = [];
  for (const f of ["src/lib/data.ts", "src/lib/pricing.ts"]) if (!exists(f)) v.push({ file: f, msg: "없음 → P4" });
  if (v.length) return result("G9 금액", v);

  const { plans, currentLine } = await importTs("src/lib/data.ts");
  const pricing = await importTs("src/lib/pricing.ts");
  if (typeof pricing.priceBreakdown !== "function") return result("G9 금액", [{ file: "src/lib/pricing.ts", msg: "export function priceBreakdown 없음" }]);

  const { customerTypes, contractMonths, purposes } = cfg.contracts;
  let checked = 0;

  // 1) priceBreakdown: 요금제 × 유형 × 약정 전부
  for (const plan of plans) {
    for (const customerType of customerTypes) {
      for (const months of contractMonths) {
        const want = expected(plan, customerType, months, currentLine);
        const got = pricing.priceBreakdown(plan, { customerType, contractMonths: months });
        checked++;
        for (const k of FIELDS) {
          if (got?.[k] !== want[k]) v.push({ file: "src/lib/pricing.ts", msg: `${plan.id}/${customerType}/${months}: ${k} = ${got?.[k]} (규칙 계산 ${want[k]})` });
        }
      }
    }
  }

  // 2) recommend()의 금액
  if (exists("src/lib/recommend.ts")) {
    const { recommend } = await importTs("src/lib/recommend.ts");
    for (const customerType of customerTypes) {
      for (const months of contractMonths) {
        for (const purpose of purposes[customerType]) {
          const r = await recommend({ customerType, contractMonths: months, purpose });
          for (const it of r?.items ?? []) {
            const plan = plans.find((p) => p.id === it.planId);
            if (!plan) {
              v.push({ file: "src/lib/recommend.ts", msg: `없는 요금제 id: ${it.planId}` });
              continue;
            }
            const want = expected(plan, customerType, months, currentLine);
            for (const k of ["monthlyAmount", "firstMonthAmount"]) {
              if (it[k] !== want[k]) v.push({ file: "src/lib/recommend.ts", msg: `${customerType}/${months}/${purpose ?? "-"} ${it.planId}: ${k} = ${it[k]} (규칙 계산 ${want[k]})` });
            }
          }
        }
      }
    }
  }

  // 3) buildApplication()이 저장하는 금액 (F6: 신청 시점 값)
  if (exists("src/lib/application.ts")) {
    const { buildApplication } = await importTs("src/lib/application.ts");
    for (const customerType of customerTypes) {
      const plan = plans[0];
      const app = await buildApplication({
        customerType,
        purpose: purposes[customerType][0],
        contractMonths: 24,
        planId: plan.id,
        name: "홍길동",
        email: "user@example.com",
        privacyConsent: true,
      });
      const want = expected(plan, customerType, 24, currentLine);
      for (const k of ["monthlyAmount", "firstMonthAmount"]) {
        if (app?.[k] !== want[k]) v.push({ file: "src/lib/application.ts", msg: `${customerType}: 저장 ${k} = ${app?.[k]} (규칙 계산 ${want[k]})` });
      }
    }
  }

  // 4) 표기 (N3: 천 단위 쉼표 + "원")
  if (typeof pricing.formatWon !== "function") {
    v.push({ file: "src/lib/pricing.ts", msg: "export function formatWon 없음" });
  } else {
    for (const [n, want] of [[0, "0원"], [990, "990원"], [12345, "12,345원"], [1234567, "1,234,567원"]]) {
      const got = pricing.formatWon(n);
      if (got !== want) v.push({ file: "src/lib/pricing.ts", msg: `formatWon(${n}) = ${got} (기대 ${want})` });
    }
  }

  return result("G9 금액", v, { checked });
}

await cli(import.meta, run);
