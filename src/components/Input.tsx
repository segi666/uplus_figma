"use client";

import { useId, useState } from "react";
import { IconCaution } from "./icons";

// Input (design.md 4.1): 둥근 박스가 아닌 하단 1.5 밑줄형. field 높이 58, 내부 간격 10, 텍스트 래퍼 좌우 2.
// State = default | focus | filled | caution | disabled
// - default: 입력 전. border/default 밑줄 + placeholder(text/placeholder)
// - focus: 입력 중. border/focus 밑줄
// - filled: 값 입력 후. border/default 밑줄 + 값 body/strong · text/primary
// - caution: 검증 실패. border/error 밑줄 + field 아래 12 간격 오류 아이콘 · 메시지(text/error)
// - disabled: 옅은 배경(bg/subtle) + 비활성 텍스트(text/on-disabled)
// 라벨은 field 위에 따로 둔다. 폭은 부모에 맞춰 Fill.
export type InputState = "default" | "focus" | "filled" | "caution" | "disabled";

type InputProps = {
  name: string;
  type: "text" | "email";
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string; // 있으면 caution
  disabled?: boolean;
  autoComplete?: string;
};

const underline: Record<InputState, string> = {
  default: "border-border-default bg-bg-surface",
  focus: "border-border-focus bg-bg-surface",
  filled: "border-border-default bg-bg-surface",
  caution: "border-border-error bg-bg-surface",
  disabled: "border-border-default bg-bg-subtle",
};

export function Input({
  name,
  type,
  label,
  placeholder,
  value,
  onValueChange,
  error,
  disabled = false,
  autoComplete,
}: InputProps) {
  const uid = useId();
  const inputId = `${uid}-field`;
  const messageId = `${uid}-message`;
  const [focused, setFocused] = useState(false);

  const state: InputState = disabled
    ? "disabled"
    : error
      ? "caution"
      : focused
        ? "focus"
        : value !== ""
          ? "filled"
          : "default";

  return (
    <div className="flex w-full flex-col gap-8" data-state={state}>
      <label htmlFor={inputId} className="text-body-small-medium text-text-secondary">
        {label}
      </label>
      <div className="flex w-full flex-col gap-12">
        <div
          className={["flex h-58 w-full items-center gap-10 border-b-[1.5px] px-2", underline[state]].join(" ")}
        >
          <input
            id={inputId}
            name={name}
            type={type}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-invalid={state === "caution" || undefined}
            aria-describedby={state === "caution" ? messageId : undefined}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={[
              "min-w-0 flex-1 bg-transparent text-body-strong outline-none placeholder:text-text-placeholder",
              disabled ? "cursor-not-allowed text-text-on-disabled" : "text-text-primary",
            ].join(" ")}
          />
        </div>
        {state === "caution" ? (
          <p id={messageId} className="flex w-full items-center gap-4 text-body-small-medium text-text-error">
            <IconCaution />
            <span className="min-w-0 flex-1">{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
