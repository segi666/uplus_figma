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
export default function CustomerTypePage() {
  const router = useRouter();
  const { selection } = useSelection();
  const selected = selection.customerType;

  const goNext = () => {
    if (!selected) return;
    router.push("/usage");
  };

  return (
    <>
      <Header type="root" title="요금제 추천" />

      <main className="flex w-full flex-1 flex-col gap-24 px-16 pt-24 pb-24">
        <h2 id="customer-type-guide" className="text-heading-h3 text-text-primary">
          가입 형태를 골라 주세요
        </h2>

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

      <BottomCTA>
        <Button variant="primary" size="xl" fullWidth disabled={!selected} onClick={goNext}>
          다음
        </Button>
      </BottomCTA>
    </>
  );
}
