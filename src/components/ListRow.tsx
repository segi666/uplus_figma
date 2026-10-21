// List/Row Type=default (design.md 4.9): 라벨 왼쪽, 값 오른쪽의 정보 행.
// 위아래 12 · 좌우 4 · 내부 간격 12, 구분선 border/subtle.
// 라벨 body/small-medium + text/secondary, 값 body/small-strong + text/primary (design.md 1.1 · 2.2)
// <dl> 안에서 쓴다.
export function ListRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-12 border-b-1 border-border-subtle px-4 py-12">
      <dt className="min-w-0 text-body-small-medium text-text-secondary">{label}</dt>
      <dd className="shrink-0 text-right text-body-small-strong text-text-primary">{value}</dd>
    </div>
  );
}
