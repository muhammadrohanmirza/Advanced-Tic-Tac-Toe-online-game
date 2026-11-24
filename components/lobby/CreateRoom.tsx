"use client";

import React, { useState } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { CrownBadge } from "@/components/ui/CrownBadge";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Copy, Check, Plus, Globe, Lock, Timer } from "lucide-react";

interface CreateRoomProps {
  onCreateRoom: (isPublic: boolean, turnDuration?: number) => void;
  isLoading: boolean;
  roomCode?: string;
  isWaiting?: boolean;
}

export function CreateRoom({
  onCreateRoom,
  isLoading,
  roomCode,
  isWaiting,
}: CreateRoomProps) {
  const [isPublic, setIsPublic] = useState(true);
  const [turnDuration, setTurnDuration] = useState<number>(15);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    onCreateRoom(isPublic, turnDuration);
  };

  const handleCopyCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(75, 30, 140, 0.75) 0%, rgba(20, 16, 68, 0.85) 100%)",
        borderRadius: "clamp(20px, 4vw, 28px)",
        padding: "clamp(20px, 4vw, 28px)",
        border: "1.5px solid rgba(181, 55, 242, 0.35)",
        boxShadow: "0 16px 40px rgba(0, 10, 40, 0.45)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Golden Crown */}
      <div style={{ marginBottom: "8px" }}>
        <CrownBadge size={38} />
      </div>

      <h3
        className="game-title-3d"
        style={{ fontSize: "clamp(20px, 4vw, 24px)", margin: "0 0 6px" }}
      >
        Create Your Room
      </h3>

      <p
        style={{
          color: "var(--text-secondary, #c2d6ff)",
          fontSize: "13px",
          margin: "0 0 20px",
          fontFamily: "var(--font-body)",
        }}
      >
        Invite your friends or share the room code!
      </p>

      {!roomCode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Public / Private Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(10, 12, 38, 0.6)",
              padding: "10px 14px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isPublic ? (
                <Globe style={{ width: "18px", height: "18px", color: "var(--accent-x, #00A3FF)" }} />
              ) : (
                <Lock style={{ width: "18px", height: "18px", color: "var(--accent-o, #FF7A00)" }} />
              )}
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-display)" }}>
                {isPublic ? "Public Room" : "Private Room"}
              </span>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "9999px",
                backgroundColor: isPublic ? "var(--accent-x, #00A3FF)" : "#475569",
                border: "none",
                padding: "2px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "background-color 0.2s ease",
              }}
            >
              <motion.div
                animate={{ x: isPublic ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                }}
              />
            </button>
          </div>

          {/* Turn Timer Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(10, 12, 38, 0.6)",
              padding: "10px 14px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Timer style={{ width: "18px", height: "18px", color: "var(--accent-yellow, #FFB703)" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-display)" }}>
                Turn Timer
              </span>
            </div>

            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {[
                { label: "15s", value: 15 },
                { label: "30s", value: 30 },
                { label: "45s", value: 45 },
                { label: "No Limit", value: 0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTurnDuration(opt.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: turnDuration === opt.value ? "var(--accent-x, #00A3FF)" : "rgba(255,255,255,0.08)",
                    color: turnDuration === opt.value ? "#FFFFFF" : "var(--text-muted, #8aa0d4)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Big Yellow 3D Action Pill */}
          <NeonButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleCreate}
            isLoading={isLoading}
            style={{ minHeight: "52px", marginTop: "4px" }}
          >
            <Plus style={{ width: "20px", height: "20px" }} />
            <span>Create Room</span>
          </NeonButton>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            backgroundColor: "rgba(10, 12, 38, 0.75)",
            borderRadius: "20px",
            padding: "20px 16px",
            border: "1.5px solid var(--accent-x, #00A3FF)",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted, #8aa0d4)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
            Your Room Code
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              margin: "10px 0 16px",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "clamp(32px, 7vw, 42px)",
                fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "4px",
                textShadow: "0 0 16px rgba(0, 163, 255, 0.6)",
              }}
            >
              {roomCode}
            </span>

            <NeonButton
              variant="primary"
              size="sm"
              onClick={handleCopyCode}
            >
              {copied ? (
                <Check style={{ width: "16px", height: "16px" }} />
              ) : (
                <Copy style={{ width: "16px", height: "16px" }} />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </NeonButton>
          </div>

          {isWaiting ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <LoadingSpinner variant="cyan" size="sm" />
              <p style={{ color: "var(--text-secondary, #c2d6ff)", fontSize: "13px", margin: 0 }}>
                Waiting for an opponent to join...
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary, #c2d6ff)", fontSize: "13px", margin: 0 }}>
              Share this code with a friend to play!
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
