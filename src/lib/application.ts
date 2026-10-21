// 신청 (DOMAIN 5장 Application, R15~R17, F5 · F6).
// 실험 브랜치(experiment/supabase-*): 신청은 브라우저에 저장하지 않고 subscriptionApi.ts로 서버에 보낸다.
// 이 파일은 신청 객체 만들기와 입력 검증만 맡는다.
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다 (G5가 node로 바로 실행).

import { findPlan } from "./data";
import { priceBreakdown } from "./pricing";
import type { ContractMonths, CustomerType, Purpose } from "./selection";

// Application 필드 11개. 이 밖의 키는 만들지 않는다.
export type Application = {
  id: string;
  customerType: CustomerType;
  purpose: Purpose | null; // change만, 나머지는 null
  contractMonths: ContractMonths;
  planId: string;
  firstMonthAmount: number; // 첫 달 청구 금액 (신청 시점 값)
  monthlyAmount: number; // 둘째 달부터 청구 금액 (신청 시점 값)
  name: string;
  email: string;
  privacyConsent: boolean;
  createdAt: string; // 신청 시각 (ISO 문자열)
};

export type ApplicationInput = {
  customerType: CustomerType;
  purpose: Purpose | null;
  contractMonths: ContractMonths;
  planId: string;
  name: string;
  email: string;
  privacyConsent: boolean;
};

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 신청 시점 금액을 pricing.ts로 계산해 Application 하나를 만든다. 저장은 하지 않는다.
// (서버에 보낼 때 id · createdAt은 서버가 새로 만든다)
export function buildApplication(input: ApplicationInput): Application {
  const plan = findPlan(input.planId);
  if (!plan) throw new Error("unknown planId");
  const price = priceBreakdown(plan, { customerType: input.customerType, contractMonths: input.contractMonths });
  return {
    id: newId(),
    customerType: input.customerType,
    purpose: input.customerType === "change" ? input.purpose ?? null : null,
    contractMonths: input.contractMonths,
    planId: plan.id,
    firstMonthAmount: price.firstMonthAmount,
    monthlyAmount: price.monthlyAmount,
    name: input.name.trim(),
    email: input.email.trim(),
    privacyConsent: input.privacyConsent === true,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 입력 검증 (DOMAIN 3장 예외 · decisions.md 문구)
// ---------------------------------------------------------------------------

export type ApplicantFields = { name: string; email: string; privacyConsent: boolean };
export type ApplicantErrors = { name?: string; email?: string; privacyConsent?: string };

export const applicantMessages = {
  nameEmpty: "이름을 입력해 주세요.",
  emailEmpty: "이메일을 입력해 주세요.",
  emailInvalid: "이메일 형식이 올바르지 않아요.",
  consentMissing: "개인정보 수집·이용에 동의해 주세요.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validateApplicant(f: ApplicantFields): ApplicantErrors {
  const errors: ApplicantErrors = {};
  if (f.name.trim() === "") errors.name = applicantMessages.nameEmpty;
  if (f.email.trim() === "") errors.email = applicantMessages.emailEmpty;
  else if (!isValidEmail(f.email)) errors.email = applicantMessages.emailInvalid;
  if (!f.privacyConsent) errors.privacyConsent = applicantMessages.consentMissing;
  return errors;
}

export function hasApplicantErrors(e: ApplicantErrors): boolean {
  return Boolean(e.name || e.email || e.privacyConsent);
}
