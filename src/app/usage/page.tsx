"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomCTA } from "@/components/BottomCTA";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { ListRow } from "@/components/ListRow";
import { OptionItem } from "@/components/OptionItem";
import { useSelection } from "@/components/useSelection";
import { currentPlan, sampleUsageOf } from "@/lib/data";
import { currentMonthlyAmount, formatGb, formatWon } from "@/lib/pricing";
import {
  contractOptions,
  isUsageStepComplete,
  purposeOptions,
  selectContractMonths,
  selectPurpose,
} from "@/lib/selection";

// 화면 02 사용량 확인 · 목적·약정 선택 (route: /usage)
// states: 기본(change) · 기본(port · new · add) · 선택 미완료(추천 보기 Disabled) · 선택 완료(추천 보기 Default)
//         · 약정 기본값(미리 고르지 않음) · 고객 유형 없음(01로 보냄)
export default function UsagePage() {
  const router = useRouter();
  const { selection, hydrated } = useSelection();
  const customerType = selection.customerType;

  // 01을 거치지 않고 들어오면 01로 보낸다
  useEffect(() => {
    if (hydrated && !customerType) router.replace("/");
  }, [hydrated, customerType, router]);

  const header = <Header type="default" title="사용량 확인" backHref="/" />;

  if (!hydrated || !customerType) {
    return header;
  }

  const isChange = customerType === "change";
  const nowPlan = isChange ? currentPlan() : null;
  const nowAmount = isChange ? currentMonthlyAmount() : null;
  const complete = isUsageStepComplete(selection);

  const goNext = () => {
    if (!isUsageStepComplete(selection)) return;
    router.push("/plans");
  };

  return (
    <>
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        <dl className="flex w-full flex-col">
          <ListRow label="최근 월 데이터 사용량 (샘플)" value={formatGb(sampleUsageOf(customerType))} />
          {isChange && nowPlan ? <ListRow label="지금 요금제" value={nowPlan.name} /> : null}
          {isChange && nowAmount !== null ? (
            <ListRow label="지금 둘째 달부터 청구 금액" value={formatWon(nowAmount)} />
          ) : null}
        </dl>

        {isChange ? (
          <section className="flex w-full flex-col gap-12">
            <h2 id="purpose-group" className="text-subtitle-bold text-text-primary">
              무엇이 필요하세요?
            </h2>
            <div role="radiogroup" aria-labelledby="purpose-group" className="flex w-full flex-col gap-12">
              {purposeOptions.map((o) => (
                <OptionItem
                  key={o.value}
                  title={o.title}
                  desc={o.desc}
                  selected={selection.purpose === o.value}
                  onSelect={() => selectPurpose(o.value)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex w-full flex-col gap-12">
          <h2 id="contract-group" className="text-subtitle-bold text-text-primary">
            약정을 골라 주세요
          </h2>
          <div role="radiogroup" aria-labelledby="contract-group" className="flex w-full flex-col gap-12">
            {contractOptions.map((o) => (
              <OptionItem
                key={o.value}
                title={o.title}
                desc={o.desc}
                selected={selection.contractMonths === o.value}
                onSelect={() => selectContractMonths(o.value)}
              />
            ))}
          </div>
        </section>
      </main>

      <BottomCTA>
        <Button variant="primary" size="xl" fullWidth disabled={!complete} onClick={goNext}>
          추천 보기
        </Button>
      </BottomCTA>
    </>
  );
}
