import Link from "next/link";
import { IconArrowLeft } from "./icons";
import { Logo } from "./Logo";

// Header (design.md 4.5): 높이 56, 좌우 16, bg/surface, 화면당 하나.
// - root: 뒤로가기 없이 왼쪽 제목(heading/h4) + 오른쪽 Logo
// - default: 뒤로가기 + 가운데 제목(subtitle/default) + 반대편 spacer
type HeaderProps =
  | { type: "root"; title: string }
  | { type: "default"; title: string; backHref: string };

export function Header(props: HeaderProps) {
  if (props.type === "root") {
    return (
      <header className="sticky top-0 flex h-56 w-full shrink-0 items-center justify-between gap-12 bg-bg-surface px-16">
        <h1 className="min-w-0 truncate text-heading-h4 text-text-primary">{props.title}</h1>
        <Logo />
      </header>
    );
  }

  return (
    <header className="sticky top-0 flex h-56 w-full shrink-0 items-center gap-8 bg-bg-surface px-16">
      {/* 아이콘은 24, 조작 영역은 40으로 따로 잡는다 (design.md 4.14) */}
      <Link
        href={props.backHref}
        aria-label="뒤로가기"
        className="-ml-8 flex size-40 shrink-0 items-center justify-center rounded-8"
      >
        <IconArrowLeft />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-center text-subtitle-default text-text-primary">{props.title}</h1>
      <span aria-hidden="true" className="-mr-8 size-40 shrink-0" />
    </header>
  );
}
