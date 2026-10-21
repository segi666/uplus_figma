"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CardPrice } from "@/components/CardPrice";
import { Header } from "@/components/Header";
import { ListRow } from "@/components/ListRow";
import { useSelection } from "@/components/useSelection";
import { findPlan } from "@/lib/data";
import { formatDataAmount, formatWon, priceBreakdown } from "@/lib/pricing";
import { isUsageStepComplete, selectPlan } from "@/lib/selection";

// 화면 04 요금제 상세 · 청구 금액 내역 본문
// states: 기본(change: 금액 줄 전부) · add 고객(결합 할인만, 위약금 · 첫 달 숨김)
//         · port · new 고객(결합 할인 · 위약금 · 첫 달 숨김) · 약정 안 함(약정 할인 0원)
//         · 이전 선택 없음(01로 보냄) · 없는 요금제 id(03으로 보냄) · 로딩 · 에러(해당 없음)
export function PlanDetail({ id }: { id: string }) {
  const router = useRouter();
  const { selection, hydrated } = useSelection();
  const ready = isUsageStepComplete(selection);
  const plan = findPlan(id);

  useEffect(() => {
    if (!hydrated) return;
    // 01~03을 거치지 않고 들어오면 01로 보낸다
    if (!ready) {
      router.replace("/");
      return;
    }
    // 없는 요금제 id는 03으로 보낸다
    if (!plan) {
      router.replace("/plans");
      return;
    }
    // 들어온 요금제를 기억한다 (05에서 쓴다)
    if (selection.planId !== plan.id) selectPlan(plan.id);
  }, [hydrated, ready, plan, selection.planId, router]);

  const header = <Header type="default" title="요금제 상세" backHref="/plans" />;

  if (!hydrated || !ready || !plan || !selection.customerType || selection.contractMonths === null) {
    return header;
  }

  const customerType = selection.customerType;
  const showBundle = customerType === "change" || customerType === "add";
  const showFirstMonth = customerType === "change";
  const price = priceBreakdown(plan, { customerType, contractMonths: selection.contractMonths });

  const goApply = () => {
    selectPlan(plan.id);
    router.push("/apply");
  };

  return (
    <>
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-24 pt-24 pb-24">
        <CardPrice label={plan.name} amount={formatWon(price.monthlyFee)} sub="할인 전 월 요금" />

        <section className="flex w-full flex-col gap-8">
          <h2 className="text-subtitle-bold text-text-primary">요금제 정보</h2>
          <dl className="flex w-full flex-col">
            <ListRow label="데이터량" value={formatDataAmount(plan.dataAmount)} />
            <ListRow label="데이터 다 쓴 뒤 속도" value={plan.throttleSpeed} />
            <ListRow label="통화" value={plan.voice} />
            <ListRow label="문자" value={plan.sms} />
            <ListRow label="테더링·공유 데이터" value={plan.tethering} />
          </dl>
        </section>

        <section className="flex w-full flex-col gap-8">
          <h2 className="text-subtitle-bold text-text-primary">포함 혜택</h2>
          <dl className="flex w-full flex-col">
            {plan.benefits.map((b) => (
              <ListRow key={b.id} type="check" value={b.name} />
            ))}
          </dl>
        </section>

        <section className="flex w-full flex-col gap-8">
          <h2 className="text-subtitle-bold text-text-primary">청구 금액 내역</h2>
          <dl className="flex w-full flex-col">
            <ListRow label="월 요금" value={formatWon(price.monthlyFee)} />
            <ListRow label="− 약정 할인" value={formatWon(price.contractDiscount)} />
            {showBundle ? <ListRow label="− 결합 할인" value={formatWon(price.bundleDiscount)} /> : null}
            <ListRow label="= 둘째 달부터 청구 금액" value={formatWon(price.monthlyAmount)} />
            {showFirstMonth ? (
              <>
                <ListRow label="+ 위약금" value={formatWon(price.earlyTerminationFee)} />
                <ListRow label="= 첫 달 청구 금액" value={formatWon(price.firstMonthAmount)} />
              </>
            ) : null}
          </dl>
        </section>
      </main>

      {/* 요금제 상세 하단 구성 (design.md 3.4): 세로 버튼 2개, 위 16 · 좌우 24 · 사이 8 · 아래 32 = 높이 160 */}
      <div className="sticky bottom-0 flex w-full shrink-0 flex-col gap-8 bg-bg-surface px-24 pt-16 pb-32">
        <Button variant="primary" size="xl" fullWidth onClick={goApply}>
          이 요금제로 신청
        </Button>
        <Button variant="secondary" size="xl" fullWidth onClick={() => router.push("/plans")}>
          다른 요금제 보기
        </Button>
      </div>
    </>
  );
}
