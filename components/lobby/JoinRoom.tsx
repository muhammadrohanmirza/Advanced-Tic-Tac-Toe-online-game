"use client";

import React, { useState } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { KeyRound, Zap, AlertTriangle, Eye } from "lucide-react";

interface JoinRoomProps {
  onJoinRoom: (roomCode: string) => void;
  onWatchRoom?: (roomCode: string) => void;
  onQuickMatch: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function JoinRoom({
  onJoinRoom,
  onWatchRoom,
  onQuickMatch,
  isLoading,
  error,
}: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim().length >= 4) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 4) {
      setRoomCode(value);
    }
  };

  return (
    <div
      className="game-card-glass"
      style={{
        width: "100%",
        padding: "clamp(20px, 4vw, 26px)",
        borderRadius: "clamp(20px, 4vw, 28px)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <KeyRound style={{ width: "20px", height: "20px", color: "var(--accent-x, #00A3FF)" }} />
        <h3
          className="game-title-3d"
          style={{ fontSize: "clamp(18px, 3.5vw, 22px)", margin: 0 }}
        >
          Join with Room Code
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <input
            type="text"
            placeholder="ABCD"
            value={roomCode}
            onChange={handleCodeChange}
            maxLength={4}
            style={{
              width: "100%",
              height: "56px",
              textAlign: "center",
              fontSize: "26px",
              fontWeight: 800,
              fontFamily: "monospace",
              letterSpacing: "8px",
              textTransform: "uppercase",
              backgroundColor: "rgba(10, 19, 51, 0.9)",
              border: "2px solid var(--border-color, rgba(65, 115, 235, 0.35))",
              borderRadius: "16px",
              color: "#FFFFFF",
              outline: "none",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-x, #00A3FF)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(0, 163, 255, 0.35)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color, rgba(65, 115, 235, 0.35))";
              e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.3)";
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(255, 59, 48, 0.15)",
              border: "1px solid var(--accent-red, #FF3B30)",
              borderRadius: "12px",
              color: "var(--accent-red, #FF3B30)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-body)",
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: onWatchRoom ? "repeat(auto-fit, minmax(110px, 1fr))" : "1fr", gap: "10px" }}>
          <NeonButton
            type="submit"
            variant="blue"
            size="md"
            fullWidth
            isLoading={isLoading}
            disabled={roomCode.length < 4}
          >
            Join Game
          </NeonButton>

          {onWatchRoom && (
            <NeonButton
              type="button"
              variant="dark"
              size="md"
              fullWidth
              onClick={() => onWatchRoom(roomCode)}
              disabled={roomCode.length < 4}
            >
              <Eye style={{ width: "16px", height: "16px" }} />
              <span>Spectate</span>
            </NeonButton>
          )}
        </div>
      </form>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "18px 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.12)" }} />
        <span style={{ fontSize: "12px", color: "var(--text-muted, #8aa0d4)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
          OR
        </span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.12)" }} />
      </div>

      <NeonButton
        type="button"
        variant="primary"
        size="md"
        fullWidth
        onClick={onQuickMatch}
        isLoading={isLoading}
      >
        <Zap style={{ width: "18px", height: "18px" }} />
        <span>Quick Match</span>
      </NeonButton>
    </div>
  );
}
