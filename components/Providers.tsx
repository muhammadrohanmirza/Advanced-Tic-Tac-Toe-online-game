"use client";

import { SessionProvider } from "next-auth/react";
import { SoundProvider } from "@/hooks/useSound";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SoundProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--bg-card-solid, #0e1942)",
                color: "var(--text-primary, #ffffff)",
                border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.4))",
                borderRadius: "9999px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "14px",
                padding: "10px 22px",
              },
              success: {
                iconTheme: {
                  primary: "var(--accent-green, #00E676)",
                  secondary: "#0e1942",
                },
              },
              error: {
                iconTheme: {
                  primary: "var(--accent-red, #FF3B30)",
                  secondary: "#0e1942",
                },
              },
            }}
          />
        </SoundProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
