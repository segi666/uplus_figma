// 샘플 데이터 (DOMAIN 5장, C2). 요금제명 · 혜택명 · 금액은 모두 자리표시자다. 실제 상품과 무관하다.
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다 (G4가 node로 바로 실행).

import type { ContractMonths, CustomerType } from "./selection";

export type PlanBenefit = {
  id: string;
  name: string; // "혜택 A" 형식
};

export type Plan = {
  id: string;
  name: string; // "요금제 A" 형식
  monthlyFee: number; // 월 요금 (할인 전, 원)
  dataAmount: number | "unlimited"; // GB 또는 무제한
  throttleSpeed: string; // 데이터 다 쓴 뒤 속도
  voice: string; // 통화
  sms: string; // 문자
  benefits: PlanBenefit[];
  tethering: string; // 테더링·공유 데이터
};

export type SampleUsage = {
  customerType: CustomerType;
  monthlyDataUsage: number; // 월 데이터 사용량 (GB)
};

export type CurrentLine = {
  currentPlanId: string; // 지금 요금제 (요금제 변경)
  earlyTerminationFee: number; // 위약금 (요금제 변경)
  bundleDiscount: number; // 결합 할인 금액 (요금제 변경 · 회선 추가)
  contractMonths: ContractMonths; // 지금 요금제의 약정 (지금 둘째 달부터 청구 금액 계산용 샘플 값)
};

// 요금제 샘플. 데이터가 가장 많은 요금제도 100GB라서 "사용량 감당 요금제 없음"을 시험할 수 있다.
export const plans: Plan[] = [
  {
    id: "plan-a",
    name: "요금제 A",
    monthlyFee: 29990,
    dataAmount: 5,
    throttleSpeed: "최대 400Kbps",
    voice: "집·이동전화 무제한",
    sms: "기본 제공",
    benefits: [{ id: "benefit-a", name: "혜택 A" }],
    tethering: "데이터량 안에서 사용",
  },
  {
    id: "plan-b",
    name: "요금제 B",
    monthlyFee: 42000,
    dataAmount: 15,
    throttleSpeed: "최대 1Mbps",
    voice: "집·이동전화 무제한",
    sms: "기본 제공",
    benefits: [
      { id: "benefit-a", name: "혜택 A" },
      { id: "benefit-b", name: "혜택 B" },
    ],
    tethering: "데이터량 안에서 사용",
  },
  {
    id: "plan-c",
    name: "요금제 C",
    monthlyFee: 55000,
    dataAmount: 40,
    throttleSpeed: "최대 3Mbps",
    voice: "집·이동전화 무제한",
    sms: "기본 제공",
    benefits: [
      { id: "benefit-b", name: "혜택 B" },
      { id: "benefit-c", name: "혜택 C" },
    ],
    tethering: "최대 20GB",
  },
  {
    id: "plan-d",
    name: "요금제 D",
    monthlyFee: 68000,
    dataAmount: 100,
    throttleSpeed: "최대 5Mbps",
    voice: "집·이동전화 무제한",
    sms: "기본 제공",
    benefits: [
      { id: "benefit-c", name: "혜택 C" },
      { id: "benefit-d", name: "혜택 D" },
    ],
    tethering: "최대 50GB",
  },
];

// 고객 유형별 샘플 사용량 하나씩 (DOMAIN 5장 [가정]).
// - change 12GB: 지금 요금제 B(15GB)가 사용량을 감당하는 가장 저렴한 요금제 → "요금 낮추기"는 빈 상태, "데이터 늘리기"는 정상 추천
// - port 20GB · add 3GB: 정상 추천
// - new 130GB: 어떤 요금제도 감당하지 못함 → "사용량 감당 요금제 없음" 빈 상태
export const sampleUsages: SampleUsage[] = [
  { customerType: "change", monthlyDataUsage: 12 },
  { customerType: "port", monthlyDataUsage: 20 },
  { customerType: "new", monthlyDataUsage: 130 },
  { customerType: "add", monthlyDataUsage: 3 },
];

// 지금 회선 샘플 (요금제 변경 · 회선 추가 고객용)
export const currentLine: CurrentLine = {
  currentPlanId: "plan-b",
  earlyTerminationFee: 88000,
  bundleDiscount: 5500,
  contractMonths: 24,
};

export function findPlan(id: string | null | undefined): Plan | null {
  if (!id) return null;
  return plans.find((p) => p.id === id) ?? null;
}

export function sampleUsageOf(customerType: CustomerType): number {
  const found = sampleUsages.find((u) => u.customerType === customerType);
  return found ? found.monthlyDataUsage : 0;
}

export function currentPlan(): Plan | null {
  return findPlan(currentLine.currentPlanId);
}
