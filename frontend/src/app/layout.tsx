import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "원두지도",
  description: "스페셜티 커피 버티컬 맵",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
