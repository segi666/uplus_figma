import type { ReactNode } from "react";

// Card/Plan (design.md 4.11): 요금제 이름 · 설명 · 금액 · 상세 액션을 묶는 카드.
// - State = default: border/default 1 · selected: border/medium 1.5
// - padding 20 · 내부 간격 8 · radius/16 · 높이는 Hug
// - Sale(할인율 · 정가)과 Promo(프로모션 Chip)는 이 프로젝트에서 쓰지 않는다 (Sale=false, Promo=false).
// - Badge는 원본에서 가시성 연결이 없어 그리지 않는다 (design.md 4.11 주의).
type CardPlanProps = {
  state?: "default" | "selected";
  name: string;
  desc: string;
  priceLabel: string;
  price: string;
  extra?: ReactNode; // 카드 안 부가 문구 (화면별)
  action: ReactNode; // 카드 내부 Button
};

export function CardPlan({ state = "default", name, desc, priceLabel, price, extra, action }: CardPlanProps) {
  return (
    <article
      className={[
        "flex w-full flex-col gap-8 rounded-16 bg-bg-surface p-20",
        state === "selected" ? "border-[1.5px] border-border-medium" : "border border-border-default",
      ].join(" ")}
    >
      <h2 className="text-subtitle-bold text-text-primary">{name}</h2>
      <p className="text-body-small-medium text-text-secondary">{desc}</p>
      <div className="flex w-full flex-wrap items-baseline justify-between gap-8">
        <span className="text-body-small-medium text-text-secondary">{priceLabel}</span>
        <span className="text-heading-h4 text-text-primary">{price}</span>
      </div>
      {extra}
      <div className="flex w-full justify-end">{action}</div>
    </article>
  );
}
