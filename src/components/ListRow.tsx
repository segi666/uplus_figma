// List/Row (design.md 4.9): 위아래 12 · 좌우 4 · 내부 간격 12, 구분선 border/subtle.
// - Type=default: 라벨 왼쪽, 값 오른쪽의 정보 행.
//   라벨 body/small-medium + text/secondary, 값 body/small-strong + text/primary (design.md 1.1 · 2.2)
// - Type=check: 혜택 행. 왼쪽에 6 크기 강조 점, 값은 accent 색. 체크박스가 아니다.
// <dl> 안에서 쓴다.
type ListRowProps =
  | { type?: "default"; label: string; value: string }
  | { type: "check"; value: string };

export function ListRow(props: ListRowProps) {
  if (props.type === "check") {
    return (
      <div className="flex w-full items-center gap-12 border-b-1 border-border-subtle px-4 py-12">
        <dt className="sr-only">포함 혜택</dt>
        <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-fill-accent" />
        <dd className="min-w-0 flex-1 text-body-small-strong text-text-accent">{props.value}</dd>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-12 border-b-1 border-border-subtle px-4 py-12">
      <dt className="min-w-0 text-body-small-medium text-text-secondary">{props.label}</dt>
      <dd className="shrink-0 text-right text-body-small-strong text-text-primary">{props.value}</dd>
    </div>
  );
}
