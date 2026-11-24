"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Home, RefreshCw, Play, Trophy as TrophyIcon, X } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

interface WinLoseDrawOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  winner: "win" | "loss" | "draw" | "player" | "computer" | string;
  playerName?: string;
  winnerName?: string;
  onPlayAgain?: () => void;
  onHome: () => void;
  onWatchReplay?: () => void;
  windowSize?: { width: number; height: number };
  isSpectator?: boolean;
}

export function WinLoseDrawOverlay({
  isOpen = true,
  onClose,
  winner,
  playerName = "You",
  winnerName,
  onPlayAgain,
  onHome,
  onWatchReplay,
  windowSize = { width: 400, height: 700 },
  isSpectator = false,
}: WinLoseDrawOverlayProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isWin = winner === "win" || winner === "player" || winner === "X" || winner === "O";
  const isDraw = winner === "draw";

  const titleText = isWin ? "You Win!" : isDraw ? "It's a Draw!" : "Game Over";
  const subtitleText = isWin
    ? "Congratulations!"
    : isDraw
    ? "Well played both!"
    : "Better luck next round!";
  const ribbonColor = isWin
    ? "linear-gradient(180deg, #A855F7 0%, #7E22CE 100%)"
    : isDraw
    ? "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)"
    : "linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)";

  const ribbonShadow = isWin
    ? "0 4px 0 #581C87, 0 8px 24px rgba(168, 85, 247, 0.45)"
    : isDraw
    ? "0 4px 0 #1E3A8A, 0 8px 24px rgba(59, 130, 246, 0.45)"
    : "0 4px 0 #7F1D1D, 0 8px 24px rgba(239, 68, 68, 0.45)";

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        {/* Confetti on Win */}
        {isWin && (
          <Confetti
            width={windowSize.width || 400}
            height={windowSize.height || 700}
            recycle={false}
            numberOfPieces={220}
            colors={["#FFDF00", "#FF7A00", "#00A3FF", "#B537F2", "#00E676"]}
            gravity={0.25}
          />
        )}

        {/* Backdrop - Click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(5, 12, 35, 0.8)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            cursor: "pointer",
          }}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="game-card-glass"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "min(420px, calc(100vw - 24px))",
            maxHeight: "calc(100dvh - 24px)",
            overflowY: "auto",
            padding: "clamp(20px, 4vw, 32px) clamp(16px, 4vw, 28px)",
            borderRadius: "clamp(22px, 5vw, 32px)",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 10, 45, 0.65)",
            boxSizing: "border-box",
          }}
        >
          {/* Visible Close (X) button */}
          {onClose && (
            <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }}>
              <RoundIconButton
                variant="dark"
                size={36}
                ariaLabel="Close Game Over overlay"
                onClick={onClose}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </RoundIconButton>
            </div>
          )}
          {/* Golden Trophy with Laurel */}
          <div
            style={{
              position: "relative",
              width: "120px",
              height: "110px",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Ambient Trophy Glow */}
            <div
              style={{
                position: "absolute",
                inset: "10px",
                borderRadius: "50%",
                background: isWin
                  ? "radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(0, 163, 255, 0.3) 0%, transparent 70%)",
                filter: "blur(16px)",
              }}
            />

            {/* Cartoon SVG Golden Trophy with Laurel Wreath */}
            <svg width="110" height="110" viewBox="0 0 120 120" fill="none">
              <defs>
                <linearGradient id="goldTrophy" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFF570" />
                  <stop offset="35%" stopColor="#FFC800" />
                  <stop offset="100%" stopColor="#D47A00" />
                </linearGradient>
                <linearGradient id="laurelLeaf" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFE066" />
                  <stop offset="100%" stopColor="#CC8800" />
                </linearGradient>
              </defs>

              {/* Laurel Wreath Left */}
              <path
                d="M32 30 C22 45 22 75 38 90 M24 38 C28 42 28 50 24 54 M20 56 C25 60 25 68 22 72 M26 74 C30 78 30 84 28 88"
                stroke="url(#laurelLeaf)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Laurel Wreath Right */}
              <path
                d="M88 30 C98 45 98 75 82 90 M96 38 C92 42 92 50 96 54 M100 56 C95 60 95 68 98 72 M94 74 C90 78 90 84 92 88"
                stroke="url(#laurelLeaf)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Trophy Cup */}
              <path
                d="M42 32 H78 V56 C78 68 68 76 60 76 C52 76 42 68 42 56 Z"
                fill="url(#goldTrophy)"
                stroke="#B36B00"
                strokeWidth="2.5"
              />
              {/* Trophy Handles */}
              <path
                d="M42 38 C32 38 30 52 42 56 M78 38 C88 38 90 52 78 56"
                stroke="url(#goldTrophy)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Trophy Stem & Base */}
              <path
                d="M56 76 H64 V86 H56 Z M44 86 H76 V94 C76 96 74 98 72 98 H48 C46 98 44 96 44 94 Z"
                fill="url(#goldTrophy)"
                stroke="#B36B00"
                strokeWidth="2"
              />
              {/* Star on Cup */}
              <path
                d="M60 44 L62.2 49 L67.5 49.5 L63.5 53 L64.7 58 L60 55.2 L55.3 58 L56.5 53 L52.5 49.5 L57.8 49 Z"
                fill="#FFFFFF"
                opacity="0.9"
              />
            </svg>
          </div>

          {/* 3D Curved Ribbon Banner */}
          <div
            style={{
              position: "relative",
              margin: "0 auto 16px",
              display: "inline-block",
            }}
          >
            <div
              style={{
                background: ribbonColor,
                borderRadius: "9999px",
                padding: "8px 36px",
                boxShadow: ribbonShadow,
                border: "2px solid rgba(255, 255, 255, 0.4)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(24px, 5vw, 32px)",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  margin: 0,
                  letterSpacing: "1px",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
                }}
              >
                {titleText}
              </h2>
            </div>
          </div>

          {/* Congratulations Text */}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "15px",
              color: "var(--text-secondary, #c2d6ff)",
              margin: "0 0 4px",
            }}
          >
            {subtitleText}
          </p>

          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(20px, 4vw, 24px)",
              fontWeight: 800,
              color: "var(--accent-x, #00A3FF)",
              margin: "0 0 24px",
            }}
          >
            {winnerName || playerName}
          </p>

          {/* Buttons Stack matching Reference Image 1 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
              maxWidth: "280px",
              margin: "0 auto",
            }}
          >
            {/* Primary Action: Home (Yellow Pill) */}
            <NeonButton
              variant="primary"
              size="md"
              fullWidth
              onClick={onHome}
            >
              <Home style={{ width: "18px", height: "18px" }} />
              <span>Home</span>
            </NeonButton>

            {/* Secondary Action: Play Again (Purple Pill) - Players only, never spectators */}
            {!isSpectator && onPlayAgain && (
              <NeonButton
                variant="purple"
                size="md"
                fullWidth
                onClick={() => {
                  onPlayAgain();
                  onClose?.();
                }}
              >
                <RefreshCw style={{ width: "18px", height: "18px" }} />
                <span>Play Again</span>
              </NeonButton>
            )}

            {/* Optional Watch Replay */}
            {onWatchReplay && (
              <NeonButton
                variant="dark"
                size="sm"
                fullWidth
                onClick={onWatchReplay}
              >
                <Play style={{ width: "16px", height: "16px" }} />
                <span>Watch Replay</span>
              </NeonButton>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
