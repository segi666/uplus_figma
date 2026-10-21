// 아이콘 (design.md 4.14). 색은 currentColor + 토큰 클래스.

// icon/arrowLeft: 24 × 24, 기본 도형 색 icon/default
export function IconArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={`block size-24 shrink-0 text-icon-default ${className}`}
    >
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
