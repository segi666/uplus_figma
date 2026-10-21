import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 토큰 font-sans와 같은 서체(Noto Sans KR). next/font가 빌드 때 받아 같은 도메인에서 제공한다.
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "요금제 추천",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.className} antialiased`}>
      <body className="min-h-dvh">
        {/* 모바일 폭 컨테이너: 화면 폭에 맞추고 최대 390 */}
        <div className="mx-auto flex min-h-dvh w-full max-w-390 flex-col bg-bg-surface">{children}</div>
      </body>
    </html>
  );
}
