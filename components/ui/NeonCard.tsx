"use client";

import React from "react";
import { motion } from "framer-motion";

export type CardVariant =
  | "default"
  | "glass"
  | "light"
  | "cyan"
  | "pink"
  | "green"
  | "yellow"
  | "red"
  | "purple";

interface NeonCardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  hover?: boolean;
}

export function NeonCard({
  variant = "default",
  children,
  className = "",
  style,
  glow = false,
  hover = false,
}: NeonCardProps) {
  const getCardStyle = (): {
    bg: string;
    border: string;
    shadow: string;
    color: string;
    borderRadius: string;
  } => {
    switch (variant) {
      case "light":
        return {
          bg: "var(--bg-card-light, #FFFFFF)",
          border: "2px solid #D5E2F8",
          shadow: "0 16px 40px rgba(0, 20, 60, 0.28)",
          color: "#0F172A",
          borderRadius: "clamp(20px, 4vw, 28px)",
        };
      case "cyan":
        return {
          bg: "var(--bg-card, rgba(14, 25, 66, 0.85))",
          border: "1.5px solid var(--accent-x, #00A3FF)",
          shadow: glow ? "0 0 24px rgba(0, 163, 255, 0.25)" : "0 10px 28px rgba(0, 0, 0, 0.4)",
          color: "var(--text-primary, #ffffff)",
          borderRadius: "clamp(18px, 4vw, 24px)",
        };
      case "pink":
        return {
          bg: "var(--bg-card, rgba(14, 25, 66, 0.85))",
          border: "1.5px solid var(--accent-o, #FF7A00)",
          shadow: glow ? "0 0 24px rgba(255, 122, 0, 0.25)" : "0 10px 28px rgba(0, 0, 0, 0.4)",
          color: "var(--text-primary, #ffffff)",
          borderRadius: "clamp(18px, 4vw, 24px)",
        };
      case "glass":
      case "default":
      default:
        return {
          bg: "var(--bg-card, rgba(14, 25, 66, 0.82))",
          border: "1.5px solid var(--border-color, rgba(65, 115, 235, 0.35))",
          shadow: glow
            ? "0 12px 32px rgba(0, 10, 40, 0.45), 0 0 20px var(--border-color-glow, rgba(0, 163, 255, 0.2))"
            : "0 12px 32px rgba(0, 10, 40, 0.45)",
          color: "var(--text-primary, #ffffff)",
          borderRadius: "clamp(18px, 4vw, 24px)",
        };
    }
  };

  const card = getCardStyle();

  return (
    <motion.div
      style={{
        padding: "clamp(18px, 4vw, 26px)",
        borderRadius: card.borderRadius,
        backgroundColor: card.bg,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: card.border,
        boxShadow: card.shadow,
        color: card.color,
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        ...style,
      }}
      className={className}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...(hover
        ? {
            whileHover: {
              scale: 1.015,
              boxShadow: "0 16px 40px rgba(0, 163, 255, 0.2)",
            },
          }
        : {})}
    >
      {children}
    </motion.div>
  );
}
