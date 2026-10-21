// 금액 계산 (DOMAIN 4장 R1~R7)과 표기 (N3).
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다 (G4가 node로 바로 실행).
//
// R1. 둘째 달부터 청구 금액 = 월 요금 − 결합 할인 − 약정 할인
// R2. 첫 달 청구 금액 = 둘째 달부터 청구 금액 + 위약금
// R3. 약정 할인 = 원래 월 요금 × 25%. 결합 할인과 각각 원래 월 요금 기준으로 계산해서 뺀다
// R4. 약정 안 함(0)이면 약정 할인 0
// R5. 결합 할인은 change · add만
// R6. 위약금은 change만 (번호이동의 이전 통신사 위약금은 넣지 않음)
// R7. 원 단위 미만은 버린다

import { currentLine, currentPlan } from "./data";
import type { Plan } from "./data";
import type { ContractMonths, CustomerType } from "./selection";

export const CONTRACT_DISCOUNT_PERCENT = 25;

export type PriceInput = {
  customerType: CustomerType;
  contractMonths: ContractMonths;
};

export type PriceBreakdown = {
  monthlyFee: number; // 월 요금 (할인 전)
  contractDiscount: number; // 약정 할인
  bundleDiscount: number; // 결합 할인
  monthlyAmount: number; // 둘째 달부터 청구 금액
  earlyTerminationFee: number; // 위약금
  firstMonthAmount: number; // 첫 달 청구 금액
};

// R7: 원 단위 미만 버림
function toWon(n: number): number {
  return Math.floor(n);
}

// R3 · R4
export function contractDiscountOf(plan: Plan, contractMonths: ContractMonths): number {
  if (contractMonths === 0) return 0;
  return toWon((plan.monthlyFee * CONTRACT_DISCOUNT_PERCENT) / 100);
}

// R5
export function bundleDiscountOf(customerType: CustomerType): number {
  return customerType === "change" || customerType === "add" ? toWon(currentLine.bundleDiscount) : 0;
}

// R6
export function earlyTerminationFeeOf(customerType: CustomerType): number {
  return customerType === "change" ? toWon(currentLine.earlyTerminationFee) : 0;
}

export function priceBreakdown(plan: Plan, input: PriceInput): PriceBreakdown {
  const monthlyFee = toWon(plan.monthlyFee);
  const contractDiscount = contractDiscountOf(plan, input.contractMonths);
  const bundleDiscount = bundleDiscountOf(input.customerType);
  // R1: 두 할인은 각각 원래 월 요금 기준으로 구해 원래 월 요금에서 뺀다
  const monthlyAmount = Math.max(0, monthlyFee - bundleDiscount - contractDiscount);
  const earlyTerminationFee = earlyTerminationFeeOf(input.customerType);
  // R2
  const firstMonthAmount = monthlyAmount + earlyTerminationFee;
  return { monthlyFee, contractDiscount, bundleDiscount, monthlyAmount, earlyTerminationFee, firstMonthAmount };
}

// 둘째 달부터 청구 금액 (R1)
export function monthlyAmountOf(plan: Plan, input: PriceInput): number {
  return priceBreakdown(plan, input).monthlyAmount;
}

// 첫 달 청구 금액 (R2)
export function firstMonthAmountOf(plan: Plan, input: PriceInput): number {
  return priceBreakdown(plan, input).firstMonthAmount;
}

// 요금제 변경 고객의 지금 둘째 달부터 청구 금액. 지금 요금제 · 지금 약정 · 결합 할인으로 R1을 적용한다.
export function currentMonthlyAmount(): number | null {
  const plan = currentPlan();
  if (!plan) return null;
  return monthlyAmountOf(plan, { customerType: "change", contractMonths: currentLine.contractMonths });
}

// N3: 천 단위 쉼표 + "원". 원 단위 미만은 버린다 (R7).
export function formatWon(n: number): string {
  const won = toWon(n);
  const sign = won < 0 ? "-" : "";
  const digits = String(Math.abs(won)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${digits}원`;
}

export function formatGb(gb: number): string {
  return `${gb}GB`;
}

export function formatDataAmount(dataAmount: Plan["dataAmount"]): string {
  return dataAmount === "unlimited" ? "무제한" : formatGb(dataAmount);
}
