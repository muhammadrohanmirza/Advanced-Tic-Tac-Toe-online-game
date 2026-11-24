"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Play,
  ArrowLeft,
  Clock,
  Bot,
  Users,
  Search,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SoundControls } from "@/components/ui/SoundControls";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { NeonButton } from "@/components/ui/NeonButton";
import { useSound } from "@/hooks/useSound";
import { useWindowSize } from "@/hooks/useWindowSize";
import { GameRecord } from "@/types/game";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const { playSfx } = useSound();

  const [games, setGames] = useState<GameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "multiplayer" | "ai">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchGames = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/games");
        const data = await res.json();
        if (data.success && Array.isArray(data.games)) {
          setGames(data.games);
        }
      } catch (err) {
        console.error("Failed to fetch games history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, [status]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Filter by mode
      if (filterMode === "multiplayer" && game.mode !== "multiplayer") return false;
      if (filterMode === "ai" && !game.mode.startsWith("ai")) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const pX = (game.playerX || "").toLowerCase();
        const pO = (game.playerO || "").toLowerCase();
        const mode = (game.mode || "").toLowerCase();
        return pX.includes(query) || pO.includes(query) || mode.includes(query);
      }

      return true;
    });
  }, [games, filterMode, searchQuery]);

  // Compute player result for each game
  const getGameResultInfo = (game: GameRecord) => {
    const currentUserId = session?.user?.id;
    const currentUserName = session?.user?.name;

    const isUserX =
      game.playerXId === currentUserId ||
      (Boolean(currentUserName) && game.playerX === currentUserName);
    const isUserO =
      game.playerOId === currentUserId ||
      (Boolean(currentUserName) && game.playerO === currentUserName);

    const opponentName = isUserX
      ? game.playerO
      : isUserO
      ? game.playerX
      : game.playerO;

    let result: "win" | "loss" | "draw" = "draw";

    if (game.winner === "draw") {
      result = "draw";
    } else if (game.winner === "X") {
      result = isUserX ? "win" : "loss";
    } else if (game.winner === "O") {
      result = isUserO ? "win" : "loss";
    } else {
      result = "draw";
    }

    return { result, opponentName, isUserX, isUserO };
  };

  // Stats computation
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;

    games.forEach((game) => {
      const { result } = getGameResultInfo(game);
      if (result === "win") wins++;
      else if (result === "loss") losses++;
      else draws++;
    });

    const total = games.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { total, wins, losses, draws, winRate };
  }, [games, session?.user]);

  const formatDate = (dateStr: string | Date) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent";
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingSpinner size="lg" text="Loading match history..." />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(12px, 2.5vw, 24px)",
        paddingBottom: "max(28px, env(safe-area-inset-bottom))",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "clamp(16px, 3vw, 24px)",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <RoundIconButton
            variant="blue"
            size={42}
            ariaLabel="Back to Lobby"
            onClick={() => {
              playSfx("click");
              router.push("/lobby");
            }}
          >
            <ArrowLeft style={{ width: "20px", height: "20px" }} />
          </RoundIconButton>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <History style={{ width: "24px", height: "24px", color: "var(--accent-x, #00A3FF)", flexShrink: 0 }} />
            <h1
              className="game-title-3d"
              style={{
                fontSize: "clamp(18px, 4vw, 28px)",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              My Games &amp; Replays
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SoundControls align="right" />
          <ThemeSwitcher align="right" />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ width: "100%", display: "flex", flexDirection: "column" }}>
        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
              borderRadius: "18px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary, #c2d6ff)", marginBottom: "4px", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Total Games
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-x, #00A3FF)", fontFamily: "var(--font-display)" }}>
              {stats.total}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
              borderRadius: "18px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary, #c2d6ff)", marginBottom: "4px", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Victories
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-green, #00E676)", fontFamily: "var(--font-display)" }}>
              {stats.wins}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
              borderRadius: "18px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary, #c2d6ff)", marginBottom: "4px", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Defeats
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-red, #FF3B30)", fontFamily: "var(--font-display)" }}>
              {stats.losses}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
              borderRadius: "18px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary, #c2d6ff)", marginBottom: "4px", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Draws
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent-o, #FFB703)", fontFamily: "var(--font-display)" }}>
              {stats.draws}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
              borderRadius: "18px",
              padding: "16px 12px",
              textAlign: "center",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)",
              gridColumn: isMobile ? "span 2" : "span 1",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-secondary, #c2d6ff)", marginBottom: "4px", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              Win Rate
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--brand-purple, #9D4EDD)", fontFamily: "var(--font-display)" }}>
              {stats.winRate}%
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Mode Tabs */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {[
              { id: "all" as const, label: "All Matches", icon: null },
              { id: "multiplayer" as const, label: "Multiplayer", icon: <Users size={14} /> },
              { id: "ai" as const, label: "vs AI", icon: <Bot size={14} /> },
            ].map((tab) => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    setFilterMode(tab.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    backgroundColor: isActive
                      ? "var(--accent-x, #00A3FF)"
                      : "var(--bg-card, rgba(14, 25, 66, 0.7))",
                    color: isActive ? "#FFFFFF" : "var(--text-secondary, #c2d6ff)",
                    border: isActive
                      ? "1.5px solid rgba(255, 255, 255, 0.5)"
                      : "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: isActive ? "0 4px 12px rgba(0, 163, 255, 0.35)" : "none",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div
            style={{
              position: "relative",
              minWidth: isMobile ? "100%" : "260px",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted, #8aa0d4)",
              }}
            />
            <input
              type="text"
              placeholder="Search opponent or mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                background: "var(--bg-card, rgba(14, 25, 66, 0.7))",
                border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
                borderRadius: "9999px",
                color: "var(--text-primary, #ffffff)",
                fontSize: "13px",
                fontFamily: "var(--font-body)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease",
              }}
            />
          </div>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.25))",
              borderRadius: "24px",
              padding: isMobile ? "36px 20px" : "48px 32px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(0, 163, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "1px solid rgba(0, 163, 255, 0.3)",
              }}
            >
              <History size={32} style={{ color: "var(--accent-x, #00A3FF)" }} />
            </div>
            <h3
              className="game-title-3d"
              style={{ fontSize: "20px", marginBottom: "8px" }}
            >
              {games.length === 0 ? "No Games Recorded Yet" : "No Matches Found"}
            </h3>
            <p
              style={{
                color: "var(--text-secondary, #c2d6ff)",
                fontSize: "14px",
                maxWidth: "420px",
                margin: "0 auto 24px",
                lineHeight: 1.5,
              }}
            >
              {games.length === 0
                ? "Every multiplayer match and AI game is automatically saved. Jump into a game to start watching replays!"
                : "Try adjusting your search query or filter to find past games."}
            </p>
            {games.length === 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <NeonButton
                  variant="primary"
                  size="md"
                  onClick={() => router.push("/lobby")}
                >
                  Play Multiplayer
                </NeonButton>
                <NeonButton
                  variant="purple"
                  size="md"
                  onClick={() => router.push("/play-ai")}
                >
                  Play vs AI
                </NeonButton>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <AnimatePresence>
              {filteredGames.map((game, idx) => {
                const { result, opponentName, isUserX } = getGameResultInfo(game);
                const movesArray = Array.isArray(game.moves) ? game.moves : [];
                const moveCount = movesArray.length;
                const isMulti = game.mode === "multiplayer";

                const resultBadgeColor =
                  result === "win"
                    ? "#00E676"
                    : result === "loss"
                    ? "#FF3B30"
                    : "#FFB703";

                const resultBg =
                  result === "win"
                    ? "rgba(0, 230, 118, 0.15)"
                    : result === "loss"
                    ? "rgba(255, 59, 48, 0.15)"
                    : "rgba(255, 183, 3, 0.15)";

                const resultGlow =
                  result === "win"
                    ? "rgba(0, 230, 118, 0.25)"
                    : result === "loss"
                    ? "rgba(255, 59, 48, 0.25)"
                    : "rgba(255, 183, 3, 0.25)";

                const resultLabel =
                  result === "win" ? "VICTORY" : result === "loss" ? "DEFEAT" : "DRAW";

                const modeLabel = isMulti
                  ? "Multiplayer"
                  : game.mode.replace("ai-", "AI ").toUpperCase();

                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{
                      background: "var(--bg-card, rgba(14, 25, 66, 0.75))",
                      border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.25))",
                      borderRadius: "18px",
                      padding: isMobile ? "14px 16px" : "16px 22px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      boxShadow: "0 6px 18px rgba(0, 0, 0, 0.2)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Left: Result Badge + Matchup */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, width: isMobile ? "100%" : "auto" }}>
                      {/* Result Pill */}
                      <div
                        style={{
                          width: "80px",
                          padding: "6px 0",
                          borderRadius: "9999px",
                          border: `1.5px solid ${resultBadgeColor}`,
                          background: resultBg,
                          color: resultBadgeColor,
                          fontSize: "12px",
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          textAlign: "center",
                          letterSpacing: "0.5px",
                          flexShrink: 0,
                          boxShadow: `0 2px 8px ${resultGlow}`,
                        }}
                      >
                        {resultLabel}
                      </div>

                      {/* Match Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: isMobile ? "15px" : "16px",
                              fontWeight: 700,
                              fontFamily: "var(--font-display)",
                              color: "var(--text-primary, #ffffff)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            vs {opponentName || "Opponent"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              background: isMulti ? "rgba(0, 163, 255, 0.15)" : "rgba(157, 78, 221, 0.15)",
                              border: `1px solid ${isMulti ? "rgba(0, 163, 255, 0.4)" : "rgba(157, 78, 221, 0.4)"}`,
                              color: isMulti ? "var(--accent-x, #00A3FF)" : "var(--brand-purple, #9D4EDD)",
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                            }}
                          >
                            {modeLabel}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary, #c2d6ff)",
                              fontFamily: "var(--font-display)",
                            }}
                          >
                            ({isUserX ? "X" : "O"})
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            fontSize: "12px",
                            color: "var(--text-muted, #8aa0d4)",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={12} />
                            {formatDate(game.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{moveCount} moves</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Watch Replay CTA Button */}
                    <div style={{ width: isMobile ? "100%" : "auto" }}>
                      <NeonButton
                        variant="blue"
                        size="sm"
                        onClick={() => {
                          playSfx("click");
                          router.push(`/replay/${game.id}`);
                        }}
                        style={{ width: isMobile ? "100%" : "auto", minWidth: isMobile ? "100%" : "140px" }}
                      >
                        <Play size={14} fill="#ffffff" />
                        <span>Watch Replay</span>
                      </NeonButton>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
