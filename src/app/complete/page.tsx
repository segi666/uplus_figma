"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BottomCTA } from "@/components/BottomCTA";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { IconDoneMark } from "@/components/icons";
import { ListRow } from "@/components/ListRow";
import { parseApplication, readApplicationRaw, subscribeApplication } from "@/lib/application";
import { findPlan } from "@/lib/data";
import { formatWon } from "@/lib/pricing";
import { clearSelection, contractLabel } from "@/lib/selection";

// 화면 06 신청 완료 (route: /complete)
// states: 기본 · change 고객(첫 달 청구 금액 줄) · 새로고침(저장된 신청 그대로)
//         · 저장된 신청 없음(01로 보냄)
// 금액은 저장 시점 값(F6)을 그대로 보여 주고 다시 계산하지 않는다.
const serverSnapshot = () => null;
const subscribeNoop = () => () => {};
const clientTrue = () => true;
const serverFalse = () => false;

export default function CompletePage() {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribeApplication, readApplicationRaw, serverSnapshot);
  const hydrated = useSyncExternalStore(subscribeNoop, clientTrue, serverFalse);
  const app = useMemo(() => parseApplication(raw), [raw]);
  const plan = app ? findPlan(app.planId) : null;
  const ready = app !== null && plan !== null;

  // 저장된 신청 없이 들어오면 01로 보낸다
  useEffect(() => {
    if (hydrated && !ready) router.replace("/");
  }, [hydrated, ready, router]);

  const header = <Header type="root" title="신청 완료" />;

  if (!hydrated || !app || !plan) {
    return header;
  }

  const isChange = app.customerType === "change";

  // 처음으로: 화면 사이 선택값만 비운다. 저장된 신청은 그대로 둔다.
  const goHome = () => {
    clearSelection();
    router.push("/");
  };

  return (
    <>
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        <section className="flex w-full flex-col items-center gap-16 text-center">
          <IconDoneMark />
          <div className="flex w-full flex-col gap-8">
            <h2 className="text-heading-h3 text-text-primary">신청이 저장됐어요</h2>
            <p className="text-body-medium text-text-secondary">아래 내용으로 신청을 받았어요.</p>
          </div>
        </section>

        <section className="flex w-full flex-col gap-8">
          <h2 className="text-subtitle-bold text-text-primary">신청 내역</h2>
          <dl className="flex w-full flex-col">
            <ListRow label="요금제" value={plan.name} />
            <ListRow label="약정" value={contractLabel(app.contractMonths)} />
            {isChange ? <ListRow label="첫 달 청구 금액" value={formatWon(app.firstMonthAmount)} /> : null}
            <ListRow label="둘째 달부터 청구 금액" value={formatWon(app.monthlyAmount)} />
            <ListRow label="이름" value={app.name} />
          </dl>
        </section>

        <p className="w-full text-body-small-medium text-text-tertiary">
          프로토타입이라 실제 요금제 변경·개통이나 이메일 발송은 되지 않아요.
        </p>
      </main>

      <BottomCTA>
        <Button variant="primary" size="xl" fullWidth onClick={goHome}>
          처음으로
        </Button>
      </BottomCTA>
    </>
  );
}
