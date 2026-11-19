"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Trophy,
  History,
  Calendar,
  Clock,
  Sparkles,
  ShieldAlert,
  FastForward,
  CheckCircle2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SoundControls } from "@/components/ui/SoundControls";
import { GameSkinIcon } from "@/components/game/GameSkinIcon";
import { useSound } from "@/hooks/useSound";
import { useWindowSize } from "@/hooks/useWindowSize";
import { GameRecord, GameMove, CellValue } from "@/types/game";
import { reconstructBoard, parseWinningLine } from "@/lib/replay";

const CELL_POSITION_NAMES = [
  "Top-Left",
  "Top-Center",
  "Top-Right",
  "Middle-Left",
  "Center",
  "Middle-Right",
  "Bottom-Left",
  "Bottom-Center",
  "Bottom-Right",
];

export default function ReplayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const gameId = params?.gameId as string;
  const { isMobile, isTablet, width, height } = useWindowSize();
  const { playSfx } = useSound();

  const [game, setGame] = useState<GameRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !gameId) return;

    const fetchGame = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/games/${gameId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setAuthError(data.message || "Unable to load game replay");
          return;
        }

        setGame(data.game);
        // Default to beginning
        setCurrentStep(0);
      } catch (err: any) {
        console.error("Error fetching replay:", err);
        setAuthError("Failed to fetch game replay");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGame();
  }, [gameId, status]);

  const moves: GameMove[] = useMemo(() => {
    if (!game || !Array.isArray(game.moves)) return [];
    return game.moves;
  }, [game]);

  const totalSteps = moves.length;

  const parsedWinningLine = useMemo(() => {
    return parseWinningLine(game?.winningLine);
  }, [game?.winningLine]);

  // Compute the board state up to currentStep
  const board: CellValue[] = useMemo(() => {
    return reconstructBoard(moves, currentStep);
  }, [moves, currentStep]);

  const lastMove: GameMove | null = useMemo(() => {
    if (currentStep > 0 && currentStep <= moves.length) {
      return moves[currentStep - 1];
    }
    return null;
  }, [moves, currentStep]);

  // Step navigation callbacks
  const handleStepForward = useCallback(() => {
    if (currentStep < totalSteps) {
      const nextMove = moves[currentStep];
      if (nextMove) {
        playSfx(nextMove.player === "X" ? "placeX" : "placeO");
      }
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep, totalSteps, moves, playSfx]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    if (currentStep > 0) {
      playSfx("click");
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, playSfx]);

  const handleRestart = useCallback(() => {
    playSfx("click");
    setIsPlaying(false);
    setCurrentStep(0);
  }, [playSfx]);

  const handleTogglePlay = useCallback(() => {
    playSfx("click");
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // If we are at the end, restart from step 0
      if (currentStep >= totalSteps) {
        setCurrentStep(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentStep, totalSteps, playSfx]);

  // Auto-playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (currentStep >= totalSteps) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = 1000 / playbackSpeed;
    timerRef.current = setTimeout(() => {
      handleStepForward();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStep, totalSteps, playbackSpeed, handleStepForward]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleStepBack();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setIsPlaying(false);
        handleStepForward();
      } else if (e.code === "Home") {
        e.preventDefault();
        handleRestart();
      } else if (e.code === "End") {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStep(totalSteps);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTogglePlay, handleStepBack, handleStepForward, handleRestart, totalSteps]);

  // Responsive board size calculation
  const boardSize = useMemo(() => {
    if (isMobile) {
      return Math.min(width - 48, 330);
    }
    if (isTablet) {
      return 360;
    }
    return 380;
  }, [isMobile, isTablet, width]);

  if (status === "loading" || isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary, #050505)",
        }}
      >
        <LoadingSpinner variant="cyan" size="xl" text="Loading match replay..." />
      </div>
    );
  }

  if (authError || !game) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary, #050505)",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "var(--bg-card, rgba(13,13,13,0.95))",
            border: "1px solid #FF3131",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 0 25px rgba(255,49,49,0.25)",
          }}
        >
          <ShieldAlert size={48} style={{ color: "#FF3131", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#FF3131", marginBottom: "12px" }}>
            Access Denied
          </h2>
          <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: "14px", marginBottom: "24px" }}>
            {authError || "You can only view replays of games you participated in."}
          </p>
          <motion.button
            type="button"
            onClick={() => router.push("/history")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: "10px 24px",
              background: "rgba(0,255,255,0.1)",
              border: "2px solid #00FFFF",
              borderRadius: "10px",
              color: "#00FFFF",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Back to My Games
          </motion.button>
        </div>
      </div>
    );
  }

  const isAtEnd = currentStep === totalSteps;
  const isWinnerActive = isAtEnd && game.winner && game.winner !== "draw";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary, #050505)",
        color: "var(--text-primary, #ffffff)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: isMobile ? "12px 16px" : "16px 24px",
          borderBottom: "1px solid var(--border-color, #1a1a1a)",
          backgroundColor: "var(--bg-card, rgba(13,13,13,0.95))",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <motion.button
              type="button"
              onClick={() => {
                playSfx("click");
                router.push("/history");
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-color, #262626)",
                borderRadius: "10px",
                padding: "8px 12px",
                color: "var(--text-primary, #ffffff)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} />
              {!isMobile && "History"}
            </motion.button>

            <div>
              <h1
                className="neon-text-cyan"
                style={{
                  fontSize: isMobile ? "15px" : "18px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Replay: {game.playerX} (X) vs {game.playerO} (O)
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SoundControls compact={isMobile} align="right" />
            <ThemeSwitcher compact={isMobile} align="right" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: isMobile ? "16px" : "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Match Details Banner */}
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "var(--bg-card, rgba(13,13,13,0.85))",
            border: "1px solid var(--border-color, #262626)",
            borderRadius: "14px",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "rgba(0,255,255,0.12)",
                border: "1px solid rgba(0,255,255,0.3)",
                color: "#00FFFF",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {game.mode}
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-muted, #9ca3af)" }}>
              {new Date(game.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)" }}>Final Outcome:</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "6px",
                background:
                  game.winner === "draw"
                    ? "rgba(255,215,0,0.15)"
                    : "rgba(0,255,65,0.15)",
                border: `1px solid ${
                  game.winner === "draw" ? "#FFD700" : "#00FF41"
                }`,
                color: game.winner === "draw" ? "#FFD700" : "#00FF41",
              }}
            >
              {game.winner === "draw"
                ? "DRAW"
                : `${game.winner === "X" ? game.playerX : game.playerO} Won (${game.winner})`}
            </span>
          </div>
        </div>

        {/* Board & Step Info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          {/* Current Step Status */}
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-muted, #9ca3af)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>
              Move <strong style={{ color: "#00FFFF" }}>{currentStep}</strong> of{" "}
              <strong>{totalSteps}</strong>
            </span>
            {lastMove && (
              <span style={{ color: "var(--text-primary, #ffffff)" }}>
                • <strong>{lastMove.player}</strong> placed at{" "}
                <em>{CELL_POSITION_NAMES[lastMove.cellIndex]}</em>
              </span>
            )}
            {currentStep === 0 && <span>• (Initial empty board)</span>}
          </div>

          {/* 3x3 Grid */}
          <div
            style={{
              width: boardSize,
              height: boardSize,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: "8px",
              padding: "10px",
              backgroundColor: "var(--bg-card, #0d0d0d)",
              borderRadius: "18px",
              border: "2px solid var(--border-color, #1a1a1a)",
              boxShadow: "0 0 30px rgba(0, 255, 255, 0.15)",
              position: "relative",
            }}
          >
            {board.map((cell, index) => {
              const isWinningCell = isWinnerActive && parsedWinningLine?.includes(index);
              const isLastMoveCell = lastMove?.cellIndex === index;

              return (
                <div
                  key={index}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isWinningCell
                      ? "rgba(255, 215, 0, 0.18)"
                      : isLastMoveCell
                      ? "rgba(0, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: isWinningCell
                      ? "2px solid #FFD700"
                      : isLastMoveCell
                      ? "2px solid #00FFFF"
                      : "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                    borderRadius: "12px",
                    boxShadow: isWinningCell
                      ? "0 0 20px rgba(255, 215, 0, 0.5)"
                      : isLastMoveCell
                      ? "0 0 14px rgba(0, 255, 255, 0.35)"
                      : "none",
                    transition: "all 0.25s ease",
                    userSelect: "none",
                  }}
                >
                  <AnimatePresence mode="wait">
                    {cell && (
                      <motion.div
                        key={`${index}-${cell}`}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 350, damping: 20 }}
                        style={{
                          width: "70%",
                          height: "70%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <GameSkinIcon symbol={cell} size="100%" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Position number hint */}
                  <span
                    style={{
                      position: "absolute",
                      bottom: "4px",
                      right: "6px",
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.15)",
                      fontFamily: "monospace",
                    }}
                  >
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Container */}
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "var(--bg-card, rgba(13,13,13,0.85))",
            border: "1px solid var(--border-color, #262626)",
            borderRadius: "16px",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Timeline Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "var(--text-muted, #9ca3af)",
              }}
            >
              <span>Start (0)</span>
              <span>
                Move {currentStep} / {totalSteps}
              </span>
              <span>End ({totalSteps})</span>
            </div>

            <input
              type="range"
              min={0}
              max={totalSteps}
              value={currentStep}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentStep(Number(e.target.value));
              }}
              style={{
                width: "100%",
                accentColor: "#00FFFF",
                cursor: "pointer",
                height: "6px",
                borderRadius: "3px",
              }}
            />
          </div>

          {/* Stepper & Playback Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {/* Speed Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255,255,255,0.05)",
                padding: "3px 6px",
                borderRadius: "10px",
                border: "1px solid var(--border-color, #262626)",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-muted, #9ca3af)", marginRight: "4px" }}>
                Speed:
              </span>
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    setPlaybackSpeed(spd);
                  }}
                  style={{
                    padding: "3px 8px",
                    border: "none",
                    borderRadius: "6px",
                    background: playbackSpeed === spd ? "rgba(0,255,255,0.2)" : "transparent",
                    color: playbackSpeed === spd ? "#00FFFF" : "var(--text-muted, #9ca3af)",
                    fontSize: "12px",
                    fontWeight: playbackSpeed === spd ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Playback Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Restart */}
              <motion.button
                type="button"
                onClick={handleRestart}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Restart (Home)"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #333)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-primary, #fff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={16} />
              </motion.button>

              {/* Prev */}
              <motion.button
                type="button"
                onClick={handleStepBack}
                disabled={currentStep === 0}
                whileHover={{ scale: currentStep === 0 ? 1 : 1.1 }}
                whileTap={{ scale: currentStep === 0 ? 1 : 0.9 }}
                title="Previous Move (Left Arrow)"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #333)",
                  background: "rgba(255,255,255,0.05)",
                  color: currentStep === 0 ? "rgba(255,255,255,0.2)" : "var(--text-primary, #fff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: currentStep === 0 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={18} />
              </motion.button>

              {/* Play / Pause Primary Button */}
              <motion.button
                type="button"
                onClick={handleTogglePlay}
                whileHover={{ scale: 1.06, boxShadow: "0 0 16px rgba(0,255,255,0.6)" }}
                whileTap={{ scale: 0.94 }}
                title="Play/Pause (Space)"
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  border: "2px solid #00FFFF",
                  background: "rgba(0,255,255,0.12)",
                  color: "#00FFFF",
                  fontSize: "14px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  textShadow: "0 0 8px rgba(0,255,255,0.5)",
                  boxShadow: "0 0 12px rgba(0,255,255,0.3)",
                }}
              >
                {isPlaying ? <Pause size={16} fill="#00FFFF" /> : <Play size={16} fill="#00FFFF" />}
                <span>{isPlaying ? "Pause" : currentStep >= totalSteps ? "Replay" : "Play"}</span>
              </motion.button>

              {/* Next */}
              <motion.button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  handleStepForward();
                }}
                disabled={currentStep === totalSteps}
                whileHover={{ scale: currentStep === totalSteps ? 1 : 1.1 }}
                whileTap={{ scale: currentStep === totalSteps ? 1 : 0.9 }}
                title="Next Move (Right Arrow)"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #333)",
                  background: "rgba(255,255,255,0.05)",
                  color:
                    currentStep === totalSteps
                      ? "rgba(255,255,255,0.2)"
                      : "var(--text-primary, #fff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: currentStep === totalSteps ? "not-allowed" : "pointer",
                }}
              >
                <ChevronRight size={18} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Move History Log / Timeline */}
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "var(--bg-card, rgba(13,13,13,0.85))",
            border: "1px solid var(--border-color, #262626)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--text-muted, #9ca3af)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Move Sequence</span>
            <span>Click any move to jump</span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "180px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {moves.map((m, idx) => {
              const stepNumber = idx + 1;
              const isCurrent = stepNumber === currentStep;
              const isPast = stepNumber < currentStep;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    playSfx("click");
                    setIsPlaying(false);
                    setCurrentStep(stepNumber);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: isCurrent
                      ? "rgba(0, 255, 255, 0.15)"
                      : isPast
                      ? "rgba(255, 255, 255, 0.03)"
                      : "transparent",
                    border: isCurrent
                      ? "1px solid #00FFFF"
                      : "1px solid transparent",
                    cursor: "pointer",
                    fontSize: "13px",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: isCurrent ? "#00FFFF" : "var(--text-muted, #9ca3af)",
                        width: "24px",
                      }}
                    >
                      #{stepNumber}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: m.player === "X" ? "#FF3131" : "#00FFFF",
                      }}
                    >
                      {m.player === "X" ? game.playerX : game.playerO} ({m.player})
                    </span>
                  </div>

                  <span style={{ color: "var(--text-muted, #9ca3af)", fontSize: "12px" }}>
                    Cell {m.cellIndex + 1} ({CELL_POSITION_NAMES[m.cellIndex]})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Keyboard hints footer */}
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted, #6b7280)",
            textAlign: "center",
          }}
        >
          Keyboard shortcuts: <kbd style={{ padding: "2px 6px", background: "#1f2937", borderRadius: "4px" }}>Space</kbd> Play/Pause •{" "}
          <kbd style={{ padding: "2px 6px", background: "#1f2937", borderRadius: "4px" }}>←</kbd> Prev •{" "}
          <kbd style={{ padding: "2px 6px", background: "#1f2937", borderRadius: "4px" }}>→</kbd> Next
        </div>
      </main>
    </div>
  );
}
