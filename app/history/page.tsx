"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  History,
  Play,
  ArrowLeft,
  Calendar,
  Clock,
  Swords,
  Bot,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Sparkles,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SoundControls } from "@/components/ui/SoundControls";
import { useSound } from "@/hooks/useSound";
import { useWindowSize } from "@/hooks/useWindowSize";
import { GameRecord } from "@/types/game";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile, isTablet } = useWindowSize();
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
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary, #050505)",
        }}
      >
        <LoadingSpinner variant="cyan" size="xl" text="Loading match history..." />
      </div>
    );
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <motion.button
              type="button"
              onClick={() => {
                playSfx("click");
                router.push("/lobby");
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
              {!isMobile && "Lobby"}
            </motion.button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <History style={{ color: "#00FFFF", width: "22px", height: "22px" }} />
              <h1
                className="neon-text-cyan"
                style={{
                  fontSize: isMobile ? "17px" : "20px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                My Games & Replays
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SoundControls compact={isMobile} align="right" />
            <ThemeSwitcher compact={isMobile} align="right" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "16px" : "24px" }}>
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
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "14px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", marginBottom: "4px" }}>
              Total Games
            </div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#00FFFF" }}>{stats.total}</div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "14px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", marginBottom: "4px" }}>
              Victories
            </div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#00FF41" }}>{stats.wins}</div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "14px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", marginBottom: "4px" }}>
              Defeats
            </div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#FF3131" }}>{stats.losses}</div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "14px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", marginBottom: "4px" }}>
              Draws
            </div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#FFD700" }}>{stats.draws}</div>
          </div>

          <div
            style={{
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "14px",
              padding: "14px",
              textAlign: "center",
              gridColumn: isMobile ? "span 2" : "span 1",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted, #9ca3af)", marginBottom: "4px" }}>
              Win Rate
            </div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#FF00FF" }}>{stats.winRate}%</div>
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
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "12px",
              padding: "4px",
              gap: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setFilterMode("all");
              }}
              style={{
                flex: 1,
                padding: "8px 14px",
                border: "none",
                borderRadius: "8px",
                background: filterMode === "all" ? "rgba(0,255,255,0.15)" : "transparent",
                color: filterMode === "all" ? "#00FFFF" : "var(--text-muted, #9ca3af)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              All Matches
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setFilterMode("multiplayer");
              }}
              style={{
                flex: 1,
                padding: "8px 14px",
                border: "none",
                borderRadius: "8px",
                background: filterMode === "multiplayer" ? "rgba(0,255,255,0.15)" : "transparent",
                color: filterMode === "multiplayer" ? "#00FFFF" : "var(--text-muted, #9ca3af)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <Users size={14} />
              Multiplayer
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setFilterMode("ai");
              }}
              style={{
                flex: 1,
                padding: "8px 14px",
                border: "none",
                borderRadius: "8px",
                background: filterMode === "ai" ? "rgba(0,255,255,0.15)" : "transparent",
                color: filterMode === "ai" ? "#00FFFF" : "var(--text-muted, #9ca3af)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <Bot size={14} />
              vs AI
            </button>
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
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted, #9ca3af)",
              }}
            />
            <input
              type="text"
              placeholder="Search opponent or mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                background: "var(--bg-card, rgba(13,13,13,0.8))",
                border: "1px solid var(--border-color, #262626)",
                borderRadius: "10px",
                color: "var(--text-primary, #ffffff)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card, rgba(13,13,13,0.8))",
              border: "1px solid var(--border-color, #262626)",
              borderRadius: "16px",
              padding: isMobile ? "32px 16px" : "48px 24px",
              textAlign: "center",
            }}
          >
            <History size={48} style={{ color: "var(--text-muted, #6b7280)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
              {games.length === 0 ? "No Games Recorded Yet" : "No Matches Found"}
            </h3>
            <p
              style={{
                color: "var(--text-muted, #9ca3af)",
                fontSize: "14px",
                maxWidth: "400px",
                margin: "0 auto 24px",
              }}
            >
              {games.length === 0
                ? "Every multiplayer match and AI game is automatically saved. Jump into a game to start watching replays!"
                : "Try adjusting your search query or filter to find past games."}
            </p>
            {games.length === 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <motion.button
                  type="button"
                  onClick={() => router.push("/lobby")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "10px 20px",
                    background: "rgba(0,255,255,0.1)",
                    border: "2px solid #00FFFF",
                    borderRadius: "10px",
                    color: "#00FFFF",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Play Multiplayer
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => router.push("/play-ai")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: "10px 20px",
                    background: "rgba(0,255,65,0.1)",
                    border: "2px solid #00FF41",
                    borderRadius: "10px",
                    color: "#00FF41",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Play vs AI
                </motion.button>
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
                    ? "#00FF41"
                    : result === "loss"
                    ? "#FF3131"
                    : "#FFD700";

                const resultBg =
                  result === "win"
                    ? "rgba(0,255,65,0.1)"
                    : result === "loss"
                    ? "rgba(255,49,49,0.1)"
                    : "rgba(255,215,0,0.1)";

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
                      background: "var(--bg-card, rgba(13,13,13,0.85))",
                      border: "1px solid var(--border-color, #262626)",
                      borderRadius: "14px",
                      padding: isMobile ? "14px" : "16px 20px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      justifyContent: "space-between",
                      gap: "14px",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#00FFFF";
                      e.currentTarget.style.boxShadow = "0 0 15px rgba(0,255,255,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color, #262626)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Left: Result Badge + Matchup */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
                      {/* Result Pill */}
                      <div
                        style={{
                          width: "72px",
                          padding: "6px 0",
                          borderRadius: "8px",
                          border: `1px solid ${resultBadgeColor}`,
                          background: resultBg,
                          color: resultBadgeColor,
                          fontSize: "12px",
                          fontWeight: 800,
                          textAlign: "center",
                          letterSpacing: "0.5px",
                          flexShrink: 0,
                        }}
                      >
                        {resultLabel}
                      </div>

                      {/* Match Details */}
                      <div>
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
                              color: "var(--text-primary, #ffffff)",
                            }}
                          >
                            vs {opponentName || "Opponent"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: isMulti ? "rgba(0,255,255,0.12)" : "rgba(255,0,255,0.12)",
                              border: `1px solid ${isMulti ? "rgba(0,255,255,0.3)" : "rgba(255,0,255,0.3)"}`,
                              color: isMulti ? "#00FFFF" : "#FF00FF",
                              fontWeight: 600,
                            }}
                          >
                            {modeLabel}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted, #9ca3af)",
                            }}
                          >
                            (You were {isUserX ? "X" : "O"})
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            fontSize: "12px",
                            color: "var(--text-muted, #9ca3af)",
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
                      <motion.button
                        type="button"
                        onClick={() => {
                          playSfx("click");
                          router.push(`/replay/${game.id}`);
                        }}
                        whileHover={{
                          scale: 1.05,
                          boxShadow: "0 0 16px rgba(0,255,255,0.5)",
                        }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          width: isMobile ? "100%" : "auto",
                          padding: "8px 18px",
                          borderRadius: "10px",
                          border: "2px solid #00FFFF",
                          background: "rgba(0,255,255,0.08)",
                          color: "#00FFFF",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          textShadow: "0 0 8px rgba(0,255,255,0.5)",
                          transition: "all 0.2s",
                        }}
                      >
                        <Play size={14} fill="#00FFFF" />
                        Watch Replay
                      </motion.button>
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

