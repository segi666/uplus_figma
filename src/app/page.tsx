"use client";

import { useRouter } from "next/navigation";
import { BottomCTA } from "@/components/BottomCTA";
import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { OptionItem } from "@/components/OptionItem";
import { useSelection } from "@/components/useSelection";
import { customerTypeOptions, selectCustomerType } from "@/lib/selection";

// 화면 01 고객 유형 선택 (route: /)
// states: 기본 · 선택 전(다음 Disabled, 동작 막음) · 선택 후(다음 Default) · 되돌아옴(저장된 유형 유지, F7)
// [기획] 첫 화면: 서비스에 들어오면 가장 먼저 보이고, 고객이 가입 형태 4가지 중 하나를 고른다.
// [기획] 고른 가입 형태는 이 브라우저 탭에 기억해 두어(sessionStorage), 다른 화면에 갔다 돌아와도 그대로 선택돼 있다.
export default function CustomerTypePage() {
  const router = useRouter();
  const { selection } = useSelection();
  const selected = selection.customerType;

  // [기획] 다음 버튼 동작: 가입 형태를 골랐을 때만 사용량 확인 화면으로 이동한다.
  const goNext = () => {
    if (!selected) return;
    router.push("/usage");
  };

  return (
    <>
      {/* [기획] 상단 헤더: 첫 화면이라 뒤로가기 없이 제목과 로고만 보인다. */}
      <Header type="root" title="요금제 추천" />

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        {/* [기획] 안내 문구 */}
        <h2 id="customer-type-guide" className="text-heading-h3 text-text-primary">
          가입 형태를 골라 주세요
        </h2>

        {/* [기획] 가입 형태 선택지 4개(요금제 변경 / 번호이동 / 완전 신규 / 회선 추가). 한 번에 하나만 고를 수 있고, 고른 항목은 진하게 바뀐다. */}
        <div role="radiogroup" aria-labelledby="customer-type-guide" className="flex w-full flex-col gap-12">
          {customerTypeOptions.map((o) => (
            <OptionItem
              key={o.value}
              title={o.title}
              desc={o.desc}
              selected={selected === o.value}
              onSelect={() => selectCustomerType(o.value)}
            />
          ))}
        </div>
      </main>

      {/* [기획] 하단 다음 버튼: 아무것도 고르지 않으면 회색으로 꺼져 있어 누를 수 없다. */}
      <BottomCTA>
        <Button variant="primary" size="xl" fullWidth disabled={!selected} onClick={goNext}>
          다음
        </Button>
      </BottomCTA>
    </>
  );
}
