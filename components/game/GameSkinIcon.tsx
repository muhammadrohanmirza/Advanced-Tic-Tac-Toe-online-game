"use client";

import React from "react";
import { motion } from "framer-motion";
import { X, Circle, Star, Heart, Flame, Snowflake } from "lucide-react";
import { SkinId, useTheme } from "@/hooks/useTheme";

interface GameSkinIconProps {
  symbol: "X" | "O";
  skin?: SkinId;
  size?: number | string;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
}

export function GameSkinIcon({
  symbol,
  skin,
  size = "100%",
  strokeWidth = 3,
  animate = true,
  className = "",
}: GameSkinIconProps) {
  const { skin: contextSkin } = useTheme();
  const activeSkin = skin || contextSkin || "classic";

  const renderIconContent = () => {
    if (activeSkin === "emoji") {
      return (
        <span
          style={{
            fontSize: typeof size === "number" ? `${size * 0.75}px` : "2.2rem",
            lineHeight: 1,
            userSelect: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            filter:
              symbol === "X"
                ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))"
                : "drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))",
          }}
        >
          {symbol === "X" ? "❌" : "⭕"}
        </span>
      );
    }

    if (activeSkin === "stars-hearts") {
      if (symbol === "X") {
        return (
          <Star
            style={{
              width: size,
              height: size,
              color: "#FFD700",
              fill: "#FFD700",
              filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.6))",
            }}
          />
        );
      }
      return (
        <Heart
          style={{
            width: size,
            height: size,
            color: "#FF3131",
            fill: "#FF3131",
            filter: "drop-shadow(0 0 10px rgba(255, 49, 49, 0.6))",
          }}
        />
      );
    }

    if (activeSkin === "fire-ice") {
      if (symbol === "X") {
        return (
          <Flame
            style={{
              width: size,
              height: size,
              color: "#FF5722",
              fill: "#FF8A65",
              filter: "drop-shadow(0 0 12px rgba(255, 87, 34, 0.7))",
            }}
          />
        );
      }
      return (
        <Snowflake
          style={{
            width: size,
            height: size,
            color: "#00BFFF",
            filter: "drop-shadow(0 0 12px rgba(0, 191, 255, 0.7))",
          }}
          strokeWidth={strokeWidth}
        />
      );
    }

    // Default "classic" neon icon
    if (symbol === "X") {
      return (
        <X
          style={{
            width: size,
            height: size,
            color: "var(--accent-x, #00FFFF)",
            filter: "drop-shadow(0 0 8px var(--accent-x, #00FFFF))",
          }}
          strokeWidth={strokeWidth}
        />
      );
    }

    return (
      <Circle
        style={{
          width: size,
          height: size,
          color: "var(--accent-o, #FF00FF)",
          filter: "drop-shadow(0 0 8px var(--accent-o, #FF00FF))",
        }}
        strokeWidth={strokeWidth}
      />
    );
  };

  if (!animate) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {renderIconContent()}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={
        symbol === "X"
          ? { scale: 0, rotate: -180, opacity: 0 }
          : { scale: 0, opacity: 0 }
      }
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 18,
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      {renderIconContent()}
    </motion.div>
  );
}

