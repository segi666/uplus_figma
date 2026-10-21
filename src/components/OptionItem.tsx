"use client";

// OptionItem (design.md 4.7): 설명이 있는 단일 선택 항목.
// - default: bg/surface, border/default 1, 제목 body/strong
// - selected: bg/default, border/medium 1.5, 제목 subtitle/bold, 라디오 선택 표시
// 위아래 16 · 좌우 20 · radius/12. 두 상태의 높이를 같게 고정하지 않는다.
type OptionItemProps = {
  title: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
};

export function OptionItem({ title, desc, selected, onSelect }: OptionItemProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-12 rounded-12 px-20 py-16 text-left",
        selected ? "border-[1.5px] border-border-medium bg-bg-default" : "border border-border-default bg-bg-surface",
      ].join(" ")}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-4">
        <span className={selected ? "text-subtitle-bold text-text-primary" : "text-body-strong text-text-primary"}>
          {title}
        </span>
        <span className="text-body-small-medium text-text-secondary">{desc}</span>
      </span>
      {selected ? (
        <span
          aria-hidden="true"
          className="flex size-24 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-medium"
        >
          <span className="size-12 rounded-full bg-icon-default" />
        </span>
      ) : null}
    </button>
  );
}
