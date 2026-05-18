import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "원두지도",
  description: "스페셜티 커피 지도",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <script
          type="text/javascript"
          src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=87bcf88e80396b15f799f571a3982a2b"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}