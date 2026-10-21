// Logo (design.md 4.17): 32 × 24, 브랜드 도형 색 brand/primary.
// 색은 currentColor로 받고 토큰 클래스 text-brand-primary로 정한다.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 24"
      aria-hidden="true"
      focusable="false"
      className={`block h-24 w-32 shrink-0 text-brand-primary ${className}`}
    >
      <circle cx="10" cy="12" r="9" fill="currentColor" />
      <path d="M26 8h2v3h3v2h-3v3h-2v-3h-3v-2h3z" fill="currentColor" />
    </svg>
  );
}
