// 신청 저장 · 조회 서버 호출 (실험 브랜치 experiment/supabase-* 전용).
// 주의: PRD C1(서버 전송 금지)과 다르다. 사람이 이 브랜치에서만 승인했다.
// 공개 키로 부를 수 있는 RPC 함수 2개만 쓴다 (supabase/subscriptions.sql).
//   create_subscription → 신청 번호 문자열
//   get_subscription    → 0건 또는 1건 배열, 이름 · 이메일은 서버에서 가린 값
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다. 입력값을 어디에도 기록하지 않는다.

import type { Application } from "./application";
import { findPlan } from "./data";
import { isContractMonths, isCustomerType, isPurpose } from "./selection";
import type { ContractMonths, CustomerType, Purpose } from "./selection";

const TIMEOUT_MS = 15000;

// 완료 화면에 보여 줄 신청 1건. name · email은 서버가 가린 값 그대로다.
export type SubscriptionView = {
  id: string;
  customerType: CustomerType;
  purpose: Purpose | null;
  contractMonths: ContractMonths;
  planId: string;
  firstMonthAmount: number;
  monthlyAmount: number;
  name: string;
  email: string;
  privacyConsent: boolean;
  createdAt: string;
};

export type CreateResult = { ok: true; id: string } | { ok: false };
export type GetResult = { ok: true; subscription: SubscriptionView | null } | { ok: false };

// NEXT_PUBLIC_ 값은 빌드 때 문자 그대로 바뀌어 들어가므로 이 모양 그대로 읽는다.
function endpoint(fn: "create_subscription" | "get_subscription"): { url: string; key: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return null;
  return { url: `${base.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, key };
}

// 성공하면 응답 본문(JSON), 네트워크 오류 · 시간 초과 · 4xx · 5xx · 설정 없음이면 실패.
async function callRpc(
  fn: "create_subscription" | "get_subscription",
  body: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  const ep = endpoint(fn);
  if (!ep) return { ok: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: { apikey: ep.key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const data: unknown = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// 신청 1건 저장. 신청 시점 금액은 buildApplication()이 계산한 값을 그대로 보낸다.
// id · createdAt은 서버가 만든다.
export async function createSubscription(app: Application): Promise<CreateResult> {
  if (app.privacyConsent !== true) return { ok: false }; // R17
  const r = await callRpc("create_subscription", {
    customerType: app.customerType,
    purpose: app.customerType === "change" ? app.purpose : null,
    contractMonths: app.contractMonths,
    planId: app.planId,
    firstMonthAmount: app.firstMonthAmount,
    monthlyAmount: app.monthlyAmount,
    name: app.name,
    email: app.email,
    privacyConsent: app.privacyConsent,
  });
  if (!r.ok) return { ok: false };
  if (typeof r.data !== "string" || r.data.trim() === "") return { ok: false };
  return { ok: true, id: r.data };
}

function isWholeWon(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

// 서버 행 하나를 확인해 화면용 값으로 바꾼다. 모양이 틀리면 null.
function toView(row: unknown): SubscriptionView | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  if (typeof o.id !== "string" || !isCustomerType(o.customerType) || !isContractMonths(o.contractMonths)) return null;
  if (typeof o.planId !== "string" || !findPlan(o.planId)) return null;
  if (!isWholeWon(o.firstMonthAmount) || !isWholeWon(o.monthlyAmount)) return null;
  if (typeof o.name !== "string" || typeof o.email !== "string") return null;
  return {
    id: o.id,
    customerType: o.customerType,
    purpose: o.customerType === "change" && isPurpose(o.purpose) ? o.purpose : null,
    contractMonths: o.contractMonths,
    planId: o.planId,
    firstMonthAmount: o.firstMonthAmount,
    monthlyAmount: o.monthlyAmount,
    name: o.name,
    email: o.email,
    privacyConsent: o.privacyConsent === true,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
  };
}

// 번호로 1건 조회. 0건이거나 알 수 없는 모양이면 subscription: null (찾을 수 없음).
export async function getSubscription(id: string): Promise<GetResult> {
  const r = await callRpc("get_subscription", { p_id: id });
  if (!r.ok) return { ok: false };
  if (!Array.isArray(r.data)) return { ok: false };
  if (r.data.length === 0) return { ok: true, subscription: null };
  return { ok: true, subscription: toView(r.data[0]) };
}
