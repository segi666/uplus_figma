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
// [기획] 신청 완료 화면: 05에서 신청이 저장되면 보인다. 저장된 신청 내용을 다시 보여 주며, 새로고침해도 그대로 남아 있다.
// [기획] 금액은 신청한 순간의 값을 그대로 보여 준다. 나중에 샘플 요금이 바뀌어도 여기 금액은 바뀌지 않는다.
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
  // [기획] 저장된 신청이 없는데 이 화면 주소로 들어오면 가입 형태 선택(01)으로 돌려보낸다.
  useEffect(() => {
    if (hydrated && !ready) router.replace("/");
  }, [hydrated, ready, router]);

  const header = <Header type="root" title="신청 완료" />;

  if (!hydrated || !app || !plan) {
    return header;
  }

  const isChange = app.customerType === "change";

  // 처음으로: 화면 사이 선택값만 비운다. 저장된 신청은 그대로 둔다.
  // [기획] 처음으로 버튼 동작: 앞에서 고른 내용(가입 형태·약정 등)을 비우고 첫 화면(01)으로 돌아간다. 저장된 신청은 지우지 않는다.
  const goHome = () => {
    clearSelection();
    router.push("/");
  };

  return (
    <>
      {/* [기획] 상단 헤더: 신청이 끝난 화면이라 뒤로가기 없이 제목과 로고만 보인다. */}
      {header}

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        {/* [기획] 완료 표시: 분홍 원 안의 체크 표시와 신청이 저장됐다는 문구 */}
        <section className="flex w-full flex-col items-center gap-16 text-center">
          <IconDoneMark />
          <div className="flex w-full flex-col gap-8">
            <h2 className="text-heading-h3 text-text-primary">신청이 저장됐어요</h2>
            <p className="text-body-medium text-text-secondary">아래 내용으로 신청을 받았어요.</p>
          </div>
        </section>

        {/* [기획] 신청 내역: 요금제, 약정, 둘째 달부터 청구 금액, 이름. 첫 달 청구 금액은 요금제 변경 고객에게만 보인다. 이메일은 보여 주지 않는다. */}
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

        {/* [기획] 프로토타입 안내: 실제 요금제 변경이나 개통, 이메일 발송은 일어나지 않는다는 문구 */}
        <p className="w-full text-body-small-medium text-text-tertiary">
          프로토타입이라 실제 요금제 변경·개통이나 이메일 발송은 되지 않아요.
        </p>
      </main>

      {/* [기획] 하단 처음으로 버튼 */}
      <BottomCTA>
        <Button variant="primary" size="xl" fullWidth onClick={goHome}>
          처음으로
        </Button>
      </BottomCTA>
    </>
  );
}
