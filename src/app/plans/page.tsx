"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CardPlan } from "@/components/CardPlan";
import { Header } from "@/components/Header";
import { useSelection } from "@/components/useSelection";
import { findPlan } from "@/lib/data";
import { currentMonthlyAmount, formatDataAmount, formatWon } from "@/lib/pricing";
import { recommend } from "@/lib/recommend";
import { isUsageStepComplete, selectPlan } from "@/lib/selection";

// 지금 대비 둘째 달부터 청구 금액 차이 (change만, decisions.md T13)
function diffText(monthlyAmount: number, nowAmount: number): string {
  const diff = monthlyAmount - nowAmount;
  if (diff < 0) return `지금보다 월 ${formatWon(-diff)} 적어요`;
  if (diff > 0) return `지금보다 월 ${formatWon(diff)} 많아요`;
  return "지금과 같아요";
}

// 화면 03 추천 결과 (route: /plans)
// states: 기본(근거 · 정렬 문구 + 둘째 달부터 청구 금액 낮은 순 카드 전부) · change 고객(지금 대비 차이)
//         · 빈 상태: 지금보다 저렴한 요금제 없음 · 빈 상태: 사용량 감당 요금제 없음 · 표시 개수(전부)
//         · 선택 조건 없음(01로 보냄)
export default function PlansPage() {
  const router = useRouter();
  const { selection, hydrated } = useSelection();
  const ready = isUsageStepComplete(selection);

  // 02를 거치지 않고 들어오면 01로 보낸다
  useEffect(() => {
    if (hydrated && !ready) router.replace("/");
  }, [hydrated, ready, router]);

  const header = <Header type="default" title="추천 결과" backHref="/usage" />;

  if (!hydrated || !ready || !selection.customerType || selection.contractMonths === null) {
    return header;
  }

  const customerType = selection.customerType;
  const isChange = customerType === "change";
  const { basisText, sortText, notice, items } = recommend({
    customerType,
    contractMonths: selection.contractMonths,
    purpose: isChange ? selection.purpose : null,
  });
  const nowAmount = isChange ? currentMonthlyAmount() : null;

  const openDetail = (planId: string) => {
    selectPlan(planId);
    router.push(`/plans/${planId}`);
  };

  return (
    <>
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-32">
        <section className="flex w-full flex-col gap-4">
          <p className="text-subtitle-bold text-text-primary">{basisText}</p>
          <p className="text-body-small-medium text-text-secondary">{sortText}</p>
        </section>

        {notice ? (
          <p role="status" className="w-full rounded-12 bg-bg-subtle px-16 py-12 text-body-small-medium text-text-primary">
            {notice}
          </p>
        ) : null}

        <ul className="flex w-full flex-col gap-12">
          {items.map((item) => {
            const plan = findPlan(item.planId);
            if (!plan) return null;
            return (
              <li key={item.planId} className="w-full">
                <CardPlan
                  name={plan.name}
                  desc={formatDataAmount(plan.dataAmount)}
                  priceLabel="둘째 달부터 청구 금액"
                  price={formatWon(item.monthlyAmount)}
                  extra={
                    nowAmount !== null ? (
                      <p className="text-body-small-strong text-text-secondary">
                        {diffText(item.monthlyAmount, nowAmount)}
                      </p>
                    ) : null
                  }
                  action={
                    <Button variant="secondary" size="sm" onClick={() => openDetail(item.planId)}>
                      자세히 보기
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
