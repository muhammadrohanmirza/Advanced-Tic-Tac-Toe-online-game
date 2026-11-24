"use client";

import React from "react";
import { motion } from "framer-motion";
import { GameCell } from "./GameCell";
import { CellValue, TurnPlayer } from "@/types/game";

interface OnlineBoardProps {
  board: CellValue[];
  currentTurn: TurnPlayer;
  playerSymbol: TurnPlayer | null;
  gameStatus: "waiting" | "playing" | "finished";
  winningLine: number[] | null;
  lastMove: number | null;
  onCellClick: (index: number) => void;
}

export function OnlineBoard({ board, currentTurn, playerSymbol, gameStatus, winningLine, lastMove, onCellClick }: OnlineBoardProps) {
  const isMyTurn = playerSymbol === currentTurn;
  const isDisabled = !isMyTurn || gameStatus !== "playing";

  return (
    <motion.div
      style={{
        padding: "24px",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        borderRadius: "28px",
        border: "1.5px solid rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {board.map((cell, index) => (
          <GameCell
            key={index}
            value={cell}
            index={index}
            onClick={() => onCellClick(index)}
            disabled={isDisabled}
            isWinningCell={winningLine?.includes(index)}
            isLastMove={lastMove === index}
            playerSymbol={playerSymbol}
          />
        ))}
      </div>
    </motion.div>
  );
}
