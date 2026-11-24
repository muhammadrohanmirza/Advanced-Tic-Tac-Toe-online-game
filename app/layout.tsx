import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { GameBackground } from "@/components/layout/GameBackground";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tic Tac Toe Online",
  description: "Think • Play • Win - Real-time Tic Tac Toe with friends or AI.",
  icons: "/logo.png",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1842",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable}`}>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100dvh",
          backgroundColor: "var(--bg-primary, #0b1842)",
          color: "var(--text-primary, #ffffff)",
          fontFamily: "var(--font-body, 'Inter', sans-serif)",
          overflowX: "hidden",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <Providers>
          <GameBackground />
          <div style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
