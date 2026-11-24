"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { NeonButton } from "@/components/ui/NeonButton";
import { SoundControls } from "@/components/ui/SoundControls";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { GameCell } from "@/components/game/GameCell";
import { WinLoseDrawOverlay } from "@/components/game/WinLoseDrawOverlay";
import { Bot, ArrowLeft, Lightbulb, Zap, Play, RefreshCw, Cpu, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBestMove,
  checkWinner,
  checkDraw,
  CellValue,
  Difficulty,
  PlayerSymbol,
} from "@/lib/ai";
import { useWindowSize } from "@/hooks/useWindowSize";
import { useSound } from "@/hooks/useSound";
import { GameMove } from "@/types/game";
import toast from "react-hot-toast";

interface Score {
  player: number;
  draw: number;
  computer: number;
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; badge: string; color: string; desc: string }
> = {
  easy: {
    label: "Easy",
    badge: "Easy",
    color: "#00E676",
    desc: "Casual AI with occasional blocks",
  },
  medium: {
    label: "Medium",
    badge: "Medium",
    color: "#FFB703",
    desc: "Tactical AI: blocks, centers & corners",
  },
  hard: {
    label: "Hard",
    badge: "Hard",
    color: "#FF3B30",
    desc: "Unbeatable Minimax AI",
  },
};

function PlayAIContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile, width, height } = useWindowSize();

  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol>("X");
  const [currentTurn, setCurrentTurn] = useState<PlayerSymbol>("X");
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [winner, setWinner] = useState<PlayerSymbol | "draw" | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isThinking, setIsThinking] = useState(false);
  const [score, setScore] = useState<Score>({ player: 0, draw: 0, computer: 0 });
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [showDiffDropdown, setShowDiffDropdown] = useState(false);
  const movesRef = useRef<GameMove[]>([]);

  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { playSfx } = useSound();

  const aiSymbol: PlayerSymbol = playerSymbol === "X" ? "O" : "X";
  const isMyTurn = currentTurn === playerSymbol && gameStatus === "playing" && !isThinking;

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const saveGameRecord = useCallback(
    async (
      finalWinner: PlayerSymbol | "draw",
      line: number[] | null,
      diff: Difficulty,
      sym: PlayerSymbol
    ) => {
      if (!session?.user) return;
      try {
        const pX =
          sym === "X"
            ? session.user.name || "Player"
            : `AI (${diff.toUpperCase()})`;
        const pO =
          sym === "O"
            ? session.user.name || "Player"
            : `AI (${diff.toUpperCase()})`;
        const pXId = sym === "X" ? session.user.id : null;
        const pOId = sym === "O" ? session.user.id : null;

        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: `ai-${diff}`,
            playerX: pX,
            playerO: pO,
            playerXId: pXId,
            playerOId: pOId,
            winner: finalWinner === "draw" ? "draw" : finalWinner,
            winningLine: line ? JSON.stringify(line) : null,
            moves: movesRef.current,
          }),
        });
        const data = await res.json();
        if (data.success && data.gameId) {
          setSavedGameId(data.gameId);
        }
      } catch (err) {
        console.error("[AI] Error saving game record:", err);
      }
    },
    [session?.user]
  );

  const saveScoreToDB = useCallback(
    (result: "win" | "loss" | "draw", diff: Difficulty) => {
      if (!session?.user) return;
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: `ai-${diff}`,
          result,
          opponent: `AI (${diff.toUpperCase()})`,
        }),
      }).catch((err) => console.error("[AI] Error saving score:", err));
    },
    [session?.user]
  );

  const triggerAiMove = useCallback(
    (currentBoard: CellValue[], currentAiSymbol: PlayerSymbol, currentDiff: Difficulty) => {
      setIsThinking(true);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

      const humanDelay = Math.floor(Math.random() * 350) + 300;

      aiTimerRef.current = setTimeout(() => {
        const bestMove = getBestMove(currentBoard, currentAiSymbol, currentDiff);

        if (bestMove !== -1) {
          const aiBoard = [...currentBoard];
          aiBoard[bestMove] = currentAiSymbol;
          setBoard(aiBoard);
          playSfx(currentAiSymbol === "X" ? "placeX" : "placeO");

          movesRef.current.push({
            step: movesRef.current.length + 1,
            player: currentAiSymbol,
            cellIndex: bestMove,
            timestamp: Date.now(),
          });

          const { winner: aiWinner, line: aiLine } = checkWinner(aiBoard);

          if (aiWinner) {
            playSfx("lose");
            setWinner(aiWinner);
            setWinningLine(aiLine);
            setGameStatus("finished");
            setScore((prev) => ({ ...prev, computer: prev.computer + 1 }));
            setIsThinking(false);
            saveScoreToDB("loss", currentDiff);
            saveGameRecord(aiWinner, aiLine, currentDiff, playerSymbol);
            return;
          }

          if (checkDraw(aiBoard)) {
            playSfx("draw");
            setWinner("draw");
            setGameStatus("finished");
            setScore((prev) => ({ ...prev, draw: prev.draw + 1 }));
            setIsThinking(false);
            saveScoreToDB("draw", currentDiff);
            saveGameRecord("draw", null, currentDiff, playerSymbol);
            return;
          }
        }

        const nextHumanSymbol: PlayerSymbol = currentAiSymbol === "X" ? "O" : "X";
        setCurrentTurn(nextHumanSymbol);
        setIsThinking(false);
      }, humanDelay);
    },
    [playSfx, saveScoreToDB, saveGameRecord, playerSymbol]
  );

  const startNewGame = useCallback(
    (sym: PlayerSymbol, diff: Difficulty) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

      movesRef.current = [];
      setSavedGameId(null);

      const emptyBoard = Array(9).fill(null);
      setBoard(emptyBoard);
      setWinner(null);
      setWinningLine(null);
      setGameStatus("playing");
      setIsThinking(false);

      const compSymbol: PlayerSymbol = sym === "X" ? "O" : "X";

      if (sym === "X") {
        setCurrentTurn("X");
      } else {
        setCurrentTurn("X");
        triggerAiMove(emptyBoard, compSymbol, diff);
      }
    },
    [triggerAiMove]
  );

  useEffect(() => {
    const diff = searchParams.get("difficulty") as Difficulty;
    const initialDiff: Difficulty =
      diff && ["easy", "medium", "hard"].includes(diff) ? diff : "medium";
    setDifficulty(initialDiff);

    const sym = searchParams.get("symbol")?.toUpperCase() as PlayerSymbol;
    const initialSym: PlayerSymbol = sym === "O" ? "O" : "X";
    setPlayerSymbol(initialSym);
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || gameStatus !== "playing" || currentTurn !== playerSymbol || isThinking) {
        return;
      }

      const newBoard = [...board];
      newBoard[index] = playerSymbol;
      setBoard(newBoard);
      playSfx(playerSymbol === "X" ? "placeX" : "placeO");

      movesRef.current.push({
        step: movesRef.current.length + 1,
        player: playerSymbol,
        cellIndex: index,
        timestamp: Date.now(),
      });

      const { winner: gameWinner, line } = checkWinner(newBoard);

      if (gameWinner) {
        setWinner(gameWinner);
        setWinningLine(line);
        setGameStatus("finished");
        playSfx("win");
        setScore((prev) => ({ ...prev, player: prev.player + 1 }));
        saveScoreToDB("win", difficulty);
        saveGameRecord(gameWinner, line, difficulty, playerSymbol);
        return;
      }

      if (checkDraw(newBoard)) {
        playSfx("draw");
        setWinner("draw");
        setGameStatus("finished");
        setScore((prev) => ({ ...prev, draw: prev.draw + 1 }));
        saveScoreToDB("draw", difficulty);
        saveGameRecord("draw", null, difficulty, playerSymbol);
        return;
      }

      setCurrentTurn(aiSymbol);
      triggerAiMove(newBoard, aiSymbol, difficulty);
    },
    [board, gameStatus, currentTurn, playerSymbol, isThinking, aiSymbol, difficulty, playSfx, saveScoreToDB, saveGameRecord, triggerAiMove]
  );

  const handleSelectDifficulty = (diff: Difficulty) => {
    playSfx("click");
    setDifficulty(diff);
    setShowDiffDropdown(false);
    if (gameStatus === "playing") {
      startNewGame(playerSymbol, diff);
    }
  };

  const handleStartGame = () => {
    playSfx("click");
    startNewGame(playerSymbol, difficulty);
  };

  const handlePlayAgain = () => {
    playSfx("click");
    startNewGame(playerSymbol, difficulty);
  };

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingSpinner size="lg" text="Loading AI Mode..." />
      </div>
    );
  }

  // Board size clamp (max 420px, responsive 90vw on phones)
  const boardSize = Math.min(width * 0.9, 410);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "clamp(12px, 2.5vw, 24px)",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        maxWidth: "960px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: "8px",
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <RoundIconButton
          variant="blue"
          size={42}
          ariaLabel="Go to Lobby"
          onClick={() => router.push("/lobby")}
        >
          <ArrowLeft style={{ width: "20px", height: "20px" }} />
        </RoundIconButton>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <Bot style={{ width: "24px", height: "24px", color: "var(--accent-x, #00A3FF)", flexShrink: 0 }} />
          <h1
            className="game-title-3d"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Human vs AI
          </h1>
        </div>

        {/* Right Controls: Difficulty Pill Dropdown + Audio */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowDiffDropdown(!showDiffDropdown)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "9999px",
              backgroundColor: "var(--btn-dark-bg, linear-gradient(180deg, #1C3574 0%, #0F1E4A 100%))",
              border: "1.5px solid var(--border-color, rgba(80, 140, 255, 0.4))",
              color: DIFFICULTY_CONFIG[difficulty].color,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 0 #081230",
            }}
          >
            <span>{DIFFICULTY_CONFIG[difficulty].label}</span>
            <ChevronDown style={{ width: "14px", height: "14px" }} />
          </button>

          <SoundControls align="right" />

          {/* Difficulty Dropdown Menu */}
          <AnimatePresence>
            {showDiffDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 8 }}
                className="game-card-light"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: "160px",
                  padding: "8px",
                  borderRadius: "16px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDifficulty(d)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: difficulty === d ? "rgba(2, 132, 199, 0.15)" : "transparent",
                      color: difficulty === d ? "#0284C7" : "#0F172A",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "13px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{DIFFICULTY_CONFIG[d].label}</span>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: DIFFICULTY_CONFIG[d].color,
                      }}
                    />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "clamp(12px, 2vh, 24px) 0",
        }}
      >
        {gameStatus === "waiting" ? (
          /* Matchup Screen (from Reference Image 2 bottom-right) */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="game-card-glass"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "clamp(24px, 5vw, 36px)",
              borderRadius: "clamp(24px, 5vw, 32px)",
              textAlign: "center",
            }}
          >
            {/* Two Avatars with VS Lightning */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(16px, 4vw, 28px)",
                margin: "12px 0 32px",
              }}
            >
              {/* You Avatar */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "clamp(74px, 16vw, 92px)",
                    height: "clamp(74px, 16vw, 92px)",
                    borderRadius: "50%",
                    background: "linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)",
                    border: "3px solid #BAE6FD",
                    boxShadow: "0 8px 20px rgba(2, 132, 199, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "36px",
                  }}
                >
                  🧑
                </div>
                <div
                  style={{
                    backgroundColor: "#0284C7",
                    color: "#FFFFFF",
                    padding: "4px 18px",
                    borderRadius: "9999px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "14px",
                    boxShadow: "0 2px 0 #075985",
                  }}
                >
                  You
                </div>
              </div>

              {/* Center Lightning VS Badge */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 900,
                    fontSize: "clamp(34px, 8vw, 44px)",
                    color: "#FFDF00",
                    textShadow: "0 0 16px rgba(255, 223, 0, 0.7), 0 3px 0 #D47A00",
                    lineHeight: 1,
                  }}
                >
                  VS
                </div>
                <Zap style={{ width: "22px", height: "22px", color: "#FFDF00", filter: "drop-shadow(0 0 8px #FFDF00)" }} />
              </div>

              {/* AI Avatar */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "clamp(74px, 16vw, 92px)",
                    height: "clamp(74px, 16vw, 92px)",
                    borderRadius: "50%",
                    background: "linear-gradient(180deg, #C084FC 0%, #7E22CE 100%)",
                    border: "3px solid #E9D5FF",
                    boxShadow: "0 8px 20px rgba(126, 34, 206, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "36px",
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    backgroundColor: "#9333EA",
                    color: "#FFFFFF",
                    padding: "4px 18px",
                    borderRadius: "9999px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "14px",
                    boxShadow: "0 2px 0 #581C87",
                  }}
                >
                  AI
                </div>
              </div>
            </div>

            {/* Start Game Action */}
            <NeonButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleStartGame}
              style={{ minHeight: "56px" }}
            >
              <Play style={{ width: "22px", height: "22px", fill: "currentColor" }} />
              <span style={{ fontSize: "18px" }}>Start Game</span>
            </NeonButton>
          </motion.div>
        ) : (
          /* Active Game Screen with Board & Score Bar */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(12px, 2vh, 18px)",
              width: "100%",
            }}
          >
            {/* Pill-Shaped Top Score Bar (from Reference Image 1 top-center) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--bg-card, rgba(14, 25, 66, 0.85))",
                border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.35))",
                borderRadius: "9999px",
                padding: "8px 16px",
                width: "100%",
                maxWidth: `${boardSize}px`,
                boxSizing: "border-box",
                boxShadow: "0 6px 16px rgba(0, 10, 40, 0.35)",
              }}
            >
              {/* Player X Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#00A3FF",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "16px",
                    boxShadow: "0 2px 6px rgba(0, 163, 255, 0.5)",
                  }}
                >
                  X
                </div>
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #8aa0d4)", display: "block" }}>
                    Player X
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "#FFFFFF" }}>
                    {playerSymbol === "X" ? score.player : score.computer}
                  </span>
                </div>
              </div>

              {/* Center VS Badge */}
              <div
                className="vs-badge-gold"
                style={{
                  padding: "4px 12px",
                  fontSize: "13px",
                  lineHeight: 1,
                }}
              >
                VS
              </div>

              {/* Player O Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #8aa0d4)", display: "block" }}>
                    Player O
                  </span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "15px", color: "#FFFFFF" }}>
                    {playerSymbol === "O" ? score.player : score.computer}
                  </span>
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#FF7A00",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "16px",
                    boxShadow: "0 2px 6px rgba(255, 122, 0, 0.5)",
                  }}
                >
                  O
                </div>
              </div>
            </div>

            {/* 3x3 Game Board Grid of Chunky White Tiles */}
            <div
              style={{
                width: `${boardSize}px`,
                height: `${boardSize}px`,
                maxWidth: "92vw",
                maxHeight: "92vw",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
                gap: "clamp(8px, 2vw, 12px)",
                padding: "clamp(10px, 2vw, 14px)",
                backgroundColor: "rgba(10, 18, 50, 0.7)",
                borderRadius: "clamp(22px, 5vw, 30px)",
                border: "2px solid var(--border-color, rgba(65, 115, 235, 0.35))",
                boxShadow: "0 16px 38px rgba(0, 10, 40, 0.5)",
                boxSizing: "border-box",
              }}
            >
              {board.map((cell, index) => (
                <GameCell
                  key={index}
                  value={cell}
                  index={index}
                  onClick={() => handleCellClick(index)}
                  disabled={cell !== null || !isMyTurn || gameStatus !== "playing" || isThinking}
                  isWinningCell={winningLine?.includes(index)}
                />
              ))}
            </div>

            {/* Bottom Hint Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                borderRadius: "9999px",
                backgroundColor: "var(--bg-card, rgba(14, 25, 66, 0.85))",
                border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.35))",
                color: isThinking ? "var(--accent-yellow, #FFB703)" : "#FFFFFF",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "14px",
                boxShadow: "0 4px 12px rgba(0, 10, 40, 0.3)",
              }}
            >
              <Lightbulb
                style={{
                  width: "18px",
                  height: "18px",
                  color: isThinking ? "#FFB703" : "#FFDF00",
                }}
              />
              <span>
                {isThinking
                  ? "AI is thinking..."
                  : isMyTurn
                  ? "Make your move..."
                  : "Waiting for move..."}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--text-muted, #8aa0d4)",
          fontFamily: "var(--font-display)",
          padding: "8px 0",
        }}
      >
        Single Player Practice • Think • Play • Win
      </footer>

      {/* Win / Loss / Draw Overlay Modal */}
      <WinLoseDrawOverlay
        isOpen={gameStatus === "finished"}
        winner={winner === playerSymbol ? "win" : winner === "draw" ? "draw" : "loss"}
        playerName={winner === playerSymbol ? (session?.user?.name || "You") : "Computer"}
        onPlayAgain={handlePlayAgain}
        onHome={() => router.push("/lobby")}
        onWatchReplay={savedGameId ? () => router.push(`/replay/${savedGameId}`) : undefined}
        windowSize={{ width, height }}
      />
    </div>
  );
}

export default function PlayAIPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoadingSpinner size="lg" text="Loading AI Mode..." />
        </div>
      }
    >
      <PlayAIContent />
    </Suspense>
  );
}
