import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import QueryProvider from "@/components/QueryProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/shared/ToastProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://enclips.ai"),
  icons: {
    icon: "/logo.jpeg",
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
  title: "enclips — Turn Long Videos Into 100+ Viral Clips With AI",
  description: "Autonomous AI clipping engine. Find high-retention moments, auto-reframe to 9:16, dynamic karaoke captions & on-chain Web3 creator monetization on Stellar.",
  keywords: ["enclips", "AI clipping", "viral videos", "video editing", "content creation", "SaaS", "video shorts", "TikTok clips", "Reels automation", "Stellar"],
  authors: [{ name: "enclips AI Team" }],
  openGraph: {
    title: "enclips — Turn Long Videos Into 100+ Viral Clips With AI",
    description: "Autonomous AI clipping engine. Find high-retention moments, auto-reframe to 9:16, dynamic karaoke captions & on-chain Web3 creator monetization.",
    url: "https://enclips.ai",
    siteName: "enclips",
    images: [
      {
        url: "/logo.jpeg",
        width: 1200,
        height: 630,
        alt: "enclips AI Clipping",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "enclips — Turn Long Videos Into 100+ Viral Clips With AI",
    description: "Autonomous AI clipping engine. Find high-retention moments, auto-reframe to 9:16, dynamic karaoke captions & on-chain Web3 creator monetization.",
    images: ["/logo.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-[#060908] text-[#F4F4F5] antialiased selection:bg-[#00E58F]/30 selection:text-[#00E58F] min-h-screen relative overflow-x-hidden" suppressHydrationWarning>
        <div className="radial-bg" />
        <div className="fixed inset-0 grid-pattern pointer-events-none opacity-40 z-0" />
        <QueryProvider>
          <WalletProvider>
            <AuthProvider>
              <ToastProvider>
                <div className="relative z-10 flex flex-col min-h-screen">
                  {children}
                </div>
              </ToastProvider>
            </AuthProvider>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
