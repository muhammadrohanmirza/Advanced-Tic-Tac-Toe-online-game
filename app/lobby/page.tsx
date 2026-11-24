"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { SoundControls } from "@/components/ui/SoundControls";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { RoomList } from "@/components/lobby/RoomList";
import { CreateRoom } from "@/components/lobby/CreateRoom";
import { JoinRoom } from "@/components/lobby/JoinRoom";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getSocket } from "@/lib/socket-client";
import { useSound } from "@/hooks/useSound";
import { useWindowSize } from "@/hooks/useWindowSize";
import { Users, Plus, KeyRound, Trophy, ArrowLeft, LogOut, Radio, History } from "lucide-react";
import toast from "react-hot-toast";

type TabMode = "rooms" | "create" | "join" | "leaderboard";

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabMode>("rooms");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; id: string } | null>(null);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [isLoadingPublicRooms, setIsLoadingPublicRooms] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  const { playSfx } = useSound();
  const { isMobile, isTiny } = useWindowSize();
  const socket = getSocket();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      activeEl.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, [activeTab]);

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
        if (data.success && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
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
      const code = data?.roomCode || data?.room?.code;
      const id = data?.roomId || data?.room?.id;
      if (code && id) {
        setCreatedRoom({ code, id });
      }
      setIsCreating(false);
      toast.success("Room created! Share the code.");
      socket.emit("get-public-rooms");
    });

    socket.on("room-joined", (data: any) => {
      const id = data?.roomId || data?.room?.id;
      if (id) {
        toast.success("Joined room!");
        router.push(`/room/${id}`);
      } else {
        setJoinError("Failed to join room");
        setIsJoining(false);
      }
    });

    socket.on("player-joined", (data: any) => {
      const id = data?.roomId || data?.room?.id;
      if (id) {
        toast.success("Opponent joined!");
        router.push(`/room/${id}`);
      }
    });

    socket.on("public-rooms-list", (data: any) => {
      if (Array.isArray(data?.rooms)) {
        setPublicRooms(data.rooms);
      }
      setIsLoadingPublicRooms(false);
    });

    socket.on("error", (data) => {
      setJoinError(data.message);
      toast.error(data.message);
      setIsJoining(false);
      setIsCreating(false);
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

  const handleCreateRoom = (isPublic: boolean, turnDuration: number = 15) => {
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

  const handleJoinByRoomId = (roomId: string) => {
    playSfx("click");
    if (!session?.user) {
      toast.error("Please log in");
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    socket?.emit("join-room", {
      roomId,
      userId: session.user.id,
      userName: session.user.name || "Player",
    });
  };

  const handleWatchRoom = (codeToWatch: string) => {
    playSfx("click");
    if (!session?.user) {
      toast.error("Please log in");
      return;
    }
    const rawTarget = codeToWatch.trim();
    if (rawTarget.length < 4) {
      setJoinError("Enter a valid code to spectate");
      return;
    }
    const targetCode = rawTarget.length === 4 ? rawTarget.toUpperCase() : rawTarget;
    router.push(`/room/${targetCode}?spectate=true`);
  };

  const handleQuickMatch = () => {
    playSfx("click");
    const openRoom = publicRooms.find((r) => {
      const pCount =
        typeof r.playerCount === "number"
          ? r.playerCount
          : (r.player1 ? 1 : 0) + (r.player2 ? 1 : 0);
      return pCount < 2;
    });
    if (openRoom) {
      handleJoinByRoomId(openRoom.id);
    } else {
      toast("No waiting rooms found. Creating a public match!");
      handleCreateRoom(true, 15);
    }
  };

  const handleRefreshRooms = () => {
    playSfx("click");
    setIsLoadingPublicRooms(true);
    socket?.emit("get-public-rooms");
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
        <LoadingSpinner size="lg" text="Loading Online Lobby..." />
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
        maxWidth: "1280px",
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
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          marginBottom: "clamp(14px, 2.5vw, 22px)",
          gap: isMobile ? "10px" : "12px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Row 1 on mobile, Left side on desktop: Back Button & Title & Online Chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: isMobile ? "100%" : "auto",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <RoundIconButton
              variant="blue"
              size={isMobile ? 38 : 42}
              ariaLabel="Back to Home"
              onClick={() => router.push("/")}
            >
              <ArrowLeft style={{ width: "18px", height: "18px" }} />
            </RoundIconButton>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <Users style={{ width: isMobile ? "22px" : "26px", height: isMobile ? "22px" : "26px", color: "var(--accent-x, #00A3FF)", flexShrink: 0 }} />
              <h1
                className="game-title-3d"
                style={{
                  fontSize: "clamp(18px, 4.5vw, 28px)",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Online Lobby
              </h1>
            </div>
          </div>

          {/* Online Status Chip */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: isTiny ? "4px 8px" : "4px 10px",
              borderRadius: "9999px",
              backgroundColor: "rgba(0, 230, 118, 0.15)",
              border: "1px solid rgba(0, 230, 118, 0.4)",
              color: "var(--accent-green, #00E676)",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
          >
            <Radio style={{ width: "12px", height: "12px" }} />
            {!isTiny && <span>Online</span>}
          </div>
        </div>

        {/* Row 2 on mobile, Right side on desktop: User Avatar & Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isMobile ? "space-between" : "flex-end",
            width: isMobile ? "100%" : "auto",
            gap: "8px",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          {session?.user && (
            <div style={{ minWidth: 0, flexShrink: 1, maxWidth: isMobile ? "140px" : "220px" }}>
              <UserAvatar userName={session.user.name || "Player"} userEmail={session.user.email || ""} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <SoundControls align="right" compact={isMobile} />
            <ThemeSwitcher align="right" compact={isMobile} />
            {session?.user && (
              <RoundIconButton
                variant="dark"
                size={isMobile ? 38 : 42}
                ariaLabel="Match History"
                onClick={() => {
                  playSfx("click");
                  router.push("/history");
                }}
              >
                <History style={{ width: "18px", height: "18px", color: "var(--accent-x, #00A3FF)" }} />
              </RoundIconButton>
            )}
            <RoundIconButton
              variant="dark"
              size={isMobile ? 38 : 42}
              ariaLabel="Sign out"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut style={{ width: "16px", height: "16px", color: "var(--accent-red, #FF3B30)" }} />
            </RoundIconButton>
          </div>
        </div>
      </header>

      {/* Responsive Tab Bar with fade indicator & snap scroll */}
      <div style={{ position: "relative", width: "100%", marginBottom: "clamp(16px, 3vw, 24px)" }}>
        <div
          ref={tabsContainerRef}
          className="hide-scrollbar scroll-snap-x"
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            padding: "4px 28px 6px 2px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {[
            { id: "rooms" as TabMode, label: "Public Rooms", icon: <Users size={16} /> },
            { id: "create" as TabMode, label: "Create Room", icon: <Plus size={16} /> },
            { id: "join" as TabMode, label: "Join Code", icon: <KeyRound size={16} /> },
            { id: "leaderboard" as TabMode, label: "Leaderboard", icon: <Trophy size={16} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                onClick={() => {
                  playSfx("click");
                  setActiveTab(tab.id);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  minHeight: "44px",
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
                  boxShadow: isActive ? "0 4px 12px rgba(0, 163, 255, 0.4)" : "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* History Tab / Link */}
          <button
            type="button"
            onClick={() => {
              playSfx("click");
              router.push("/history");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              minHeight: "44px",
              borderRadius: "9999px",
              backgroundColor: "var(--bg-card, rgba(14, 25, 66, 0.7))",
              color: "var(--text-secondary, #c2d6ff)",
              border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.3))",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            <History size={16} />
            <span>History</span>
          </button>
        </div>

        {/* Soft fade hint on right edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "28px",
            background: "linear-gradient(to right, transparent, var(--bg-primary, #0a1332))",
            pointerEvents: "none",
            borderRadius: "0 9999px 9999px 0",
          }}
        />
      </div>

      {/* Main Content Area - Single centered active tab panel (max-width 720px) on all screens */}
      <main
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
          {activeTab === "rooms" && (
            <RoomList
              rooms={publicRooms}
              onJoinRoom={handleJoinByRoomId}
              onWatchRoom={handleWatchRoom}
              isLoading={isLoadingPublicRooms}
              onRefresh={handleRefreshRooms}
            />
          )}

          {activeTab === "create" && (
            <CreateRoom
              onCreateRoom={handleCreateRoom}
              isLoading={isCreating}
              roomCode={createdRoom?.code}
              isWaiting={Boolean(createdRoom)}
            />
          )}

          {activeTab === "join" && (
            <JoinRoom
              onJoinRoom={handleJoinByRoomId}
              onWatchRoom={handleWatchRoom}
              onQuickMatch={handleQuickMatch}
              isLoading={isJoining}
              error={joinError}
            />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard
              leaderboard={leaderboard}
              isLoading={isLoadingLeaderboard}
              onBack={() => setActiveTab("rooms")}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "16px 0 8px",
          color: "var(--text-muted, #8aa0d4)",
          fontSize: "12px",
          fontFamily: "var(--font-display)",
        }}
      >
        Tic Tac Toe Multiplayer Lobby • Think • Play • Win
      </footer>
    </div>
  );
}
