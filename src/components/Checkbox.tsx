"use client";

import { IconCheckSmall } from "./icons";

// Checkbox (design.md 4.2): 24 × 24, State = default | active.
// - default: bg/surface + border/default 1.5 테두리
// - active: fill/primary 채움 + 안쪽 체크(icon/on-dark)
// 레이블을 포함하지 않는다. 관련 텍스트는 바깥에서 <label htmlFor={id}>로 함께 둔다.
// 별도의 disabled · error 변형은 없다 (오류 안내는 바깥 문구로).
type CheckboxProps = {
  name: string;
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  describedBy?: string;
  invalid?: boolean;
};

export function Checkbox({ name, id, checked, onCheckedChange, describedBy, invalid = false }: CheckboxProps) {
  return (
    <span className="relative flex size-24 shrink-0" data-state={checked ? "active" : "default"}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="peer absolute inset-0 size-24 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none flex size-24 items-center justify-center rounded-4",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-border-focus",
          checked ? "bg-fill-primary" : "border-[1.5px] border-border-default bg-bg-surface",
        ].join(" ")}
      >
        {checked ? <IconCheckSmall /> : null}
      </span>
    </span>
  );
}
