import type { Metadata } from "next";
import { Noto_Sans_KR, Nunito } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "./RegisterSW";
import Footer from "./_components/Footer";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-nunito",
});

const BASE_URL =
  process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://afgdashboard.vercel.app";

// 링크 미리보기 이미지 절대 URL (크롤러가 반드시 절대 URL로 받아야 함)
const OG_IMAGE_URL = `${BASE_URL}/meritzair.png`;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "AFG_meritz Prize Dashboard",
  description: "어센틱금융그룹 설계사 실적 대시보드. 여기를 눌러 링크를 확인하세요.",
  manifest: "/manifest.json",
  themeColor: "#1e40af",
  openGraph: {
    title: "AFG_meritz Prize Dashboard",
    description: "어센틱금융그룹 설계사 실적 대시보드. 여기를 눌러 링크를 확인하세요.",
    images: [OG_IMAGE_URL],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AFG_meritz Prize Dashboard",
    description: "어센틱금융그룹 설계사 실적 대시보드. 여기를 눌러 링크를 확인하세요.",
    images: [OG_IMAGE_URL],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${nunito.variable} font-sans`} suppressHydrationWarning>
      <head>
        <title>AFG_meritz Prize Dashboard</title>
        <meta name="description" content="어센틱금융그룹 설계사 실적 대시보드. 여기를 눌러 링크를 확인하세요." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Open Graph (링크 미리보기) - 이미지 절대 URL 필수 */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="AFG_meritz Prize Dashboard" />
        <meta property="og:description" content="어센틱금융그룹 설계사 실적 대시보드. 여기를 눌러 링크를 확인하세요." />
        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:image:secure_url" content={OG_IMAGE_URL} />
        <meta property="og:url" content={BASE_URL} />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AFG_meritz Prize Dashboard" />
        <meta name="twitter:description" content="어센틱금융그룹 설계사 실적 대시보드. 여기를 눌러 링크를 확인하세요." />
        <meta name="twitter:image" content={OG_IMAGE_URL} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col text-gray-800 dark:text-gray-200 transition-colors duration-200" suppressHydrationWarning>
        <RegisterSW />
        <main className="flex-1 min-h-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
