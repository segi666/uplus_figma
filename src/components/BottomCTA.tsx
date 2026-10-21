import type { ReactNode } from "react";

// BottomCTA Layout=single (design.md 3.4 · 4.4): 상단 구분선 border/subtle,
// 위 12 · 좌우 16 · 아래 32, 내부 Button 하나 (전체 높이 97).
export function BottomCTA({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 w-full shrink-0 border-t-1 border-border-subtle bg-bg-surface px-16 pt-12 pb-32">
      {children}
    </div>
  );
}
