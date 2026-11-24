"use client";

import React from "react";
import { Room } from "@/types/game";
import { motion } from "framer-motion";
import { Users, Eye, RefreshCw } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { useWindowSize } from "@/hooks/useWindowSize";
import toast from "react-hot-toast";

export interface PublicRoomItem {
  id: string;
  code: string;
  isPublic?: boolean;
  status: string;
  turnDuration?: number;
  player1?: { id: string; name: string } | null;
  player2?: { id: string; name: string } | null;
  playerCount?: number;
  spectatorCount?: number;
  maxSpectators?: number;
  isSpectatorFull?: boolean;
  // Fallbacks for compatibility
  creatorName?: string;
  hostName?: string;
  playerX?: any;
  playerO?: any;
}

interface RoomListProps {
  rooms: (Room | PublicRoomItem | any)[];
  onJoinRoom: (roomId: string) => void;
  onWatchRoom?: (roomId: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export function RoomList({
  rooms,
  onJoinRoom,
  onWatchRoom,
  isLoading,
  onRefresh,
}: RoomListProps) {
  const { width } = useWindowSize();
  const isPhone = width < 640;

  const handleWatchClick = (room: any) => {
    if (room.isSpectatorFull) {
      toast.error("Room is full for spectators");
      return;
    }
    if (onWatchRoom) {
      onWatchRoom(room.id);
    }
  };

  return (
    <div
      className="game-card-glass"
      style={{
        width: "100%",
        padding: "clamp(18px, 4vw, 24px)",
        borderRadius: "clamp(20px, 4vw, 28px)",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Users style={{ width: "22px", height: "22px", color: "var(--accent-x, #00A3FF)" }} />
          <h2
            className="game-title-3d"
            style={{ fontSize: "clamp(18px, 3.5vw, 22px)", margin: 0 }}
          >
            Public Rooms
          </h2>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "9999px",
              backgroundColor: "rgba(0, 163, 255, 0.15)",
              border: "1px solid rgba(0, 163, 255, 0.3)",
              color: "var(--accent-x, #00A3FF)",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-display)",
            }}
          >
            {rooms.length}
          </span>
        </div>

        <RoundIconButton
          variant="dark"
          size={38}
          ariaLabel="Refresh public rooms"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            style={{
              width: "16px",
              height: "16px",
              animation: isLoading ? "spin 1s linear infinite" : "none",
            }}
          />
        </RoundIconButton>
      </div>

      {/* Room Rows List */}
      {rooms.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "clamp(32px, 6vh, 48px) 16px",
            color: "var(--text-secondary, #c2d6ff)",
          }}
        >
          <Users
            style={{
              width: "48px",
              height: "48px",
              color: "var(--text-muted, #8aa0d4)",
              margin: "0 auto 12px",
              opacity: 0.6,
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 700,
              color: "#FFFFFF",
              margin: "0 0 4px",
            }}
          >
            No active public rooms
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted, #8aa0d4)", margin: 0 }}>
            Create your own room or invite a friend to play!
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxHeight: "clamp(280px, 45vh, 460px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {rooms.map((room, index) => {
            const hostName =
              room.player1?.name ||
              room.playerX?.name ||
              room.creatorName ||
              room.hostName ||
              "";
            const rowTitle = hostName ? `${hostName}'s Match` : "Open Match";
            const avatarLetter = hostName ? hostName.charAt(0).toUpperCase() : "O";

            const playerCount =
              typeof room.playerCount === "number"
                ? room.playerCount
                : (room.player1 ? 1 : 0) + (room.player2 ? 1 : 0);

            const spectatorCount = room.spectatorCount || 0;
            const isFull = playerCount >= 2;
            const isPlaying = room.status === "playing" || isFull;
            const statusLabel = isPlaying ? "Playing" : "Waiting";

            const playerAndSpectatorText =
              isFull || spectatorCount > 0
                ? `${playerCount}/2 players • ${spectatorCount} watching`
                : `${playerCount}/2 players`;

            if (isPhone) {
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    backgroundColor: "rgba(10, 18, 50, 0.65)",
                    border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.25))",
                    gap: "10px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Line 1: avatar + host name ("<name>'s Match", truncated with ellipsis, min-width:0) + the #CODE chip */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          minWidth: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(0, 163, 255, 0.15)",
                          border: "1.5px solid var(--accent-x, #00A3FF)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          color: "var(--accent-x, #00A3FF)",
                          fontSize: "15px",
                          flexShrink: 0,
                        }}
                      >
                        {avatarLetter}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#FFFFFF",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                        }}
                      >
                        {rowTitle}
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "var(--accent-x, #00A3FF)",
                        fontWeight: 700,
                        backgroundColor: "rgba(0, 163, 255, 0.12)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        flexShrink: 0,
                      }}
                    >
                      #{room.code}
                    </span>
                  </div>

                  {/* Line 2: status chip, "N/2 players", "N watching", timer label (flex-wrap with gap) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor: isPlaying ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 183, 3, 0.15)",
                        border: `1px solid ${isPlaying ? "rgba(0, 230, 118, 0.4)" : "rgba(255, 183, 3, 0.4)"}`,
                        color: isPlaying ? "#00E676" : "#FFB703",
                        fontSize: "11px",
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: isPlaying ? "#00E676" : "#FFB703",
                        }}
                      />
                      {statusLabel}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary, #c2d6ff)",
                        fontWeight: 600,
                      }}
                    >
                      👤 {playerCount}/2 players
                    </span>

                    {spectatorCount > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary, #c2d6ff)",
                          fontWeight: 600,
                        }}
                      >
                        • {spectatorCount} watching
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted, #8aa0d4)",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      ⏱️ {room.turnDuration && room.turnDuration > 0 ? `${room.turnDuration}s` : "No limit"}
                    </span>
                  </div>

                  {/* Line 3: action buttons in a row, each flex:1, min height 44px (Join and Watch side by side, full width) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                    }}
                  >
                    {onWatchRoom && (
                      <NeonButton
                        variant="dark"
                        size="sm"
                        onClick={() => handleWatchClick(room)}
                        style={{
                          flex: 1,
                          minHeight: "44px",
                          justifyContent: "center",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <Eye style={{ width: "15px", height: "15px", marginRight: "4px" }} />
                        <span>Watch</span>
                      </NeonButton>
                    )}

                    {!isFull && (
                      <NeonButton
                        variant="blue"
                        size="sm"
                        onClick={() => onJoinRoom(room.id)}
                        disabled={isLoading}
                        style={{
                          flex: 1,
                          minHeight: "44px",
                          justifyContent: "center",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        Join
                      </NeonButton>
                    )}
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "18px",
                  backgroundColor: "rgba(10, 18, 50, 0.65)",
                  border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.25))",
                  gap: "10px",
                  flexWrap: "wrap",
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Left: Avatar & Room Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                  {/* Avatar Bubble */}
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      minWidth: "42px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(0, 163, 255, 0.15)",
                      border: "1.5px solid var(--accent-x, #00A3FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      color: "var(--accent-x, #00A3FF)",
                      fontSize: "16px",
                    }}
                  >
                    {avatarLetter}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#FFFFFF",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {rowTitle}
                      </span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: "var(--accent-x, #00A3FF)",
                          fontWeight: 700,
                          backgroundColor: "rgba(0, 163, 255, 0.12)",
                          padding: "1px 6px",
                          borderRadius: "6px",
                        }}
                      >
                        #{room.code}
                      </span>

                      {/* Status Chip */}
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          backgroundColor: isPlaying ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 183, 3, 0.15)",
                          border: `1px solid ${isPlaying ? "rgba(0, 230, 118, 0.4)" : "rgba(255, 183, 3, 0.4)"}`,
                          color: isPlaying ? "#00E676" : "#FFB703",
                          fontSize: "11px",
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: isPlaying ? "#00E676" : "#FFB703",
                          }}
                        />
                        {statusLabel}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary, #c2d6ff)",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        👤 {playerAndSpectatorText}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted, #8aa0d4)",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        ⏱️ {room.turnDuration && room.turnDuration > 0 ? `${room.turnDuration}s` : "No limit"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                  {onWatchRoom && (
                    <NeonButton
                      variant="dark"
                      size="sm"
                      onClick={() => handleWatchClick(room)}
                    >
                      <Eye style={{ width: "15px", height: "15px" }} />
                      <span>Watch</span>
                    </NeonButton>
                  )}

                  {!isFull && (
                    <NeonButton
                      variant="blue"
                      size="sm"
                      onClick={() => onJoinRoom(room.id)}
                      disabled={isLoading}
                    >
                      Join
                    </NeonButton>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
