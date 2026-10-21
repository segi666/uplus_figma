// 화면 사이 선택값 유지 (F7). 브라우저 저장소(sessionStorage)에만 둔다.
// JSX 없음 · 지울 수 있는 TypeScript 문법만 쓴다.

export type CustomerType = "change" | "port" | "new" | "add";
export type Purpose = "more-data" | "lower-fee";
export type ContractMonths = 12 | 24 | 0;

export type Selection = {
  customerType: CustomerType | null;
  purpose: Purpose | null;
  contractMonths: ContractMonths | null;
};

export const customerTypes: CustomerType[] = ["change", "port", "new", "add"];
export const purposes: Purpose[] = ["more-data", "lower-fee"];
export const contractMonthsList: ContractMonths[] = [12, 24, 0];

// 화면 01 선택지 문구 (decisions.md T3)
export const customerTypeOptions: { value: CustomerType; title: string; desc: string }[] = [
  { value: "change", title: "요금제 변경", desc: "지금 쓰는 번호의 요금제를 바꿔요" },
  { value: "port", title: "번호이동", desc: "다른 통신사에서 번호 그대로 옮겨 와요" },
  { value: "new", title: "완전 신규", desc: "새 번호로 처음 가입해요" },
  { value: "add", title: "회선 추가", desc: "지금 쓰는 회선에 한 회선을 더해요" },
];

// 화면 02 목적 선택지 문구 (change만, decisions.md T6)
export const purposeOptions: { value: Purpose; title: string; desc: string }[] = [
  { value: "more-data", title: "데이터 늘리기", desc: "데이터가 모자라요" },
  { value: "lower-fee", title: "요금 낮추기", desc: "요금이 부담돼요" },
];

// 화면 02 약정 선택지 문구 (decisions.md T7)
export const contractOptions: { value: ContractMonths; title: string; desc: string }[] = [
  { value: 12, title: "12개월", desc: "월 요금 25% 할인" },
  { value: 24, title: "24개월", desc: "월 요금 25% 할인" },
  { value: 0, title: "약정 안 함", desc: "할인 없음" },
];

export function contractLabel(months: ContractMonths): string {
  const found = contractOptions.find((o) => o.value === months);
  return found ? found.title : "";
}

// 02에서 필요한 선택을 모두 했는가: change는 목적 · 약정 둘 다, 나머지는 약정만
export function isUsageStepComplete(s: Selection): boolean {
  if (!s.customerType || s.contractMonths === null) return false;
  return s.customerType === "change" ? s.purpose !== null : true;
}

export const emptySelection: Selection = { customerType: null, purpose: null, contractMonths: null };

const KEY = "plan-reco.selection";
const EVENT = "plan-reco:selection-change";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function isCustomerType(v: unknown): v is CustomerType {
  return typeof v === "string" && (customerTypes as string[]).includes(v);
}

export function isPurpose(v: unknown): v is Purpose {
  return typeof v === "string" && (purposes as string[]).includes(v);
}

export function isContractMonths(v: unknown): v is ContractMonths {
  return typeof v === "number" && (contractMonthsList as number[]).includes(v);
}

// 저장된 원문 문자열. useSyncExternalStore의 snapshot으로 쓴다 (문자열이라 비교가 안정적).
export function readSelectionRaw(): string | null {
  try {
    return storage()?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export function parseSelection(raw: string | null): Selection {
  if (!raw) return emptySelection;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const customerType = isCustomerType(o.customerType) ? o.customerType : null;
    return {
      customerType,
      purpose: customerType === "change" && isPurpose(o.purpose) ? o.purpose : null,
      contractMonths: isContractMonths(o.contractMonths) ? o.contractMonths : null,
    };
  } catch {
    return emptySelection;
  }
}

export function loadSelection(): Selection {
  return parseSelection(readSelectionRaw());
}

export function saveSelection(next: Selection): boolean {
  let ok = false;
  try {
    const s = storage();
    if (s) {
      s.setItem(KEY, JSON.stringify(next));
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
  return ok;
}

// 고객 유형을 고른다. 유형이 바뀌면 목적은 비운다 (목적은 change에만 있다).
export function selectCustomerType(type: CustomerType): Selection {
  const prev = loadSelection();
  const next: Selection =
    prev.customerType === type ? { ...prev, customerType: type } : { ...prev, customerType: type, purpose: null };
  saveSelection(next);
  return next;
}

export function selectPurpose(purpose: Purpose | null): Selection {
  const next: Selection = { ...loadSelection(), purpose };
  saveSelection(next);
  return next;
}

export function selectContractMonths(contractMonths: ContractMonths | null): Selection {
  const next: Selection = { ...loadSelection(), contractMonths };
  saveSelection(next);
  return next;
}

export function clearSelection(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // 저장소를 쓸 수 없으면 지울 것도 없다.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function subscribeSelection(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
