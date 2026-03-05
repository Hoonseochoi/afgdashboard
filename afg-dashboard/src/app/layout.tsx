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

export const metadata: Metadata = {
  title: "Meritz Individual Agent Dashboard",
  description: "Dashboard for Meritz GA Performance Management",
  manifest: "/manifest.json",
  themeColor: "#1e40af",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${nunito.variable} font-sans`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="mobile-web-app-capable" content="yes" />
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
