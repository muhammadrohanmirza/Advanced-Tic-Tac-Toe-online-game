"use client";

import { SessionProvider } from "next-auth/react";
import { SoundProvider } from "@/hooks/useSound";
import { ThemeProvider } from "@/hooks/useTheme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SoundProvider>{children}</SoundProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
