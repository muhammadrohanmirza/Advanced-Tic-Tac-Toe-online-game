"use client";

import React from "react";
import { motion } from "framer-motion";
import { CellValue } from "@/types/game";
import { GameSkinIcon } from "./GameSkinIcon";

interface GameCellProps {
  value: CellValue;
  index: number;
  onClick: () => void;
  disabled: boolean;
  isWinningCell?: boolean;
  isLastMove?: boolean;
  playerSymbol?: "X" | "O" | null;
}

export function GameCell({
  value,
  index,
  onClick,
  disabled,
  isWinningCell = false,
  isLastMove = false,
}: GameCellProps) {
  const isMyTurn = !disabled;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || value !== null}
      aria-label={`Cell ${index + 1}${value ? `, filled with ${value}` : ", empty"}`}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        aspectRatio: "1 / 1",
        backgroundColor: "var(--board-cell-bg, #FFFFFF)",
        border: isWinningCell
          ? "3px solid #FFD700"
          : "2px solid var(--board-cell-border, #DDE7F8)",
        borderRadius: "clamp(14px, 3.5vw, 22px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled || value ? "default" : isMyTurn ? "pointer" : "not-allowed",
        opacity: disabled && !value ? 0.65 : 1,
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
        boxShadow: isWinningCell
          ? "0 0 25px #FFD700, 0 6px 0 #D4A000"
          : "var(--board-cell-shadow, 0 5px 0 #BDCEF0, 0 8px 18px rgba(0, 14, 48, 0.25))",
        animation: isWinningCell ? "winPulse 0.8s ease-in-out infinite" : "none",
        outline: "none",
        position: "relative",
      }}
      whileHover={
        isMyTurn && !value
          ? {
              scale: 1.03,
              y: -2,
              boxShadow: "0 7px 0 #BDCEF0, 0 12px 24px rgba(0, 163, 255, 0.3)",
            }
          : {}
      }
      whileTap={
        isMyTurn && !value
          ? {
              scale: 0.97,
              y: 3,
              boxShadow: "0 2px 0 #BDCEF0, 0 4px 10px rgba(0, 14, 48, 0.2)",
            }
          : {}
      }
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
    >
      {value && (
        <GameSkinIcon symbol={value} size={clampSymbolSize()} />
      )}
      {isLastMove && !value && (
        <motion.div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "var(--accent-x, #00A3FF)",
            opacity: 0.5,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
        />
      )}
    </motion.button>
  );
}

function clampSymbolSize(): number {
  if (typeof window === "undefined") return 52;
  const w = window.innerWidth;
  if (w <= 400) return 40;
  if (w <= 768) return 48;
  return 56;
}
