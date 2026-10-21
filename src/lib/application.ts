// 신청 (DOMAIN 5장 Application, R15~R17, F5 · F6).
// 저장 위치는 이 브라우저의 localStorage뿐이다. 서버로 보내지 않는다 (C1).
// 새로고침해도 남는다 (US5).
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다 (G5가 node로 바로 실행).

import { findPlan } from "./data";
import { priceBreakdown } from "./pricing";
import { isContractMonths, isCustomerType, isPurpose } from "./selection";
import type { ContractMonths, CustomerType, Purpose } from "./selection";

// Application 필드 11개. 이 밖의 키는 만들지도 저장하지도 않는다.
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

// ---------------------------------------------------------------------------
// 브라우저 저장 · 불러오기 (localStorage)
// ---------------------------------------------------------------------------

const KEY = "plan-reco.application";
const EVENT = "plan-reco:application-change";

export type SaveResult = { ok: true } | { ok: false; reason: "unavailable" | "write-failed" | "no-consent" };

// 저장소를 쓸 수 없거나 쓰기에서 예외가 나면 ok:false로 돌려 화면이 처리하게 한다.
export function saveApplication(app: Application): SaveResult {
  // R17: 동의 없이 저장하지 않는다
  if (app.privacyConsent !== true) return { ok: false, reason: "no-consent" };
  let s: Storage | null = null;
  try {
    s = typeof window === "undefined" ? null : window.localStorage;
  } catch {
    s = null;
  }
  if (!s) return { ok: false, reason: "unavailable" };
  try {
    s.setItem(KEY, JSON.stringify(pickApplication(app)));
  } catch {
    return { ok: false, reason: "write-failed" };
  }
  window.dispatchEvent(new Event(EVENT));
  return { ok: true };
}

// 11개 필드만 골라 새 객체로 만든다 (다른 키가 섞여 저장되지 않게).
function pickApplication(a: Application): Application {
  return {
    id: a.id,
    customerType: a.customerType,
    purpose: a.purpose,
    contractMonths: a.contractMonths,
    planId: a.planId,
    firstMonthAmount: a.firstMonthAmount,
    monthlyAmount: a.monthlyAmount,
    name: a.name,
    email: a.email,
    privacyConsent: a.privacyConsent,
    createdAt: a.createdAt,
  };
}

// 저장된 원문 문자열. useSyncExternalStore의 snapshot으로 쓴다.
export function readApplicationRaw(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseApplication(raw: string | null): Application | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!isCustomerType(o.customerType) || !isContractMonths(o.contractMonths)) return null;
    if (typeof o.id !== "string" || typeof o.planId !== "string" || !findPlan(o.planId)) return null;
    if (typeof o.firstMonthAmount !== "number" || typeof o.monthlyAmount !== "number") return null;
    if (typeof o.name !== "string" || typeof o.email !== "string" || o.privacyConsent !== true) return null;
    if (typeof o.createdAt !== "string") return null;
    return pickApplication({
      id: o.id,
      customerType: o.customerType,
      purpose: o.customerType === "change" && isPurpose(o.purpose) ? o.purpose : null,
      contractMonths: o.contractMonths,
      planId: o.planId,
      firstMonthAmount: o.firstMonthAmount,
      monthlyAmount: o.monthlyAmount,
      name: o.name,
      email: o.email,
      privacyConsent: true,
      createdAt: o.createdAt,
    });
  } catch {
    return null;
  }
}

export function loadApplication(): Application | null {
  return parseApplication(readApplicationRaw());
}

export function subscribeApplication(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
