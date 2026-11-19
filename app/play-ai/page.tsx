"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Confetti from "react-confetti";
import { LogOut, ArrowLeft, Cpu, ShieldAlert, Sparkles, RefreshCw, Play, History } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
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
import { SoundControls } from "@/components/ui/SoundControls";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { GameSkinIcon } from "@/components/game/GameSkinIcon";
import { useSound } from "@/hooks/useSound";
import { GameMove } from "@/types/game";

interface Score {
  player: number;
  draw: number;
  computer: number;
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; badge: string; color: string; bg: string; border: string; glow: string; desc: string }
> = {
  easy: {
    label: "Easy",
    badge: "🟢 EASY",
    color: "#00FF41",
    bg: "rgba(0, 255, 65, 0.12)",
    border: "#00FF41",
    glow: "0 0 14px rgba(0, 255, 65, 0.4)",
    desc: "Random moves with occasional blocks",
  },
  medium: {
    label: "Medium",
    badge: "🟡 MEDIUM",
    color: "#FFD700",
    bg: "rgba(255, 215, 0, 0.12)",
    border: "#FFD700",
    glow: "0 0 14px rgba(255, 215, 0, 0.4)",
    desc: "Tactical moves: wins, blocks, centers & corners",
  },
  hard: {
    label: "Hard",
    badge: "🔴 HARD (UNBEATABLE)",
    color: "#FF3131",
    bg: "rgba(255, 49, 49, 0.15)",
    border: "#FF3131",
    glow: "0 0 18px rgba(255, 49, 49, 0.6)",
    desc: "Full Minimax with Alpha-Beta pruning",
  },
};

function PlayAIContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile, isTablet, isDesktop, width, height } = useWindowSize();

  const [showConfetti, setShowConfetti] = useState(false);
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
  const movesRef = useRef<GameMove[]>([]);

  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { playSfx } = useSound();

  const aiSymbol: PlayerSymbol = playerSymbol === "X" ? "O" : "X";
  const isMyTurn = currentTurn === playerSymbol && gameStatus === "playing" && !isThinking;

  // Clear pending AI timers on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // Save full game record for replay
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
            : `Computer (${diff.toUpperCase()})`;
        const pO =
          sym === "O"
            ? session.user.name || "Player"
            : `Computer (${diff.toUpperCase()})`;
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

  // Save game results to Score model
  const saveScoreToDB = useCallback(
    (result: "win" | "loss" | "draw", diff: Difficulty) => {
      if (!session?.user) return;
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: `ai-${diff}`,
          result,
          opponent: `Computer (${diff.toUpperCase()})`,
        }),
      }).catch((err) => console.error("[AI] Error saving score:", err));
    },
    [session?.user]
  );

  // Trigger AI move with human delay (300ms - 700ms)
  const triggerAiMove = useCallback(
    (currentBoard: CellValue[], currentAiSymbol: PlayerSymbol, currentDiff: Difficulty) => {
      setIsThinking(true);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);

      // Random delay between 300ms and 700ms so it feels human
      const humanDelay = Math.floor(Math.random() * 400) + 300;

      aiTimerRef.current = setTimeout(() => {
        const bestMove = getBestMove(currentBoard, currentAiSymbol, currentDiff);

        if (bestMove !== -1) {
          const aiBoard = [...currentBoard];
          aiBoard[bestMove] = currentAiSymbol;
          setBoard(aiBoard);
          playSfx(currentAiSymbol === "X" ? "placeX" : "placeO");

          // Record AI move
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
            toast.error("🤖 Computer Wins!");
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
            toast("Draw!");
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

  // Start or reset a game with specified symbol and difficulty
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
        // User plays as X: user moves first!
        setCurrentTurn("X");
      } else {
        // User plays as O: AI is X and moves first!
        setCurrentTurn("X");
        triggerAiMove(emptyBoard, compSymbol, diff);
      }
    },
    [triggerAiMove]
  );

  // Read difficulty from URL on initial load
  useEffect(() => {
    const diff = searchParams.get("difficulty") as Difficulty;
    const initialDiff: Difficulty =
      diff && ["easy", "medium", "hard"].includes(diff) ? diff : "medium";
    setDifficulty(initialDiff);

    const sym = searchParams.get("symbol")?.toUpperCase() as PlayerSymbol;
    const initialSym: PlayerSymbol = sym === "O" ? "O" : "X";
    setPlayerSymbol(initialSym);

    const timer = setTimeout(() => {
      startNewGame(initialSym, initialDiff);
      toast(`AI Game Ready! Difficulty: ${initialDiff.toUpperCase()}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchParams, startNewGame]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Handle player cell click
  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || gameStatus !== "playing" || currentTurn !== playerSymbol || isThinking) {
        return;
      }

      const newBoard = [...board];
      newBoard[index] = playerSymbol;
      setBoard(newBoard);
      playSfx(playerSymbol === "X" ? "placeX" : "placeO");

      // Record player move
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
        setShowConfetti(true);
        toast.success("🎉 You Won!");
        setScore((prev) => ({ ...prev, player: prev.player + 1 }));
        saveScoreToDB("win", difficulty);
        saveGameRecord(gameWinner, line, difficulty, playerSymbol);
        setTimeout(() => setShowConfetti(false), 5000);
        return;
      }

      if (checkDraw(newBoard)) {
        playSfx("draw");
        setWinner("draw");
        setGameStatus("finished");
        setScore((prev) => ({ ...prev, draw: prev.draw + 1 }));
        toast("Draw!");
        saveScoreToDB("draw", difficulty);
        saveGameRecord("draw", null, difficulty, playerSymbol);
        return;
      }

      // Hand turn over to the AI
      setCurrentTurn(aiSymbol);
      triggerAiMove(newBoard, aiSymbol, difficulty);
    },
    [
      board,
      gameStatus,
      currentTurn,
      playerSymbol,
      isThinking,
      aiSymbol,
      difficulty,
      playSfx,
      saveScoreToDB,
      saveGameRecord,
      triggerAiMove,
    ]
  );

  // Switch player symbol between X and O
  const handleSelectSymbol = (sym: PlayerSymbol) => {
    if (sym === playerSymbol || isThinking) return;
    playSfx("click");
    setPlayerSymbol(sym);
    startNewGame(sym, difficulty);
    toast(`Playing as ${sym}! ${sym === "X" ? "You go first." : "AI goes first."}`);
  };

  // Switch difficulty
  const handleSelectDifficulty = (diff: Difficulty) => {
    if (diff === difficulty && gameStatus === "playing") return;
    playSfx("click");
    setDifficulty(diff);
    startNewGame(playerSymbol, diff);
    toast(`Difficulty changed to ${diff.toUpperCase()}`);
  };

  const handlePlayAgain = () => {
    playSfx("click");
    startNewGame(playerSymbol, difficulty);
    toast("New game started!");
  };

  const handleLeaveRoom = () => {
    playSfx("click");
    router.push("/lobby");
  };

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
        }}
      >
        <LoadingSpinner variant="green" size="xl" text="Loading AI Mode..." />
      </div>
    );
  }

  // Calculate responsive board size
  const getBoardSize = () => {
    if (isMobile) {
      return Math.min(width * 0.88, 340);
    } else if (isTablet) {
      return Math.min(width * 0.5, 390);
    }
    return 400;
  };

  const boardSize = getBoardSize();
  const currentDiffConfig = DIFFICULTY_CONFIG[difficulty];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary, #050505)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <Toaster position="top-center" />
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={220}
          colors={["#00FFFF", "#00FF41", "#FFD700", "#FF00FF"]}
          gravity={0.3}
        />
      )}

      {/* Header */}
      <header
        style={{
          padding: isMobile ? "10px 16px" : "16px",
          borderBottom: "1px solid var(--border-color, #1a1a1a)",
          backgroundColor: "var(--theme-header-bg, rgba(13,13,13,0.8))",
        }}
      >
        <div
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "14px" }}>
            <ArrowLeft
              style={{
                width: isMobile ? "20px" : "24px",
                height: isMobile ? "20px" : "24px",
                color: "var(--accent-x, #00FF41)",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onClick={() => router.push("/lobby")}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu style={{ width: "18px", height: "18px", color: currentDiffConfig.color }} />
                <h1
                  className="neon-text-green"
                  style={{
                    fontSize: isMobile ? "16px" : "20px",
                    fontWeight: "bold",
                    margin: 0,
                  }}
                >
                  VS COMPUTER
                </h1>
              </div>
              <p
                style={{
                  color: "var(--text-muted, #9ca3af)",
                  fontSize: isMobile ? "11px" : "12px",
                  margin: "2px 0 0 0",
                }}
              >
                Single Player Practice Mode
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "14px" }}>
            <ThemeSwitcher compact={isMobile} align="right" />
            <SoundControls compact={isMobile} align="right" />
            {session?.user && <UserAvatar userName={session.user.name} userEmail={session.user.email} />}

            <motion.button
              type="button"
              onClick={handleLeaveRoom}
              whileHover={{
                scale: 1.05,
                y: -2,
                boxShadow: "0 0 20px rgba(255,49,49,0.7)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: isMobile ? "6px 12px" : "8px 16px",
                minHeight: isMobile ? "38px" : "42px",
                border: "2px solid #FF3131",
                borderRadius: "10px",
                background: "rgba(255,49,49,0.05)",
                color: "#FF3131",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(255,49,49,0.35)",
                textShadow: "0 0 8px #FF3131",
              }}
            >
              <LogOut size={isMobile ? 14 : 16} />
              {!isMobile && <span>Lobby</span>}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: isMobile ? "16px 12px" : "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobile ? "16px" : "24px",
        }}
      >
        {/* Top Control Bar: Difficulty Badge + Player Symbol Selector */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? "10px" : "16px",
            width: "100%",
            maxWidth: boardSize,
            backgroundColor: "var(--bg-card, rgba(13,13,13,0.85))",
            padding: isMobile ? "10px 14px" : "12px 18px",
            borderRadius: "14px",
            border: "1px solid var(--border-color, #1a1a1a)",
            boxSizing: "border-box",
          }}
        >
          {/* Difficulty Badge on the board screen */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", fontWeight: 600 }}>
              Difficulty:
            </span>
            <motion.div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "999px",
                border: `1.5px solid ${currentDiffConfig.border}`,
                backgroundColor: currentDiffConfig.bg,
                color: currentDiffConfig.color,
                fontWeight: 800,
                fontSize: isMobile ? "11px" : "12px",
                boxShadow: currentDiffConfig.glow,
                textShadow: `0 0 8px ${currentDiffConfig.color}`,
                letterSpacing: "0.5px",
              }}
              animate={difficulty === "hard" ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span>{currentDiffConfig.badge}</span>
            </motion.div>
          </div>

          {/* User Symbol Picker: X or O */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", fontWeight: 600 }}>
              Play as:
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["X", "O"] as PlayerSymbol[]).map((sym) => {
                const isSelected = playerSymbol === sym;
                const symColor = sym === "X" ? "var(--accent-x, #00FFFF)" : "var(--accent-o, #FF00FF)";
                return (
                  <button
                    key={sym}
                    type="button"
                    disabled={isThinking}
                    onClick={() => handleSelectSymbol(sym)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "8px",
                      border: isSelected
                        ? `2px solid ${symColor}`
                        : "1px solid var(--border-color, #2a2a2a)",
                      backgroundColor: isSelected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)",
                      color: isSelected ? symColor : "var(--text-muted, #666)",
                      fontWeight: isSelected ? 800 : 500,
                      fontSize: "13px",
                      cursor: isThinking ? "not-allowed" : "pointer",
                      boxShadow: isSelected ? `0 0 10px ${symColor}66` : "none",
                      transition: "all 0.15s ease",
                    }}
                    title={sym === "X" ? "You play as X (Moves First)" : "You play as O (AI Moves First)"}
                  >
                    {sym} {sym === "X" ? "(1st)" : "(2nd)"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Score Board */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "12px" : "24px",
            padding: isMobile ? "10px 14px" : "14px 28px",
            backgroundColor: "var(--bg-card, rgba(13,13,13,0.8))",
            borderRadius: "14px",
            border: "1px solid var(--border-color, #1a1a1a)",
            justifyContent: "center",
            width: "100%",
            maxWidth: boardSize,
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", flex: 1 }}>
            <p
              style={{
                color: playerSymbol === "X" ? "var(--accent-x, #00FFFF)" : "var(--accent-o, #FF00FF)",
                fontSize: isMobile ? "10px" : "11px",
                fontWeight: 700,
                marginBottom: "2px",
              }}
            >
              YOU ({playerSymbol})
            </p>
            <p
              className="neon-text-cyan"
              style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "bold", margin: 0 }}
            >
              {score.player}
            </p>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--border-color, #333)" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <p
              style={{
                color: "var(--text-muted, #666)",
                fontSize: isMobile ? "10px" : "11px",
                fontWeight: 700,
                marginBottom: "2px",
              }}
            >
              DRAW
            </p>
            <p style={{ color: "#FFD700", fontSize: isMobile ? "22px" : "28px", fontWeight: "bold", margin: 0 }}>
              {score.draw}
            </p>
          </div>
          <div style={{ width: "1px", backgroundColor: "var(--border-color, #333)" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <p
              style={{
                color: aiSymbol === "X" ? "var(--accent-x, #00FFFF)" : "var(--accent-o, #00FF41)",
                fontSize: isMobile ? "10px" : "11px",
                fontWeight: 700,
                marginBottom: "2px",
              }}
            >
              CPU ({aiSymbol})
            </p>
            <p
              className="neon-text-green"
              style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "bold", margin: 0 }}
            >
              {score.computer}
            </p>
          </div>
        </div>

        {/* Player Cards */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "10px" : "18px",
            width: "100%",
            maxWidth: boardSize,
            justifyContent: "center",
          }}
        >
          <PlayerCard
            name={session?.user?.name || "You"}
            symbol={playerSymbol}
            isActive={currentTurn === playerSymbol && gameStatus === "playing" && !isThinking}
            isYou
            isMobile={isMobile}
          />
          <PlayerCard
            name="COMPUTER 🤖"
            symbol={aiSymbol}
            isActive={(currentTurn === aiSymbol || isThinking) && gameStatus === "playing"}
            isMobile={isMobile}
          />
        </div>

        {/* Turn / Game Status Box */}
        {gameStatus === "playing" && (
          <div
            style={{
              textAlign: "center",
              padding: isMobile ? "10px 16px" : "14px 24px",
              backgroundColor: isThinking
                ? "rgba(255, 215, 0, 0.08)"
                : isMyTurn
                ? "rgba(0, 255, 65, 0.08)"
                : "rgba(13, 13, 13, 0.5)",
              borderRadius: "12px",
              border: `2px solid ${
                isThinking ? "#FFD700" : isMyTurn ? "var(--neon-green, #00FF41)" : "var(--border-color, #1a1a1a)"
              }`,
              width: "100%",
              maxWidth: boardSize,
              boxSizing: "border-box",
              boxShadow: isThinking
                ? "0 0 16px rgba(255, 215, 0, 0.3)"
                : isMyTurn
                ? "0 0 14px rgba(0, 255, 65, 0.25)"
                : "none",
            }}
          >
            {isThinking ? (
              <motion.div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "#FFD700",
                  fontWeight: 700,
                  fontSize: isMobile ? "14px" : "16px",
                  margin: 0,
                  textShadow: "0 0 8px #FFD700",
                }}
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Cpu style={{ width: "16px", height: "16px" }} />
                <span>AI is calculating best move...</span>
              </motion.div>
            ) : (
              <p
                className={isMyTurn ? "neon-text-green" : ""}
                style={{
                  fontSize: isMobile ? "15px" : "18px",
                  fontWeight: "bold",
                  margin: 0,
                  color: isMyTurn ? "var(--neon-green, #00FF41)" : "var(--text-muted, #9ca3af)",
                }}
              >
                {isMyTurn ? `⚡ Your Turn (${playerSymbol})` : `Computer's Turn (${aiSymbol})...`}
              </p>
            )}
          </div>
        )}

        {/* Game Finished Outcome */}
        {gameStatus === "finished" && winner && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.4 }}
            style={{
              textAlign: "center",
              padding: isMobile ? "14px 18px" : "20px 24px",
              backgroundColor:
                winner === playerSymbol
                  ? "rgba(0,255,65,0.12)"
                  : winner === "draw"
                  ? "rgba(255,215,0,0.12)"
                  : "rgba(255,49,49,0.12)",
              borderRadius: "16px",
              border: `2px solid ${
                winner === playerSymbol ? "#00FF41" : winner === "draw" ? "#FFD700" : "#FF3131"
              }`,
              width: "100%",
              maxWidth: boardSize,
              boxShadow:
                winner === playerSymbol
                  ? "0 0 20px rgba(0,255,65,0.4)"
                  : winner === "draw"
                  ? "0 0 16px rgba(255,215,0,0.3)"
                  : "0 0 20px rgba(255,49,49,0.4)",
              boxSizing: "border-box",
            }}
          >
            <p
              className={
                winner === playerSymbol
                  ? "neon-text-green"
                  : winner === "draw"
                  ? "neon-text-yellow"
                  : "neon-text-red"
              }
              style={{
                fontSize: isMobile ? "clamp(20px, 6vw, 26px)" : "30px",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              {winner === playerSymbol
                ? "🎉 You Won!"
                : winner === "draw"
                ? "🤝 Draw!"
                : "🤖 Computer Wins!"}
            </p>
          </motion.div>
        )}

        {/* The 3x3 Game Board */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: isMobile ? "6px" : "8px",
            padding: isMobile ? "12px" : "16px",
            backgroundColor: "var(--bg-card, rgba(13,13,13,0.85))",
            borderRadius: isMobile ? "16px" : "24px",
            border: "1px solid var(--border-color, #1a1a1a)",
            width: "100%",
            maxWidth: boardSize,
            aspectRatio: "1 / 1",
            boxSizing: "border-box",
            opacity: isThinking ? 0.65 : 1,
            transition: "opacity 0.25s",
          }}
        >
          {board.map((cell, index) => (
            <motion.button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={cell !== null || !isMyTurn || gameStatus !== "playing" || isThinking}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                backgroundColor: cell
                  ? "var(--bg-card-solid, #111)"
                  : "var(--bg-card, rgba(17,17,17,0.8))",
                border: winningLine?.includes(index)
                  ? "2px solid #FFD700"
                  : "2px solid var(--border-color, #1a1a1a)",
                borderRadius: isMobile ? "8px" : "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: cell || !isMyTurn || isThinking ? "default" : "pointer",
                transition: "all 0.25s",
                boxShadow: winningLine?.includes(index) ? "0 0 20px #FFD700" : "none",
                boxSizing: "border-box",
                padding: "8px",
              }}
              whileHover={
                isMyTurn && !cell && !isThinking
                  ? { scale: 1.05, borderColor: "var(--accent-x, #00FF4144)" }
                  : {}
              }
              whileTap={isMyTurn && !cell && !isThinking ? { scale: 0.95 } : {}}
            >
              {cell && (
                <div
                  style={{
                    width: "70%",
                    height: "70%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GameSkinIcon symbol={cell} size="100%" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Action Buttons on game completion */}
        {gameStatus === "finished" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: isMobile ? "10px" : "14px",
              flexDirection: isMobile ? "column" : "row",
              width: "100%",
              maxWidth: boardSize,
            }}
          >
            <motion.button
              type="button"
              onClick={handlePlayAgain}
              whileHover={{
                scale: 1.04,
                y: -2,
                boxShadow: "0 0 22px rgba(0,255,65,0.7)",
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              style={{
                width: isMobile ? "100%" : "180px",
                minHeight: "48px",
                border: "2px solid #00FF41",
                borderRadius: "12px",
                background: "rgba(0,255,65,0.08)",
                color: "#00FF41",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(0,255,65,.35)",
                textShadow: "0 0 8px #00FF41",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <RefreshCw size={16} />
              <span>Play Again</span>
            </motion.button>

            {savedGameId && (
              <motion.button
                type="button"
                onClick={() => {
                  playSfx("click");
                  router.push(`/replay/${savedGameId}`);
                }}
                whileHover={{
                  scale: 1.04,
                  y: -2,
                  boxShadow: "0 0 22px rgba(0,255,255,0.7)",
                }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: isMobile ? "100%" : "180px",
                  minHeight: "48px",
                  border: "2px solid #00FFFF",
                  borderRadius: "12px",
                  background: "rgba(0,255,255,0.1)",
                  color: "#00FFFF",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(0,255,255,.35)",
                  textShadow: "0 0 8px #00FFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Play size={16} fill="#00FFFF" />
                <span>Watch Replay</span>
              </motion.button>
            )}

            <motion.button
              type="button"
              onClick={handleLeaveRoom}
              whileHover={{
                scale: 1.04,
                y: -2,
                boxShadow: "0 0 20px rgba(255,255,255,0.5)",
              }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              style={{
                width: isMobile ? "100%" : "180px",
                minHeight: "48px",
                border: "2px solid #FFFFFF",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(255,255,255,.25)",
                textShadow: "0 0 8px #FFFFFF",
              }}
            >
              Back to Lobby
            </motion.button>
          </motion.div>
        )}

        {/* Change Difficulty Selector Bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            marginTop: isMobile ? "8px" : "12px",
            width: "100%",
            maxWidth: boardSize,
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", fontWeight: 500 }}>
            Change Difficulty:
          </span>
          <div
            style={{
              display: "flex",
              gap: isMobile ? "6px" : "10px",
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => {
              const isSelected = difficulty === diff;
              const cfg = DIFFICULTY_CONFIG[diff];
              return (
                <button
                  key={diff}
                  disabled={isThinking}
                  onClick={() => handleSelectDifficulty(diff)}
                  style={{
                    padding: isMobile ? "6px 12px" : "8px 16px",
                    borderRadius: "8px",
                    border: `2px solid ${isSelected ? cfg.color : "var(--border-color, #1a1a1a)"}`,
                    backgroundColor: isSelected ? cfg.bg : "var(--bg-card, transparent)",
                    color: isSelected ? cfg.color : "var(--text-muted, #666)",
                    fontWeight: isSelected ? 800 : 500,
                    cursor: isThinking ? "not-allowed" : "pointer",
                    transition: "all 0.25s",
                    textTransform: "uppercase",
                    fontSize: isMobile ? "11px" : "12px",
                    letterSpacing: "0.5px",
                    minHeight: isMobile ? "38px" : "42px",
                    boxShadow: isSelected ? cfg.glow : "none",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <p
            style={{
              color: "var(--text-muted, #6b7280)",
              fontSize: isMobile ? "11px" : "12px",
              margin: "4px 0 0 0",
              textAlign: "center",
            }}
          >
            {currentDiffConfig.desc}
          </p>
        </div>
      </main>
    </div>
  );
}

// Player Card Component - Responsive
function PlayerCard({
  name,
  symbol,
  isActive,
  isYou,
  isMobile,
}: {
  name: string;
  symbol: PlayerSymbol;
  isActive: boolean;
  isYou?: boolean;
  isMobile: boolean;
}) {
  const color = symbol === "X" ? "var(--accent-x, #00FFFF)" : "var(--accent-o, #00FF41)";

  return (
    <motion.div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "8px" : "14px",
        padding: isMobile ? "10px 12px" : "14px 16px",
        borderRadius: "12px",
        border: `2px solid ${isActive ? color : "var(--border-color, #1a1a1a)"}`,
        backgroundColor: "var(--bg-card, rgba(13,13,13,0.8))",
        boxShadow: isActive ? `0 0 20px ${color}33` : "none",
        minWidth: isMobile ? "130px" : "180px",
        flex: 1,
        maxWidth: "200px",
      }}
      animate={isActive ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div
        style={{
          width: isMobile ? "38px" : "50px",
          height: isMobile ? "38px" : "50px",
          borderRadius: "50%",
          border: `2px solid ${color}`,
          backgroundColor: "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: "6px",
        }}
      >
        <GameSkinIcon symbol={symbol} size={isMobile ? 20 : 26} animate={false} />
      </div>
      <div style={{ overflow: "hidden", minWidth: 0 }}>
        <p
          style={{
            fontWeight: "bold",
            color,
            margin: 0,
            fontSize: isMobile ? "12px" : "14px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontSize: isMobile ? "10px" : "11px",
            color: "var(--text-muted, #9ca3af)",
            margin: "2px 0 0 0",
          }}
        >
          {isYou ? `You (${symbol})` : `AI (${symbol})`}
        </p>
      </div>
      {isActive && (
        <motion.div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
            marginLeft: "auto",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

export default function PlayAIPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-primary, #050505)",
          }}
        >
          <LoadingSpinner variant="green" size="xl" text="Loading AI Mode..." />
        </div>
      }
    >
      <PlayAIContent />
    </Suspense>
  );
}
