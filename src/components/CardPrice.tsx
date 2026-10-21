// Card/Price (design.md 4.10): 금액 라벨 · 핵심 금액 · 보조 정보를 요약하는 카드.
// padding 20 · 내부 간격 4 · radius/12 · bg/default. 폭은 부모에 맞춘다(Fill).
// 핵심 금액 heading/h2, 보조 정보 caption/medium. 할인율 줄은 이 프로젝트에서 쓰지 않는다.
type CardPriceProps = {
  label: string;
  amount: string;
  sub: string;
};

export function CardPrice({ label, amount, sub }: CardPriceProps) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-12 bg-bg-default p-20">
      <p className="text-body-small-strong text-text-secondary">{label}</p>
      <p className="text-heading-h2 text-text-primary">{amount}</p>
      <p className="text-caption-medium text-text-tertiary">{sub}</p>
    </section>
  );
}
