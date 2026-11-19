"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AllowedReaction } from "@/types/game";

export interface ActiveReaction {
  id: string;
  reaction: AllowedReaction;
  senderId: string;
  senderName: string;
  xOffset: number; // e.g. -35 to 35 percent
  createdAt: number;
  role?: "player" | "spectator";
}

interface FloatingReactionsOverlayProps {
  reactions: ActiveReaction[];
  currentUserId?: string;
}

export function FloatingReactionsOverlay({
  reactions,
  currentUserId,
}: FloatingReactionsOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {reactions.map((item) => {
          const isYou = item.senderId === currentUserId;
          const isGG = item.reaction === "GG";

          return (
            <motion.div
              key={item.id}
              initial={{
                opacity: 0,
                y: 50,
                scale: 0.4,
                x: `${item.xOffset}%`,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [50, 0, -60, -130],
                scale: [0.4, 1.3, 1.15, 0.9],
                x: `${item.xOffset}%`,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.2,
                times: [0, 0.15, 0.7, 1],
                ease: "easeOut",
              }}
              style={{
                position: "absolute",
                bottom: "25%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                filter: "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.6))",
              }}
            >
              {/* Reaction Emoji or GG badge */}
              {isGG ? (
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: "#FFD700",
                    background: "rgba(10, 10, 10, 0.85)",
                    border: "2px solid #FFD700",
                    padding: "4px 12px",
                    borderRadius: "10px",
                    textShadow: "0 0 12px #FFD700, 0 0 24px #FF8A00",
                    boxShadow: "0 0 20px rgba(255, 215, 0, 0.45)",
                    letterSpacing: "1px",
                  }}
                >
                  GG!
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "44px",
                    lineHeight: 1,
                    userSelect: "none",
                    filter: "drop-shadow(0 0 12px rgba(0, 255, 255, 0.5))",
                  }}
                >
                  {item.reaction}
                </div>
              )}

              {/* Sender Name Pill */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: isYou
                    ? "var(--accent-x, #00FFFF)"
                    : item.role === "spectator"
                    ? "var(--text-main, #ffffff)"
                    : "var(--accent-o, #FF00FF)",
                  backgroundColor: "rgba(10, 10, 10, 0.88)",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  border: `1px solid ${
                    isYou
                      ? "var(--accent-x, #00FFFF55)"
                      : item.role === "spectator"
                      ? "var(--border-color, rgba(255,255,255,0.22))"
                      : "var(--accent-o, #FF00FF55)"
                  }`,
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                  textShadow: isYou
                    ? "0 0 8px var(--accent-x, #00FFFF)"
                    : item.role === "spectator"
                    ? "none"
                    : "0 0 8px var(--accent-o, #FF00FF)",
                }}
              >
                {item.role === "spectator" && (
                  <span style={{ fontSize: "11px", opacity: 0.85 }} title="Spectator">👁</span>
                )}
                <span>{isYou ? "You" : item.senderName}</span>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

