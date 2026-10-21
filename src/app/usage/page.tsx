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
// [기획] 사용량 확인 화면: 01에서 가입 형태를 고른 뒤 보인다. 샘플 사용량을 보여 주고 추천에 필요한 선택(목적·약정)을 받는다.
// [기획] 약정은 미리 골라 두지 않는다. 고객이 직접 골라야 한다.
export default function UsagePage() {
  const router = useRouter();
  const { selection, hydrated } = useSelection();
  const customerType = selection.customerType;

  // 01을 거치지 않고 들어오면 01로 보낸다
  // [기획] 주소를 직접 입력해 들어오는 등 가입 형태를 고르지 않은 상태면, 자동으로 가입 형태 선택(01)으로 돌려보낸다.
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

  // [기획] 추천 보기 버튼 동작: 필요한 선택을 모두 했을 때만 추천 결과 화면으로 이동한다.
  const goNext = () => {
    if (!isUsageStepComplete(selection)) return;
    router.push("/plans");
  };

  return (
    <>
      {/* [기획] 상단 헤더: 뒤로가기를 누르면 가입 형태 선택(01)으로 돌아간다. */}
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        {/* [기획] 사용량 영역: 가입 형태별 샘플 월 데이터 사용량(GB)을 보여 준다. 요금제 변경 고객에게는 지금 요금제명과 지금 내는 금액도 함께 보인다. */}
        <dl className="flex w-full flex-col">
          <ListRow label="최근 월 데이터 사용량 (샘플)" value={formatGb(sampleUsageOf(customerType))} />
          {isChange && nowPlan ? <ListRow label="지금 요금제" value={nowPlan.name} /> : null}
          {isChange && nowAmount !== null ? (
            <ListRow label="지금 둘째 달부터 청구 금액" value={formatWon(nowAmount)} />
          ) : null}
        </dl>

        {/* [기획] 목적 선택(데이터 늘리기 / 요금 낮추기): 요금제 변경 고객에게만 보이고, 다른 가입 형태에는 숨겨진다. */}
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

        {/* [기획] 약정 선택(12개월 / 24개월 / 약정 안 함): 모든 가입 형태에 보인다. 한 번에 하나만 고를 수 있다. */}
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

      {/* [기획] 하단 추천 보기 버튼: 요금제 변경 고객은 목적과 약정, 다른 고객은 약정을 골라야 켜진다. */}
      <BottomCTA>
        <Button variant="primary" size="xl" fullWidth disabled={!complete} onClick={goNext}>
          추천 보기
        </Button>
      </BottomCTA>
    </>
  );
}
