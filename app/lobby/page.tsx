"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonInput } from "@/components/ui/NeonInput";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Copy, Check, Users, Cpu, Menu, X as XIcon, LogOut, Loader2, Timer, Eye, RefreshCw, History } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import * as Switch from "@radix-ui/react-switch";
import { getSocket } from "@/lib/socket-client";
import { useWindowSize } from "@/hooks/useWindowSize";
import { SoundControls } from "@/components/ui/SoundControls";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useSound } from "@/hooks/useSound";

type GameMode = "multiplayer" | "ai";
type Difficulty = "easy" | "medium" | "hard";

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile, isTablet, isDesktop } = useWindowSize();
  const [gameMode, setGameMode] = useState<GameMode>("multiplayer");
  const [isPublic, setIsPublic] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; id: string } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerSymbolAI, setPlayerSymbolAI] = useState<"X" | "O">("X");
  const [turnDuration, setTurnDuration] = useState<number>(15);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [isLoadingPublicRooms, setIsLoadingPublicRooms] = useState(false);

  const { playSfx } = useSound();
  const socket = getSocket();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/scores?game=tictactoe");
        const data = await res.json();
        if (data.success) setLeaderboard(data.leaderboard);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("room-created", (data: any) => {
      console.log("[Lobby] room-created:", data);
      const code = data?.roomCode || data?.room?.code;
      const id = data?.roomId || data?.room?.id;
      if (code) setRoomCode(code);
      if (id) setCreatedRoom({ code, id });
      setIsCreating(false);
      toast.success("Room created! Share the code.");
      socket.emit("get-public-rooms");
    });

    socket.on("room-joined", (data: any) => {
      console.log("[Lobby] room-joined:", data);
      const id = data?.roomId || data?.room?.id;
      if (id) {
        toast.success("Joined room!");
        router.push(`/room/${id}`);
      } else {
        console.error("[Lobby] roomId undefined!", data);
        setJoinError("Failed to join room");
        setIsJoining(false);
      }
    });

    socket.on("player-joined", (data: any) => {
      console.log("[Lobby] player-joined:", data);
      const id = data?.roomId || data?.room?.id;
      if (id) {
        toast.success("Opponent joined!");
        router.push(`/room/${id}`);
      }
    });

    socket.on("public-rooms-list", (data: any) => {
      console.log("[Lobby] public-rooms-list:", data);
      if (Array.isArray(data?.rooms)) {
        setPublicRooms(data.rooms);
      }
      setIsLoadingPublicRooms(false);
    });

    socket.on("error", (data) => {
      console.error("[Lobby] error:", data);
      setJoinError(data.message);
      toast.error(data.message);
      setIsJoining(false);
      setIsCreating(false);
      if (data?.message?.includes("Room not found") || data?.message?.includes("not found")) {
        setRoomCode("");
      }
    });

    // Initial fetch of public rooms and periodic refresh
    socket.emit("get-public-rooms");
    const interval = setInterval(() => {
      socket.emit("get-public-rooms");
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.off("room-created");
      socket.off("room-joined");
      socket.off("player-joined");
      socket.off("public-rooms-list");
      socket.off("error");
    };
  }, [socket, router]);

  const handleCreateRoom = () => {
    playSfx("click");
    if (!session?.user) {
      toast.error("Please log in");
      return;
    }
    setIsCreating(true);
    setJoinError(null);
    socket?.emit("create-room", {
      userId: session.user.id,
      userName: session.user.name || "Player",
      isPublic,
      turnDuration,
    });
  };

  const handleJoinRoom = () => {
    playSfx("click");
    if (!session?.user) {
      toast.error("Please log in");
      return;
    }
    const trimmed = roomCode.trim();
    if (trimmed.length < 4) {
      setJoinError("Enter a valid 4-character code");
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    const targetId = trimmed.length === 4 ? trimmed.toUpperCase() : trimmed;
    socket?.emit("join-room", {
      roomId: targetId,
      userId: session.user.id,
      userName: session.user.name || "Player",
    });
  };

  const handleWatchRoom = (codeToWatch?: string) => {
    playSfx("click");
    if (!session?.user) {
      toast.error("Please log in");
      return;
    }
    const rawTarget = (codeToWatch || roomCode).trim();
    if (rawTarget.length < 4) {
      setJoinError("Enter a valid 4-character code to spectate");
      return;
    }
    // Only uppercase 4-character room codes; preserve UUIDs as-is
    const targetCode = rawTarget.length === 4 ? rawTarget.toUpperCase() : rawTarget;
    router.push(`/room/${targetCode}?spectate=true`);
  };

  const handlePlayAI = () => {
    playSfx("click");
    router.push(`/play-ai?difficulty=${difficulty}&symbol=${playerSymbolAI}`);
  };

  const handleLogout = () => {
    playSfx("click");
    setIsMenuOpen(false);
    router.push("/");
  };

  const handleCopyCode = async () => {
    if (createdRoom) {
      await navigator.clipboard.writeText(createdRoom.code);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 4) setRoomCode(value);
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary, #050505)" }}>
        <LoadingSpinner variant="cyan" size="xl" text="Loading..." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary, #050505)", position: "relative" }}>
      <Toaster position="top-right" />

      {/* Header - Horizontal on Desktop/Tablet, Menu on Mobile */}
      <header style={{
        padding: isMobile ? "10px 16px" : "16px",
        borderBottom: "1px solid var(--border-color, #1a1a1a)",
        backgroundColor: "var(--bg-card, rgba(13,13,13,0.95))",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users style={{
              width: isMobile ? "20px" : "24px",
              height: isMobile ? "20px" : "24px",
              color: "#00FFFF",
              flexShrink: 0,
            }} />
            <h1 className="neon-text-cyan" style={{
              fontSize: isMobile ? "16px" : "18px",
              fontWeight: "bold",
              margin: 0,
              whiteSpace: "nowrap",
            }}>Game Lobby</h1>
          </div>

          {/* Desktop/Tablet: Horizontal UserAvatar + Logout Button */}
          {!isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <SoundControls align="right" />
              <ThemeSwitcher align="right" />
              <motion.button
                type="button"
                onClick={() => {
                  playSfx("click");
                  router.push("/history");
                }}
                whileHover={{
                  scale: 1.05,
                  y: -2,
                  boxShadow: "0 0 18px rgba(0,255,255,0.7)",
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  minHeight: "40px",
                  border: "2px solid #00FFFF",
                  borderRadius: "10px",
                  background: "rgba(0,255,255,0.06)",
                  color: "#00FFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  textShadow: "0 0 8px #00FFFF",
                  boxShadow: "0 0 10px rgba(0,255,255,0.25)",
                }}
              >
                <History size={16} />
                My Games
              </motion.button>
              {session?.user && <UserAvatar userName={session.user.name} userEmail={session.user.email} />}
              
              
              {/* <NeonButton
                variant="red"
                size="sm"
                onClick={handleLogout}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                }}
              >
                <LogOut style={{ width: "16px", height: "16px" }} />
                Logout
              </NeonButton> */}
              <motion.button
  type="button"
  onClick={handleLogout}
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
    gap: "8px",
    padding: "8px 16px",
    minHeight: "40px",
    border: "2px solid #FF3131",
    borderRadius: "10px",
    background: "rgba(255,49,49,0.05)",
    color: "#FF3131",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    textShadow: "0 0 8px #FF3131",
    boxShadow: "0 0 12px rgba(255,49,49,0.35)",
    transition: "all .3s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "rgba(255,49,49,.12)";
    e.currentTarget.style.borderColor = "#FF6666";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = "rgba(255,49,49,.05)";
    e.currentTarget.style.borderColor = "#FF3131";
  }}
>
  <LogOut size={16} />
  Logout
</motion.button>
            </div>
          ) : (
            /* Mobile: Sound Controls + Theme Switcher + Hamburger Menu */
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SoundControls compact align="right" />
              <ThemeSwitcher compact align="right" />
              <button
                onClick={() => {
                  playSfx("click");
                  setIsMenuOpen(!isMenuOpen);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #00FFFF",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "44px",
                  minWidth: "44px",
                }}
              >
                {isMenuOpen ? (
                  <XIcon style={{ width: "24px", height: "24px", color: "#00FFFF" }} />
                ) : (
                  <Menu style={{ width: "24px", height: "24px", color: "#00FFFF" }} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMenuOpen && isMobile && session?.user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                marginTop: "16px",
                padding: "16px",
                backgroundColor: "var(--bg-card, rgba(13,13,13,0.95))",
                borderRadius: "12px",
                border: "1px solid var(--border-color, #1a1a1a)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* User Info */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                backgroundColor: "rgba(0,255,255,0.05)",
                borderRadius: "8px",
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00FFFF, #FF00FF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  color: "#050505",
                  fontSize: "18px",
                  flexShrink: 0,
                }}>
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <p style={{
                    fontWeight: "bold",
                    color: "#ffffff",
                    margin: 0,
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {session.user.name}
                  </p>
                  <p style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    margin: "4px 0 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {session.user.email}
                  </p>
                </div>
              </div>

              {/* My Games Button */}
              <NeonButton
                variant="cyan"
                onClick={() => {
                  playSfx("click");
                  setIsMenuOpen(false);
                  router.push("/history");
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  minHeight: "48px",
                  justifyContent: "center",
                }}
              >
                <History style={{ width: "18px", height: "18px" }} />
                My Games & Replays
              </NeonButton>

              {/* Logout Button */}
              <NeonButton
                variant="red"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  minHeight: "48px",
                  justifyContent: "center",
                }}
              >
                <LogOut style={{ width: "18px", height: "18px" }} />
                Logout
              </NeonButton>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content - Responsive */}
      <main style={{
        maxWidth: "1120px",
        margin: "0 auto",
        padding: isMobile ? "16px" : "24px 16px",
      }}>

        {/* Game Mode Toggle - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: isMobile ? "16px" : "24px",
            padding: "6px",
            backgroundColor: "#111",
            borderRadius: "50px",
            maxWidth: "400px",
            margin: "0 auto 16px",
          }}
        >
          <button
            onClick={() => {
              playSfx("click");
              setGameMode("multiplayer");
            }}
            style={{
              flex: 1,
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "50px",
              border: "none",
              cursor: "pointer",
              fontWeight: gameMode === "multiplayer" ? "bold" : "normal",
              backgroundColor: gameMode === "multiplayer" ? "#00FFFF" : "transparent",
              color: gameMode === "multiplayer" ? "#000" : "#666",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: isMobile ? "12px" : "14px",
              minWidth: 0,
            }}
          >
            <Users style={{
              width: isMobile ? "14px" : "18px",
              height: isMobile ? "14px" : "18px",
              flexShrink: 0,
            }} />
            <span style={{ whiteSpace: "nowrap" }}>Multiplayer</span>
          </button>
          <button
            onClick={() => {
              playSfx("click");
              setGameMode("ai");
            }}
            style={{
              flex: 1,
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "50px",
              border: "none",
              cursor: "pointer",
              fontWeight: gameMode === "ai" ? "bold" : "normal",
              backgroundColor: gameMode === "ai" ? "#00FF41" : "transparent",
              color: gameMode === "ai" ? "#000" : "#666",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: isMobile ? "12px" : "14px",
              minWidth: 0,
            }}
          >
            <Cpu style={{
              width: isMobile ? "14px" : "18px",
              height: isMobile ? "14px" : "18px",
              flexShrink: 0,
            }} />
            <span style={{ whiteSpace: "nowrap" }}>Human vs Computer</span>
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {gameMode === "multiplayer" ? (
            <motion.div
              key="multiplayer"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: isMobile ? "12px" : "16px",
                marginBottom: isMobile ? "20px" : "24px",
              }}>

                {/* Create Room */}
                <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }}>
                  <NeonCard variant="cyan" style={{ height: "100%" }} glow>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: isMobile ? "12px" : "16px" }}>
                      <Plus style={{
                        width: isMobile ? "18px" : "20px",
                        height: isMobile ? "18px" : "20px",
                        color: "#00FFFF",
                        flexShrink: 0,
                      }} />
                      <h2 className="neon-text-cyan" style={{
                        fontSize: isMobile ? "16px" : "18px",
                        fontWeight: "bold",
                        margin: 0,
                      }}>Create Room</h2>
                    </div>

                    {!createdRoom ? (
                      <>
                        <div style={{
                          marginBottom: isMobile ? "12px" : "16px",
                          padding: isMobile ? "10px" : "12px",
                          backgroundColor: "rgba(0,255,255,0.05)",
                          borderRadius: "12px",
                          border: "1px solid rgba(0,255,255,0.2)",
                        }}>
                          <p style={{
                            color: "#00FFFF",
                            fontSize: isMobile ? "12px" : "13px",
                            fontWeight: 600,
                            marginBottom: isMobile ? "6px" : "8px",
                          }}>📋 How to Create a Room</p>
                          <ul style={{
                            color: "#9ca3af",
                            fontSize: isMobile ? "11px" : "12px",
                            margin: 0,
                            paddingLeft: isMobile ? "14px" : "16px",
                            lineHeight: "1.5",
                          }}>
                            <li>Click "Create Room" button below</li>
                            <li>Share the 4-character code with your friend</li>
                            <li>Wait for your friend to join using the code</li>
                            <li>Game starts automatically when both players are ready</li>
                          </ul>
                        </div>

                        {/* Turn Timer Selector */}
                        <div style={{
                          marginBottom: isMobile ? "14px" : "18px",
                          padding: isMobile ? "10px 12px" : "12px 14px",
                          backgroundColor: "rgba(255,255,255,0.02)",
                          borderRadius: "12px",
                          border: "1px solid var(--border-color, #1a1a1a)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Timer style={{ width: "15px", height: "15px", color: "#00FFFF" }} />
                              <span style={{ fontSize: isMobile ? "12px" : "13px", fontWeight: 600, color: "var(--text-main, #e5e7eb)" }}>
                                Turn Timer
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--text-muted, #9ca3af)" }}>
                              {turnDuration === 0 ? "No limit" : `${turnDuration}s / turn`}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                            {[
                              { label: "No Timer", value: 0 },
                              { label: "15s", value: 15 },
                              { label: "30s", value: 30 },
                            ].map((opt) => {
                              const isSelected = turnDuration === opt.value;
                              return (
                                <motion.button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    playSfx("click");
                                    setTurnDuration(opt.value);
                                  }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  style={{
                                    padding: isMobile ? "7px 8px" : "8px 12px",
                                    borderRadius: "8px",
                                    border: isSelected ? "2px solid #00FFFF" : "1px solid var(--border-color, #2a2a2a)",
                                    background: isSelected ? "rgba(0, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                                    color: isSelected ? "#00FFFF" : "var(--text-muted, #9ca3af)",
                                    fontWeight: isSelected ? 700 : 500,
                                    fontSize: isMobile ? "12px" : "13px",
                                    cursor: "pointer",
                                    boxShadow: isSelected ? "0 0 12px rgba(0, 255, 255, 0.35)" : "none",
                                    textShadow: isSelected ? "0 0 6px #00FFFF" : "none",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {opt.label}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                        {/* <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                          <NeonButton
                            variant="cyan"
                            fullWidth
                            onClick={handleCreateRoom}
                            isLoading={isCreating}
                            size="lg"
                            style={{ minHeight: isMobile ? "48px" : "auto", maxWidth: isMobile ? "300px" : "400px" }}
                          >
                            <Plus style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                            Create Room
                          </NeonButton>
                        </div> */}
                        <div
  style={{
    display: "flex",
    justifyContent: "center",
    width: "100%",
  }}
>
  <motion.button
    type="button"
    onClick={handleCreateRoom}
    disabled={isCreating}
    whileHover={
      !isCreating
        ? {
            scale: 1.03,
            y: -2,
            boxShadow: "0 0 25px rgba(0,255,255,0.7)",
          }
        : {}
    }
    whileTap={!isCreating ? { scale: 0.97 } : {}}
    transition={{ duration: 0.2 }}
    style={{
      width: "100%",
      maxWidth: isMobile ? "300px" : "400px",
      minHeight: isMobile ? "48px" : "52px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      border: "2px solid #00FFFF",
      borderRadius: "12px",
      background: "rgba(0,255,255,0.05)",
      color: "#00FFFF",
      fontSize: "16px",
      fontWeight: 600,
      cursor: isCreating ? "not-allowed" : "pointer",
      textShadow: "0 0 8px #00FFFF",
      boxShadow: "0 0 15px rgba(0,255,255,0.35)",
      opacity: isCreating ? 0.6 : 1,
      transition: "all .3s ease",
    }}
    onMouseEnter={(e) => {
      if (!isCreating) {
        e.currentTarget.style.background = "rgba(0,255,255,.10)";
        e.currentTarget.style.borderColor = "#66FFFF";
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(0,255,255,.05)";
      e.currentTarget.style.borderColor = "#00FFFF";
    }}
  >
    {isCreating ? (
      <>
        <Loader2
          size={20}
          style={{ animation: "spin 1s linear infinite" }}
        />
        Creating...
      </>
    ) : (
      <>
        <Plus size={isMobile ? 16 : 20} />
        Create Room
      </>
    )}
  </motion.button>
</div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <p style={{
                          color: "#9ca3af",
                          marginBottom: isMobile ? "8px" : "12px",
                          fontSize: isMobile ? "12px" : "14px",
                        }}>Room Code</p>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: isMobile ? "8px" : "12px",
                          marginBottom: isMobile ? "12px" : "16px",
                          flexWrap: "wrap",
                        }}>
                          <span style={{
                            fontSize: isMobile ? "clamp(28px, 8vw, 36px)" : "clamp(32px, 10vw, 48px)",
                            fontWeight: "bold",
                            color: "#00FFFF",
                            fontFamily: "monospace",
                            letterSpacing: "0.2em",
                            wordBreak: "break-all",
                          }}>
                            {createdRoom.code}
                          </span>
                          <NeonButton variant="yellow" size="md" onClick={handleCopyCode}>
                            {copied ? (
                              <Check style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                            ) : (
                              <Copy style={{ width: isMobile ? "16px" : "20px", height: isMobile ? "16px" : "20px" }} />
                            )}
                          </NeonButton>
                        </div>
                        {copied && (
                          <p style={{
                            color: "#00FF41",
                            fontSize: isMobile ? "12px" : "14px",
                            marginBottom: isMobile ? "8px" : "12px",
                          }}>✓ Code copied!</p>
                        )}
                        <p style={{ color: "#9ca3af", fontSize: isMobile ? "12px" : "14px" }}>
                          Share this code with your friend
                        </p>
                      </div>
                    )}
                  </NeonCard>
                </motion.div>

                {/* Join Room */}
                <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <NeonCard variant="pink" style={{ height: "100%" }} glow>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: isMobile ? "12px" : "16px" }}>
                      <Users style={{
                        width: isMobile ? "18px" : "20px",
                        height: isMobile ? "18px" : "20px",
                        color: "#FF00FF",
                        flexShrink: 0,
                      }} />
                      <h2 className="neon-text-pink" style={{
                        fontSize: isMobile ? "16px" : "18px",
                        fontWeight: "bold",
                        margin: 0,
                      }}>Join Room</h2>
                    </div>

                    {/* <form onSubmit={(e) => { e.preventDefault(); handleJoinRoom(); }} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: isMobile ? "10px" : "12px",
                    }}>
                      <NeonInput
                        label="Room Code"
                        placeholder="ABCD"
                        value={roomCode}
                        onChange={handleCodeChange}
                        variant="pink"
                        maxLength={4}
                        style={{
                          textAlign: "center",
                          fontSize: isMobile ? "clamp(18px, 5vw, 24px)" : "20px",
                          letterSpacing: "0.3em",
                          fontFamily: "monospace",
                        }}
                      />
                      {joinError && (
                        <div style={{
                          padding: isMobile ? "10px" : "12px",
                          backgroundColor: "rgba(255,49,49,0.1)",
                          border: "1px solid #FF3131",
                          borderRadius: "12px",
                          color: "#FF3131",
                          fontSize: isMobile ? "12px" : "14px",
                          textAlign: "center",
                        }}>
                          {joinError}
                        </div>
                      )}
                      <NeonButton
                        type="submit"
                        variant="pink"
                        fullWidth
                        isLoading={isJoining}
                        disabled={roomCode.length < 4}
                        size="lg"
                        style={{ minHeight: isMobile ? "48px" : "auto", maxWidth: isMobile ? "300px" : "400px" }}
                      >
                        Join Room
                      </NeonButton>
                    </form> */}
                    <form
  onSubmit={(e) => {
    e.preventDefault();
    handleJoinRoom();
  }}
  style={{
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "10px" : "12px",
    alignItems: "center", // 👈 Center sab kuch
  }}
>
  <div style={{ width: "100%" }}>
    <NeonInput
      label="Room Code"
      placeholder="ABCD"
      value={roomCode}
      onChange={handleCodeChange}
      variant="pink"
      maxLength={4}
      style={{
        textAlign: "center",
        fontSize: isMobile ? "clamp(18px, 5vw, 24px)" : "20px",
        letterSpacing: "0.3em",
        fontFamily: "monospace",
      }}
    />
  </div>

  {joinError && (
    <div
      style={{
        width: "100%",
        padding: isMobile ? "10px" : "12px",
        backgroundColor: "rgba(255,49,49,0.1)",
        border: "1px solid #FF3131",
        borderRadius: "12px",
        color: "#FF3131",
        fontSize: isMobile ? "12px" : "14px",
        textAlign: "center",
      }}
    >
      {joinError}
    </div>
  )}

  <div style={{
    display: "flex",
    gap: "10px",
    width: "100%",
    maxWidth: isMobile ? "300px" : "400px",
  }}>
    <motion.button
      type="submit"
      disabled={isJoining || roomCode.length < 4}
      whileHover={
        !isJoining && roomCode.length >= 4
          ? { scale: 1.03, y: -2 }
          : {}
      }
      whileTap={
        !isJoining && roomCode.length >= 4
          ? { scale: 0.97 }
          : {}
      }
      transition={{ duration: 0.2 }}
      style={{
        flex: 1,
        minHeight: isMobile ? "48px" : "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #FF00FF",
        borderRadius: "14px",
        background: "transparent",
        color: "#FF00FF",
        fontSize: isMobile ? "15px" : "18px",
        fontWeight: 700,
        boxShadow: "0 0 15px rgba(255,0,255,.35)",
        cursor:
          isJoining || roomCode.length < 4
            ? "not-allowed"
            : "pointer",
        opacity:
          isJoining || roomCode.length < 4
            ? 0.5
            : 1,
      }}
    >
      {isJoining ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Joining...
        </>
      ) : (
        "Join Room"
      )}
    </motion.button>

    <motion.button
      type="button"
      onClick={() => handleWatchRoom()}
      disabled={roomCode.length < 4}
      whileHover={
        roomCode.length >= 4
          ? { scale: 1.03, y: -2, boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)" }
          : {}
      }
      whileTap={
        roomCode.length >= 4
          ? { scale: 0.97 }
          : {}
      }
      transition={{ duration: 0.2 }}
      style={{
        padding: isMobile ? "0 14px" : "0 20px",
        minHeight: isMobile ? "48px" : "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        border: "2px solid #00FFFF",
        borderRadius: "14px",
        background: "rgba(0, 255, 255, 0.05)",
        color: "#00FFFF",
        fontSize: isMobile ? "14px" : "16px",
        fontWeight: 700,
        boxShadow: "0 0 15px rgba(0, 255, 255, 0.35)",
        cursor: roomCode.length < 4 ? "not-allowed" : "pointer",
        opacity: roomCode.length < 4 ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
      title="Watch this match as a spectator"
    >
      <Eye style={{ width: isMobile ? "16px" : "18px", height: isMobile ? "16px" : "18px" }} />
      <span>Watch</span>
    </motion.button>
  </div>
</form>
                  </NeonCard>
                </motion.div>
              </div>

              {/* Public Rooms List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ marginTop: isMobile ? "16px" : "24px" }}
              >
                <NeonCard variant="default" glow style={{ width: "100%" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: isMobile ? "12px" : "16px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Eye style={{ width: "20px", height: "20px", color: "var(--accent-x, #00FFFF)" }} />
                      <h2 className="neon-text-cyan" style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "bold", margin: 0 }}>
                        Live Matches & Public Rooms
                      </h2>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        playSfx("click");
                        setIsLoadingPublicRooms(true);
                        socket?.emit("get-public-rooms");
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                        color: "var(--text-muted, #9ca3af)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <RefreshCw style={{ width: "12px", height: "12px", animation: isLoadingPublicRooms ? "spin 1s linear infinite" : "none" }} />
                      <span>Refresh</span>
                    </motion.button>
                  </div>

                  {publicRooms.length === 0 ? (
                    <div style={{
                      textAlign: "center",
                      padding: isMobile ? "24px 12px" : "32px 16px",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      borderRadius: "12px",
                      border: "1px dashed var(--border-color, rgba(255, 255, 255, 0.12))",
                    }}>
                      <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: "14px", margin: "0 0 6px" }}>
                        No public rooms active right now
                      </p>
                      <p style={{ color: "var(--text-muted, #6b7280)", fontSize: "12px", margin: 0 }}>
                        Create a room above to play with friends or wait for opponents!
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(310px, 1fr))",
                      gap: isMobile ? "10px" : "14px",
                    }}>
                      {publicRooms.map((room) => {
                        const isFull = (room.playerCount || 0) >= 2;
                        const p1 = room.player1?.name || room.creatorName || "Player 1";
                        const p2 = room.player2?.name || (isFull ? "Player 2" : "Waiting for opponent...");
                        const watchers = room.spectatorCount || 0;

                        return (
                          <motion.div
                            key={room.id || room.code}
                            whileHover={{ y: -2 }}
                            style={{
                              padding: "14px 16px",
                              borderRadius: "12px",
                              backgroundColor: "var(--bg-card, rgba(13, 13, 13, 0.8))",
                              border: "1px solid var(--border-color, rgba(0, 255, 255, 0.18))",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{
                                fontSize: "16px",
                                fontWeight: 800,
                                fontFamily: "monospace",
                                letterSpacing: "1.5px",
                                color: "var(--accent-x, #00FFFF)",
                                textShadow: "0 0 8px rgba(0,255,255,0.4)",
                              }}>
                                {room.code}
                              </span>

                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: isFull ? "#FFD700" : "#00FF41",
                                backgroundColor: isFull ? "rgba(255, 215, 0, 0.12)" : "rgba(0, 255, 65, 0.12)",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                border: `1px solid ${isFull ? "rgba(255, 215, 0, 0.3)" : "rgba(0, 255, 65, 0.3)"}`,
                              }}>
                                <span>{room.playerCount}/2 players • {watchers} watching</span>
                              </div>
                            </div>

                            <div style={{ fontSize: "13px", color: "var(--text-main, #e5e7eb)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 600 }}>{p1}</span>
                              <span style={{ color: "var(--text-muted, #6b7280)", fontSize: "11px" }}>vs</span>
                              <span style={{
                                fontWeight: room.player2 ? 600 : 400,
                                color: room.player2 ? "var(--text-main, #e5e7eb)" : "var(--text-muted, #9ca3af)",
                                fontStyle: room.player2 ? "normal" : "italic",
                              }}>
                                {p2}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                              {!isFull && (
                                <motion.button
                                  type="button"
                                  onClick={() => {
                                    playSfx("click");
                                    router.push(`/room/${room.id || room.code}`);
                                  }}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(0, 255, 65, 0.12)",
                                    border: "1.5px solid #00FF41",
                                    color: "#00FF41",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    boxShadow: "0 0 10px rgba(0, 255, 65, 0.25)",
                                  }}
                                >
                                  Join Game
                                </motion.button>
                              )}

                              {(() => {
                                const isSpecFull = Boolean(room.isSpectatorFull || (typeof room.spectatorCount === "number" && room.spectatorCount >= (room.maxSpectators || 100)));
                                return (
                                  <motion.button
                                    type="button"
                                    disabled={isSpecFull}
                                    onClick={() => {
                                      if (isSpecFull) {
                                        toast.error("Room is full for spectators");
                                        return;
                                      }
                                      playSfx("click");
                                      handleWatchRoom(room.id || room.code);
                                    }}
                                    whileHover={isSpecFull ? undefined : { scale: 1.03 }}
                                    whileTap={isSpecFull ? undefined : { scale: 0.97 }}
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "6px",
                                      padding: "8px 12px",
                                      borderRadius: "8px",
                                      backgroundColor: isSpecFull ? "rgba(100, 116, 139, 0.12)" : "rgba(0, 255, 255, 0.12)",
                                      border: isSpecFull ? "1.5px solid rgba(148, 163, 184, 0.3)" : "1.5px solid #00FFFF",
                                      color: isSpecFull ? "var(--text-muted, #94a3b8)" : "#00FFFF",
                                      fontWeight: 700,
                                      fontSize: "12px",
                                      cursor: isSpecFull ? "not-allowed" : "pointer",
                                      opacity: isSpecFull ? 0.6 : 1,
                                      boxShadow: isSpecFull ? "none" : "0 0 10px rgba(0, 255, 255, 0.25)",
                                    }}
                                  >
                                    <Eye style={{ width: "13px", height: "13px" }} />
                                    <span>{isSpecFull ? "Full" : "Watch"}</span>
                                  </motion.button>
                                );
                              })()}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </NeonCard>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              style={{ maxWidth: "600px", margin: "0 auto" }}
            >
              <NeonCard variant="green" glow style={{ textAlign: "center" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: isMobile ? "6px" : "8px",
                  marginBottom: isMobile ? "16px" : "20px",
                  flexWrap: "wrap",
                }}>
                  <Cpu style={{
                    width: isMobile ? "28px" : "32px",
                    height: isMobile ? "28px" : "32px",
                    color: "#00FF41",
                    flexShrink: 0,
                  }} />
                  <h2 className="neon-text-green" style={{
                    fontSize: isMobile ? "18px" : "20px",
                    fontWeight: "bold",
                    margin: 0,
                  }}>HUMAN V/S COMPUTER</h2>
                </div>

                {/* Pick Symbol */}
                <div style={{ marginBottom: isMobile ? "14px" : "18px" }}>
                  <p style={{
                    color: "#9ca3af",
                    marginBottom: isMobile ? "6px" : "8px",
                    fontSize: isMobile ? "13px" : "15px",
                  }}>Play As</p>
                  <div style={{
                    display: "flex",
                    gap: isMobile ? "8px" : "12px",
                    justifyContent: "center",
                  }}>
                    {(["X", "O"] as const).map((sym) => {
                      const isSel = playerSymbolAI === sym;
                      const symColor = sym === "X" ? "var(--accent-x, #00FFFF)" : "var(--accent-o, #FF00FF)";
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            playSfx("click");
                            setPlayerSymbolAI(sym);
                          }}
                          style={{
                            padding: isMobile ? "6px 14px" : "8px 20px",
                            borderRadius: "8px",
                            border: `2px solid ${isSel ? symColor : "var(--border-color, #1a1a1a)"}`,
                            backgroundColor: isSel ? "rgba(255,255,255,0.08)" : "var(--bg-card, transparent)",
                            color: isSel ? symColor : "var(--text-muted, #666)",
                            fontWeight: isSel ? "bold" : "normal",
                            cursor: "pointer",
                            fontSize: isMobile ? "12px" : "13px",
                            boxShadow: isSel ? `0 0 12px ${symColor}44` : "none",
                            transition: "all 0.2s",
                          }}
                        >
                          {sym} {sym === "X" ? "(You move 1st)" : "(AI moves 1st)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: isMobile ? "20px" : "24px" }}>
                  <p style={{
                    color: "#9ca3af",
                    marginBottom: isMobile ? "10px" : "12px",
                    fontSize: isMobile ? "13px" : "15px",
                  }}>Select Difficulty</p>
                  <div style={{
                    display: "flex",
                    gap: isMobile ? "6px" : "8px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}>
                    {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => {
                          playSfx("click");
                          setDifficulty(diff);
                        }}
                        style={{
                          padding: isMobile ? "8px 16px" : "10px 20px",
                          borderRadius: "8px",
                          border: `2px solid ${difficulty === diff ? "var(--neon-green, #00FF41)" : "var(--border-color, #1a1a1a)"}`,
                          backgroundColor: difficulty === diff ? "rgba(0,255,65,0.1)" : "var(--bg-card, transparent)",
                          color: difficulty === diff ? "var(--neon-green, #00FF41)" : "var(--text-muted, #666)",
                          fontWeight: difficulty === diff ? "bold" : "normal",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: isMobile ? "11px" : "13px",
                          minHeight: isMobile ? "44px" : "auto",
                        }}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                  <p style={{
                    color: "var(--text-muted, #6b7280)",
                    fontSize: isMobile ? "12px" : "14px",
                    marginTop: isMobile ? "10px" : "12px",
                  }}>
                    {difficulty === "easy" && "🟢 Random moves - Easy to beat"}
                    {difficulty === "medium" && "🟡 Smart moves - Challenging"}
                    {difficulty === "hard" && "🔴 Unbeatable - Good luck!"}
                  </p>
                </div>

                {/* <div className="flex justify-center" style={{ width: "100%" }}>
                  <NeonButton
                    variant="green"
                    fullWidth
                    onClick={handlePlayAI}
                    size="xl"
                    style={{ minHeight: isMobile ? "48px" : "auto", maxWidth: isMobile ? "300px" : "400px" }}
                  >
                    <Cpu style={{ width: isMobile ? "20px" : "24px", height: isMobile ? "20px" : "24px" }} />
                    Player vs AI
                  </NeonButton>
                </div> */}
                <div
  style={{
    display: "flex",
    justifyContent: "center",
    width: "100%",
    marginTop: "8px",
  }}
>
  <motion.button
    type="button"
    onClick={handlePlayAI}
    whileHover={{
      scale: 1.03,
      y: -2,
      boxShadow: "0 0 30px rgba(0,255,65,0.7)",
    }}
    whileTap={{ scale: 0.97 }}
    transition={{ duration: 0.2 }}
    style={{
      width: "100%",
      maxWidth: isMobile ? "300px" : "400px",
      minHeight: isMobile ? "48px" : "56px",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",

      border: "2px solid #00FF41",
      borderRadius: "14px",
      background: "rgba(0,255,65,0.03)",
      color: "#00FF41",

      fontSize: isMobile ? "16px" : "18px",
      fontWeight: 700,

      boxShadow: "0 0 15px rgba(0,255,65,0.35)",
      textShadow: "0 0 10px #00FF41",

      cursor: "pointer",
      transition: "all .3s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(0,255,65,.08)";
      e.currentTarget.style.borderColor = "#4DFF7A";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(0,255,65,.03)";
      e.currentTarget.style.borderColor = "#00FF41";
    }}
  >
    <Cpu
      style={{
        width: isMobile ? "20px" : "24px",
        height: isMobile ? "20px" : "24px",
      }}
    />
    Player vs AI
  </motion.button>
</div>
              </NeonCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard */}
        <div style={{ marginTop: isMobile ? "24px" : "32px" }}>
          <Leaderboard leaderboard={leaderboard} isLoading={isLoadingLeaderboard} />
        </div>
      </main>
    </div>
  );
}
