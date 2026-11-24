"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Play, Bot, Trophy, Settings, Users, LogIn, UserPlus, History } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { CrownBadge } from "@/components/ui/CrownBadge";
import { Home3DIllustration } from "@/components/game/Home3DIllustration";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { SoundControls } from "@/components/ui/SoundControls";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { LeaderboardEntry } from "@/types/game";
import { useWindowSize } from "@/hooks/useWindowSize";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isMobile, isTiny } = useWindowSize();
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  // Fetch leaderboard when modal opened
  useEffect(() => {
    if (!showLeaderboard) return;
    setIsLoadingScores(true);
    fetch("/api/scores?game=tictactoe")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.leaderboard)) {
          setLeaderboardData(data.leaderboard);
        }
      })
      .catch((err) => console.error("Failed to load scores:", err))
      .finally(() => setIsLoadingScores(false));
  }, [showLeaderboard]);

  const handlePlayOnline = () => {
    if (session) {
      router.push("/lobby");
    } else {
      router.push("/login");
    }
  };

  const handlePlayAI = () => {
    router.push("/play-ai");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "clamp(12px, 3vw, 24px)",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        position: "relative",
        zIndex: 1,
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "4px 0 clamp(8px, 2vw, 16px)",
          flexWrap: "wrap",
          gap: "8px",
          minWidth: 0,
        }}
      >
        {/* Brand / Status Pill or Auth Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexShrink: 1 }}>
          {session ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "9999px",
                backgroundColor: "var(--bg-card, rgba(14, 25, 66, 0.7))",
                border: "1px solid var(--border-color, rgba(65, 115, 235, 0.3))",
                fontFamily: "var(--font-display)",
                fontSize: "13px",
                color: "var(--text-secondary, #c2d6ff)",
                maxWidth: isTiny ? "130px" : "180px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-green, #00E676)",
                  boxShadow: "0 0 8px #00E676",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session.user?.name || "Player"}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <NeonButton
                variant="dark"
                size="sm"
                onClick={() => router.push("/login")}
                style={{
                  padding: isTiny ? "8px 10px" : "8px 14px",
                  minHeight: "44px",
                }}
                aria-label="Login"
              >
                <LogIn style={{ width: "16px", height: "16px" }} />
                {!isTiny && <span>Login</span>}
              </NeonButton>
              <NeonButton
                variant="blue"
                size="sm"
                onClick={() => router.push("/signup")}
                style={{
                  padding: isTiny ? "8px 10px" : "8px 14px",
                  minHeight: "44px",
                }}
                aria-label="Sign Up"
              >
                <UserPlus style={{ width: "16px", height: "16px" }} />
                {!isTiny && <span>Sign Up</span>}
              </NeonButton>
            </div>
          )}
        </div>

        {/* Top Right Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <SoundControls align="right" compact={isMobile} />
          <RoundIconButton
            variant="dark"
            size={44}
            ariaLabel="Open settings"
            onClick={() => setShowSettings(true)}
          >
            <Settings style={{ width: "20px", height: "20px" }} />
          </RoundIconButton>
        </div>
      </header>

      {/* Main Hero Content Area (Responsive Grid: 1 column on mobile/tablet, 2 columns on desktop) */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          flex: 1,
          padding: "clamp(8px, 2vh, 24px) 0",
          width: "100%",
        }}
      >
        <div
          className="home-hero-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "clamp(20px, 4vw, 48px)",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: "960px",
            margin: "auto 0",
          }}
        >
          {/* Column 1: Title & 3D Illustration */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Crown above Title */}
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 350 }}
              style={{ marginBottom: "2px" }}
            >
              <CrownBadge size={38} />
            </motion.div>

            {/* Title with cartoon-3D shadow */}
            <h1
              className="game-title-3d"
              style={{
                fontSize: "clamp(42px, 8vw, 68px)",
                lineHeight: 1.05,
                margin: "0 0 6px",
              }}
            >
              Tic Tac Toe
            </h1>

            {/* Tagline */}
            <p
              className="game-tagline"
              style={{
                margin: "0 0 clamp(16px, 3vh, 28px)",
              }}
            >
              Think • Play • Win
            </p>

            {/* 3D X/O Tiles with orbital glows */}
            <Home3DIllustration size={260} />
          </div>

          {/* Column 2: Button Actions Stack */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(12px, 2.5vw, 16px)",
              width: "100%",
              maxWidth: "380px",
              margin: "0 auto",
            }}
          >
            {/* Primary Action: Play Online (Yellow Pill) */}
            <NeonButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={handlePlayOnline}
              style={{ minHeight: "56px" }}
            >
              <Play style={{ width: "22px", height: "22px", fill: "currentColor" }} />
              <span style={{ fontSize: "18px" }}>Play Online</span>
              <Users style={{ width: "20px", height: "20px", opacity: 0.85 }} />
            </NeonButton>

            {/* Secondary Action: Play vs AI (Purple Pill) */}
            <NeonButton
              variant="purple"
              size="lg"
              fullWidth
              onClick={handlePlayAI}
              style={{ minHeight: "56px" }}
            >
              <Bot style={{ width: "22px", height: "22px" }} />
              <span style={{ fontSize: "18px" }}>Play vs AI</span>
            </NeonButton>

            {/* Row of Secondary Dark Blue Pill Buttons: Leaderboard, History (if logged in), Settings */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: session?.user
                  ? (isTiny ? "1fr 1fr" : "repeat(3, 1fr)")
                  : "1fr 1fr",
                gap: "8px",
                width: "100%",
              }}
            >
              <NeonButton
                variant="dark-blue"
                size="sm"
                style={{
                  padding: "8px 10px",
                  fontSize: "13px",
                  minHeight: "44px",
                }}
                onClick={() => setShowLeaderboard(true)}
              >
                <Trophy style={{ width: "16px", height: "16px", color: "#FFD700", flexShrink: 0 }} />
                <span>Rankings</span>
              </NeonButton>

              {session?.user && (
                <NeonButton
                  variant="dark-blue"
                  size="sm"
                  style={{
                    padding: "8px 10px",
                    fontSize: "13px",
                    minHeight: "44px",
                  }}
                  onClick={() => router.push("/history")}
                >
                  <History style={{ width: "16px", height: "16px", color: "var(--accent-x, #00A3FF)", flexShrink: 0 }} />
                  <span>History</span>
                </NeonButton>
              )}

              <NeonButton
                variant="dark-blue"
                size="sm"
                style={{
                  padding: "8px 10px",
                  fontSize: "13px",
                  minHeight: "44px",
                  ...(session?.user && isTiny ? { gridColumn: "span 2" } : {}),
                }}
                onClick={() => setShowSettings(true)}
              >
                <Settings style={{ width: "16px", height: "16px", color: "var(--accent-x, #00A3FF)", flexShrink: 0 }} />
                <span>Settings</span>
              </NeonButton>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Bar */}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "clamp(8px, 1.5vw, 14px) 0",
          fontSize: "13px",
          color: "var(--text-muted, #8aa0d4)",
          fontFamily: "var(--font-display)",
        }}
      >
        <span>© 2026 Tic Tac Toe Online</span>
        <span
          style={{
            fontWeight: 700,
            color: "var(--accent-x, #00A3FF)",
            letterSpacing: "0.5px",
          }}
        >
          Let&apos;s Play!
        </span>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(5, 12, 35, 0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              maxWidth: "500px",
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              scrollbarWidth: "thin",
            }}
          >
            <Leaderboard
              leaderboard={leaderboardData}
              isLoading={isLoadingScores}
              onBack={() => setShowLeaderboard(false)}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
