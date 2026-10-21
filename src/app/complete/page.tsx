"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BottomCTA } from "@/components/BottomCTA";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { IconDoneMark } from "@/components/icons";
import { ListRow } from "@/components/ListRow";
import { findPlan } from "@/lib/data";
import { formatWon } from "@/lib/pricing";
import { clearSelection, contractLabel } from "@/lib/selection";
import { getSubscription, type GetResult } from "@/lib/subscriptionApi";

// 화면 06 신청 완료 (route: /complete?id=<신청 번호>)
// states: 불러오는 중 · 기본(성공) · change 고객(첫 달 청구 금액 줄)
//         · 새로고침(주소의 번호로 다시 불러와 그대로 보임)
//         · 찾을 수 없음(번호 없음 · 0건, 안내 + 처음으로) · 불러오기 실패(다시 시도)
// 실험 브랜치: 신청은 주소의 번호로 서버(get_subscription)에서 1건만 불러온다. 브라우저 저장소는 읽지 않는다.
// 금액은 저장 시점 값(F6)을 그대로 보여 주고 다시 계산하지 않는다. 이름 · 이메일은 서버가 가린 값 그대로 쓴다.
// [기획] 신청 완료 화면: 05에서 신청이 저장되면 보인다. 주소에 담긴 신청 번호로 저장된 신청을 불러와 보여 주며, 새로고침해도 그대로 남아 있다.
// [기획] 금액은 신청한 순간의 값을 그대로 보여 준다. 나중에 샘플 요금이 바뀌어도 여기 금액은 바뀌지 않는다.

const header = <Header type="root" title="신청 완료" />;

// 처음으로: 화면 사이 선택값만 비운다.
// [기획] 처음으로 버튼 동작: 앞에서 고른 내용(가입 형태·약정 등)을 비우고 첫 화면(01)으로 돌아간다.
function HomeButton() {
  const router = useRouter();
  const goHome = () => {
    clearSelection();
    router.push("/");
  };
  return (
    <BottomCTA>
      <Button variant="primary" size="xl" fullWidth onClick={goHome}>
        처음으로
      </Button>
    </BottomCTA>
  );
}

// [기획] 프로토타입 안내: 실제 요금제 변경이나 개통, 이메일 발송은 일어나지 않는다는 문구
function PrototypeNotice() {
  return (
    <p className="w-full text-body-small-medium text-text-tertiary">
      프로토타입이라 실제 요금제 변경·개통이나 이메일 발송은 되지 않아요.
    </p>
  );
}

// [기획] 불러오는 중: 신청 내역을 서버에서 받아 오는 동안 보이는 안내
function LoadingView() {
  return (
    <>
      {header}
      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        <p role="status" className="w-full text-center text-body-medium text-text-secondary">
          신청 내역을 불러오고 있어요.
        </p>
        <PrototypeNotice />
      </main>
      <HomeButton />
    </>
  );
}

// useSearchParams는 Suspense 경계 안에서 쓴다 (빌드 때 미리 그리는 화면은 fallback으로 대신한다).
export default function CompletePage() {
  return (
    <Suspense fallback={<LoadingView />}>
      <CompleteContent />
    </Suspense>
  );
}

type Loaded = { key: string; result: GetResult };

function CompleteContent() {
  const rawId = useSearchParams().get("id");
  const id = rawId && rawId.trim() !== "" ? rawId : null;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // 같은 번호 · 같은 시도는 한 번만 부른다 (개발 모드에서 효과가 두 번 돌아도 요청은 1번)
  const pending = useRef<{ key: string; promise: Promise<GetResult> } | null>(null);
  const key = id ? `${attempt}:${id}` : null;

  useEffect(() => {
    if (!key || !id) return;
    let active = true;
    if (!pending.current || pending.current.key !== key) {
      pending.current = { key, promise: getSubscription(id) };
    }
    pending.current.promise.then((result) => {
      if (active) setLoaded({ key, result });
    });
    return () => {
      active = false;
    };
  }, [key, id]);

  // 번호 없이 들어옴 → 찾을 수 없음
  if (!key) return <NotFoundView />;
  // 이번 시도의 응답이 아직 없음 → 불러오는 중
  if (!loaded || loaded.key !== key) return <LoadingView />;
  // 네트워크 · 서버 오류 · 설정 없음 → 다시 시도
  if (!loaded.result.ok) return <ErrorView onRetry={() => setAttempt((n) => n + 1)} />;

  const sub = loaded.result.subscription;
  const plan = sub ? findPlan(sub.planId) : null;
  // 0건 또는 샘플에 없는 요금제 → 찾을 수 없음
  if (!sub || !plan) return <NotFoundView />;

  const isChange = sub.customerType === "change";

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

        {/* [기획] 신청 내역: 요금제, 약정, 둘째 달부터 청구 금액, 이름, 이메일. 첫 달 청구 금액은 요금제 변경 고객에게만 보인다. 이름·이메일은 서버가 일부를 가린 값(예: 홍*동)으로 보인다. */}
        <section className="flex w-full flex-col gap-8">
          <h2 className="text-subtitle-bold text-text-primary">신청 내역</h2>
          <dl className="flex w-full flex-col">
            <ListRow label="요금제" value={plan.name} />
            <ListRow label="약정" value={contractLabel(sub.contractMonths)} />
            {isChange ? <ListRow label="첫 달 청구 금액" value={formatWon(sub.firstMonthAmount)} /> : null}
            <ListRow label="둘째 달부터 청구 금액" value={formatWon(sub.monthlyAmount)} />
            <ListRow label="이름" value={sub.name} />
            <ListRow label="이메일" value={sub.email} />
          </dl>
        </section>

        <PrototypeNotice />
      </main>

      {/* [기획] 하단 처음으로 버튼 */}
      <HomeButton />
    </>
  );
}

// [기획] 신청을 찾을 수 없음: 주소에 신청 번호가 없거나 그 번호의 신청이 없을 때. 처음으로 버튼으로 첫 화면에 간다.
function NotFoundView() {
  return (
    <>
      {header}
      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        <section className="flex w-full flex-col gap-8 text-center">
          <h2 className="text-heading-h3 text-text-primary">신청을 찾을 수 없어요</h2>
          <p className="text-body-medium text-text-secondary">신청 번호가 없거나 저장된 신청이 없어요.</p>
        </section>
        <PrototypeNotice />
      </main>
      <HomeButton />
    </>
  );
}

// [기획] 불러오기 실패: 서버 연결이 안 되거나 오류가 나면 안내와 다시 시도 버튼을 보여 준다.
function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      {header}
      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        <section className="flex w-full flex-col gap-16">
          <p role="alert" className="w-full text-center text-body-small-medium text-text-error">
            신청 내역을 불러오지 못했어요. 다시 시도해 주세요.
          </p>
          <Button variant="secondary" size="xl" fullWidth onClick={onRetry}>
            다시 시도
          </Button>
        </section>
        <PrototypeNotice />
      </main>
      <HomeButton />
    </>
  );
}
