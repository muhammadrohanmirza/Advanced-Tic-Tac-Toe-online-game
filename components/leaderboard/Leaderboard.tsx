"use client";

import React from "react";
import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/types/game";
import CountUp from "react-countup";
import { Trophy, ArrowLeft } from "lucide-react";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  onBack?: () => void;
}

export function Leaderboard({ leaderboard, isLoading, onBack }: LeaderboardProps) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: "linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)",
          color: "#FFFFFF",
          border: "2px solid #FDE68A",
          shadow: "0 2px 6px rgba(245, 158, 11, 0.4)",
        };
      case 2:
        return {
          bg: "linear-gradient(180deg, #CBD5E1 0%, #94A3B8 100%)",
          color: "#FFFFFF",
          border: "2px solid #E2E8F0",
          shadow: "0 2px 6px rgba(148, 163, 184, 0.4)",
        };
      case 3:
        return {
          bg: "linear-gradient(180deg, #FDBA74 0%, #EA580C 100%)",
          color: "#FFFFFF",
          border: "2px solid #FED7AA",
          shadow: "0 2px 6px rgba(234, 88, 12, 0.4)",
        };
      default:
        return {
          bg: "#E2E8F0",
          color: "#475569",
          border: "1.5px solid #CBD5E1",
          shadow: "none",
        };
    }
  };

  return (
    <div
      className="game-card-light"
      style={{
        width: "100%",
        maxWidth: "520px",
        margin: "0 auto",
        padding: "clamp(18px, 4vw, 28px)",
        borderRadius: "clamp(22px, 5vw, 30px)",
        boxShadow: "0 20px 45px rgba(0, 15, 50, 0.35)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          marginBottom: "clamp(16px, 3.5vw, 24px)",
          minHeight: "44px",
        }}
      >
        {onBack && (
          <div style={{ position: "absolute", left: 0 }}>
            <RoundIconButton
              variant="blue"
              size={40}
              ariaLabel="Go back"
              onClick={onBack}
            >
              <ArrowLeft style={{ width: "20px", height: "20px" }} />
            </RoundIconButton>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Trophy
            style={{
              width: "28px",
              height: "28px",
              color: "#F59E0B",
              filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))",
            }}
          />
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(20px, 4vw, 26px)",
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "0.5px",
            }}
          >
            Leaderboard
          </h2>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: "56px",
                backgroundColor: "#F1F5F9",
                borderRadius: "16px",
                animation: "pulse 1.8s infinite ease-in-out",
              }}
            />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <motion.div
          style={{ textAlign: "center", padding: "40px 16px" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Trophy
            style={{
              width: "56px",
              height: "56px",
              color: "#CBD5E1",
              margin: "0 auto 12px",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "4px",
            }}
          >
            No matches recorded yet
          </p>
          <p style={{ color: "#64748B", fontSize: "14px" }}>
            Play a game to take the #1 spot!
          </p>
        </motion.div>
      ) : (
        <motion.div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxHeight: "clamp(340px, 50vh, 480px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {leaderboard.map((entry, index) => {
            const badge = getRankBadge(entry.rank);
            const isTop3 = entry.rank <= 3;

            return (
              <motion.div
                key={entry.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "16px",
                  backgroundColor: isTop3
                    ? index === 0
                      ? "rgba(254, 243, 199, 0.55)"
                      : "rgba(241, 245, 249, 0.7)"
                    : "#F8FAFC",
                  border: isTop3 && index === 0 ? "1.5px solid #FDE68A" : "1px solid #E2E8F0",
                  transition: "transform 0.15s ease",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ scale: 1.015 }}
              >
                {/* Left: Medal Rank + Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      minWidth: "32px",
                      borderRadius: "50%",
                      background: badge.bg,
                      color: badge.color,
                      border: badge.border,
                      boxShadow: badge.shadow,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {entry.rank}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "15px",
                        color: "#0F172A",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.userName}
                    </p>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {entry.wins} {entry.wins === 1 ? "win" : "wins"} ({entry.totalGames} played)
                    </span>
                  </div>
                </div>

                {/* Right: Score/Win rate aligned right */}
                <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: "12px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#0F172A",
                    }}
                  >
                    <CountUp end={entry.wins} duration={1.2} />
                  </span>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748B",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Score
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
