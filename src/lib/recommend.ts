// 추천과 정렬 (DOMAIN 4장 R8~R14, 3장 예외 상황, decisions.md D8 · D9).
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다 (G4가 node로 바로 실행).
//
// R8. 정렬과 금액 비교의 기준은 둘째 달부터 청구 금액(monthlyAmount) 하나다.
// R9. 추천 대상은 데이터량이 샘플 사용량 이상인 요금제다.
// R10. 데이터 늘리기(change): R9 대상 중 지금 요금제보다 데이터량이 많은 요금제.
// R11. 요금 낮추기(change): R9 대상 중 둘째 달부터 청구 금액이 지금보다 낮은 요금제.
// R12. port · new · add: R9 대상 전부.
// R14. 고객에게 보이지 않는 기준으로 순서를 바꾸지 않는다. 정렬은 monthlyAmount 오름차순뿐이다.

import { currentPlan, plans, sampleUsageOf } from "./data";
import type { Plan } from "./data";
import { currentMonthlyAmount, firstMonthAmountOf, formatGb, monthlyAmountOf } from "./pricing";
import type { ContractMonths, CustomerType, Purpose } from "./selection";

export type RecommendInput = {
  customerType: CustomerType;
  contractMonths: ContractMonths;
  purpose: Purpose | null;
};

export type RecommendItem = {
  planId: string;
  monthlyAmount: number; // 둘째 달부터 청구 금액 (원)
  firstMonthAmount: number; // 첫 달 청구 금액 (원)
};

export type RecommendResult = {
  basisText: string;
  sortText: string;
  notice: string | null;
  items: RecommendItem[];
};

// decisions.md T10
export const SORT_TEXT = "둘째 달부터 청구 금액이 낮은 순으로 보여 드려요";
// decisions.md T11
export const NOTICE_NO_CHEAPER = "지금보다 저렴한 요금제가 없어요. 사용량에 맞는 요금제 중 가장 저렴한 요금제를 보여 드려요.";

// decisions.md T9
export function basisTextOf(usageGb: number): string {
  return `샘플 사용량 ${formatGb(usageGb)} 기준으로 골랐어요`;
}

// decisions.md T12
export function noticeNoCoverOf(usageGb: number): string {
  return `사용량 ${formatGb(usageGb)}를 감당하는 요금제가 없어요. 데이터가 가장 많은 요금제를 보여 드려요.`;
}

// 무제한은 어떤 사용량보다도 크다고 본다
function dataGbOf(plan: Plan): number {
  return plan.dataAmount === "unlimited" ? Number.POSITIVE_INFINITY : plan.dataAmount;
}

function toItem(plan: Plan, input: RecommendInput): RecommendItem {
  const priceInput = { customerType: input.customerType, contractMonths: input.contractMonths };
  return {
    planId: plan.id,
    monthlyAmount: monthlyAmountOf(plan, priceInput),
    firstMonthAmount: firstMonthAmountOf(plan, priceInput),
  };
}

// R8 · R14: 둘째 달부터 청구 금액이 낮은 순. 다른 기준은 쓰지 않는다.
function byMonthlyAmount(items: RecommendItem[]): RecommendItem[] {
  return items.slice().sort((a, b) => a.monthlyAmount - b.monthlyAmount);
}

// 데이터량이 가장 큰 요금제 1개 (D8). 같은 데이터량이면 앞쪽 요금제.
function largestDataPlan(): Plan {
  let best = plans[0];
  for (const p of plans) if (dataGbOf(p) > dataGbOf(best)) best = p;
  return best;
}

export function recommend(input: RecommendInput): RecommendResult {
  const usageGb = sampleUsageOf(input.customerType);
  const basisText = basisTextOf(usageGb);

  // R9
  const covering = plans.filter((p) => dataGbOf(p) >= usageGb);

  // 예외: 샘플 사용량을 감당하는 요금제가 없음 → 데이터량이 가장 큰 요금제 1개 (D8, T12)
  if (covering.length === 0) {
    return {
      basisText,
      sortText: SORT_TEXT,
      notice: noticeNoCoverOf(usageGb),
      items: [toItem(largestDataPlan(), input)],
    };
  }

  const coveringItems = byMonthlyAmount(covering.map((p) => toItem(p, input)));

  if (input.customerType === "change" && input.purpose === "more-data") {
    // R10
    const now = currentPlan();
    const nowGb = now ? dataGbOf(now) : 0;
    const moreIds = covering.filter((p) => dataGbOf(p) > nowGb).map((p) => p.id);
    const moreItems = coveringItems.filter((it) => moreIds.includes(it.planId));
    // 지금보다 데이터가 많은 요금제가 없을 때의 문구는 정해지지 않았다. 비우지 않고 R9 대상을 그대로 보여 준다.
    return { basisText, sortText: SORT_TEXT, notice: null, items: moreItems.length > 0 ? moreItems : coveringItems };
  }

  if (input.customerType === "change" && input.purpose === "lower-fee") {
    // R11
    const nowAmount = currentMonthlyAmount();
    const limit = nowAmount === null ? Number.POSITIVE_INFINITY : nowAmount;
    const cheaper = coveringItems.filter((it) => it.monthlyAmount < limit);
    if (cheaper.length === 0) {
      // 예외: 지금보다 저렴한 요금제가 없음 → 사용량에 맞는 요금제 중 가장 저렴한 1개 (D9, T11)
      return { basisText, sortText: SORT_TEXT, notice: NOTICE_NO_CHEAPER, items: coveringItems.slice(0, 1) };
    }
    return { basisText, sortText: SORT_TEXT, notice: null, items: cheaper };
  }

  // R12 (port · new · add), 목적이 없는 change도 R9 대상 전부
  return { basisText, sortText: SORT_TEXT, notice: null, items: coveringItems };
}
