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
// [기획] 요금제 변경 고객의 카드에만 붙는 문구: 지금 내는 금액보다 적으면 적어요, 많으면 많아요, 같으면 같아요로 보여 준다.
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
// [기획] 추천 결과 화면: 02에서 추천 보기를 누르면 보인다. 샘플 사용량에 맞는 요금제를 둘째 달부터 청구 금액이 낮은 순으로 모두 보여 준다.
// [기획] 순서는 고객에게 보이는 금액으로만 정하고, 다른 숨은 기준은 쓰지 않는다.
export default function PlansPage() {
  const router = useRouter();
  const { selection, hydrated } = useSelection();
  const ready = isUsageStepComplete(selection);

  // 02를 거치지 않고 들어오면 01로 보낸다
  // [기획] 앞 화면에서 필요한 선택을 하지 않은 채 들어오면 가입 형태 선택(01)으로 돌려보낸다.
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

  // [기획] 자세히 보기 버튼 동작: 고른 요금제를 기억해 두고 그 요금제의 상세 화면으로 이동한다.
  const openDetail = (planId: string) => {
    selectPlan(planId);
    router.push(`/plans/${planId}`);
  };

  return (
    <>
      {/* [기획] 상단 헤더: 뒤로가기를 누르면 사용량 확인(02)으로 돌아간다. */}
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-32">
        {/* [기획] 추천 근거와 정렬 기준 문구: 샘플 사용량 ○GB 기준으로 골랐다는 것과 금액이 낮은 순이라는 것을 알려 준다. */}
        <section className="flex w-full flex-col gap-4">
          <p className="text-subtitle-bold text-text-primary">{basisText}</p>
          <p className="text-body-small-medium text-text-secondary">{sortText}</p>
        </section>

        {/* [기획] 빈 상태 안내: 지금보다 저렴한 요금제가 없거나 사용량을 감당하는 요금제가 없을 때만 보인다. 이때는 가장 가까운 요금제 1개만 아래에 보여 준다. */}
        {notice ? (
          <p role="status" className="w-full rounded-12 bg-bg-subtle px-16 py-12 text-body-small-medium text-text-primary">
            {notice}
          </p>
        ) : null}

        {/* [기획] 요금제 카드 목록: 카드마다 요금제명, 데이터량, 둘째 달부터 청구 금액, 자세히 보기 버튼이 있다. */}
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
