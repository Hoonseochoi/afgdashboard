import type { Metadata } from "next";
import { Noto_Sans_KR, Nunito } from "next/font/google";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${nunito.variable} font-sans`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark min-h-screen text-gray-800 dark:text-gray-200 transition-colors duration-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
