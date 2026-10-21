import type { ButtonHTMLAttributes } from "react";

// Button (design.md 4.3): radius/8, 좌우 24.
// Type = Primary | Secondary · Size = sm | lg | xl · State = Default | Hover | Disabled
// Disabled는 모양뿐 아니라 disabled 속성으로 동작도 막는다.
export type ButtonType = "primary" | "secondary";
export type ButtonSize = "sm" | "lg" | "xl";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonType;
  size?: ButtonSize;
  fullWidth?: boolean;
  htmlType?: "button" | "submit";
};

// 높이: Primary sm 40 · lg 48 · xl 52 / Secondary sm Default·Hover 42 (테두리 포함), Disabled 40 · lg 48 · xl 52
const height: Record<ButtonType, Record<ButtonSize, { on: string; off: string }>> = {
  primary: {
    sm: { on: "h-40", off: "h-40" },
    lg: { on: "h-48", off: "h-48" },
    xl: { on: "h-52", off: "h-52" },
  },
  secondary: {
    sm: { on: "h-42", off: "h-40" },
    lg: { on: "h-48", off: "h-48" },
    xl: { on: "h-52", off: "h-52" },
  },
};

const look: Record<ButtonType, { on: string; off: string }> = {
  // Disabled 레이블은 text/on-dark + body/medium (design.md 1.7 · 2.2)
  primary: {
    on: "bg-fill-primary text-body-strong text-text-on-dark hover:bg-fill-primary-hover",
    off: "bg-fill-disabled text-body-medium text-text-on-dark",
  },
  secondary: {
    on: "border border-border-default bg-surface-default text-body-strong text-text-primary hover:bg-bg-subtle",
    off: "bg-fill-disabled text-body-medium text-text-on-dark",
  },
};

export function Button({
  variant = "primary",
  size = "xl",
  fullWidth = false,
  htmlType = "button",
  disabled = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const state = disabled ? "off" : "on";
  return (
    <button
      {...rest}
      type={htmlType}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-8 px-24 text-center",
        "disabled:cursor-not-allowed",
        height[variant][size][state],
        look[variant][state],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
