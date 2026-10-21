// 아이콘 (design.md 4.14). 색은 currentColor + 토큰 클래스.

// Input caution 메시지 앞 오류 아이콘: 20 × 20, icon/error (design.md 1.5 · 4.1)
export function IconCaution({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={`block size-20 shrink-0 text-icon-error ${className}`}
    >
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 5.75v5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

// Checkbox active 안의 체크 표시: 부모 24 × 24 안에서 icon/on-dark
export function IconCheckSmall({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={`block size-24 shrink-0 text-icon-on-dark ${className}`}
    >
      <path
        d="M6.5 12.5l3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// icon/doneMark (design.md 4.16): 64 × 64, fill/primary 원형 배경 + 내부 밝은 체크 (icon/on-dark).
// 결과 화면의 대표 상태 표시용. 작게 줄여 Checkbox 대신 쓰지 않는다.
export function IconDoneMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-64 shrink-0 items-center justify-center rounded-full bg-fill-primary text-icon-on-dark ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
        className="block size-32 shrink-0"
      >
        <path
          d="M8.5 16.5l5 5 10-11"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

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
