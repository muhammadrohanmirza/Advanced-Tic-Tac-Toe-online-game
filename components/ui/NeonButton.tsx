"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useSound } from "@/hooks/useSound";

export type ButtonVariant =
  | "primary"     // Glossy yellow-to-orange 3D pill from reference
  | "secondary"   // Glossy purple 3D pill from reference
  | "yellow"      // Alias to primary
  | "purple"      // Alias to secondary
  | "blue"        // Glossy sky-to-royal blue 3D pill from reference
  | "dark-blue"   // Glassy dark blue 3D pill (Settings, Leaderboard)
  | "dark"        // Alias to dark-blue
  | "cyan"        // High-contrast cyan button
  | "green"       // Green action button
  | "red"         // Danger button
  | "pink"        // Pink accent button
  | "ghost"       // Transparent outline button
  | "default";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
  shape?: "pill" | "rounded";
}

export function NeonButton({
  variant = "default",
  size = "md",
  isLoading = false,
  children,
  className = "",
  disabled,
  fullWidth = false,
  glow = true,
  shape = "pill",
  onClick,
  ...props
}: NeonButtonProps) {
  const { playSfx } = useSound();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      playSfx("click");
      onClick?.(e);
    }
  };

  const borderRadius = shape === "pill" ? "9999px" : "16px";

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
      padding: "8px 18px",
      fontSize: "14px",
      minHeight: "40px",
      gap: "6px",
    },
    md: {
      padding: "12px 26px",
      fontSize: "16px",
      minHeight: "48px",
      gap: "8px",
    },
    lg: {
      padding: "15px 34px",
      fontSize: "18px",
      minHeight: "56px",
      gap: "10px",
    },
    xl: {
      padding: "18px 44px",
      fontSize: "20px",
      minHeight: "64px",
      gap: "12px",
    },
  };

  // Distinct cartoon-3D style for each variant
  const getVariantStyles = (): {
    background: string;
    backgroundColor?: string;
    color: string;
    border: string;
    boxShadow: string;
    textShadow?: string;
  } => {
    switch (variant) {
      case "primary":
      case "yellow":
        return {
          background: "var(--btn-primary-bg, linear-gradient(180deg, #FFDF00 0%, #FFA800 100%))",
          backgroundColor: "#FFA800",
          color: "var(--btn-primary-text, #381E00)",
          border: "2px solid var(--btn-primary-border, #D47A00)",
          boxShadow: glow
            ? "var(--btn-primary-shadow, 0 4px 0 #D47A00, 0 8px 20px rgba(255, 168, 0, 0.4))"
            : "0 4px 0 #D47A00",
          textShadow: "0 1px 1px rgba(255, 255, 255, 0.5)",
        };
      case "secondary":
      case "purple":
        return {
          background: "var(--btn-secondary-bg, linear-gradient(180deg, #B537F2 0%, #7B16D9 100%))",
          backgroundColor: "#7B16D9",
          color: "var(--btn-secondary-text, #FFFFFF)",
          border: "2px solid var(--btn-secondary-border, #580B9E)",
          boxShadow: glow
            ? "var(--btn-secondary-shadow, 0 4px 0 #580B9E, 0 8px 18px rgba(123, 22, 217, 0.35))"
            : "0 4px 0 #580B9E",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)",
        };
      case "blue":
        return {
          background: "var(--btn-blue-bg, linear-gradient(180deg, #22B8FF 0%, #0077FE 100%))",
          backgroundColor: "#0077FE",
          color: "var(--btn-blue-text, #FFFFFF)",
          border: "2px solid var(--btn-blue-border, #004DB3)",
          boxShadow: glow
            ? "var(--btn-blue-shadow, 0 4px 0 #004DB3, 0 8px 18px rgba(0, 119, 254, 0.4))"
            : "0 4px 0 #004DB3",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
        };
      case "dark-blue":
      case "dark":
        return {
          background: "var(--btn-dark-bg, linear-gradient(180deg, #1C3574 0%, #0F1E4A 100%))",
          backgroundColor: "#0F1E4A",
          color: "var(--btn-dark-text, #FFFFFF)",
          border: "2px solid var(--btn-dark-border, #081230)",
          boxShadow: glow
            ? "var(--btn-dark-shadow, 0 4px 0 #081230, 0 6px 14px rgba(0, 0, 0, 0.35))"
            : "0 4px 0 #081230",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
        };
      case "cyan":
        return {
          background: "linear-gradient(180deg, #00FFFF 0%, #00BFFF 100%)",
          color: "#031E2B",
          border: "1.5px solid rgba(255, 255, 255, 0.5)",
          boxShadow: glow
            ? "0 4px 0 #007CA3, 0 8px 18px rgba(0, 255, 255, 0.35)"
            : "0 4px 0 #007CA3",
          textShadow: "0 1px 1px rgba(255, 255, 255, 0.5)",
        };
      case "green":
        return {
          background: "linear-gradient(180deg, #00FF88 0%, #00B344 100%)",
          color: "#022008",
          border: "1.5px solid rgba(255, 255, 255, 0.4)",
          boxShadow: glow
            ? "0 4px 0 #008030, 0 8px 18px rgba(0, 255, 136, 0.35)"
            : "0 4px 0 #008030",
          textShadow: "0 1px 1px rgba(255, 255, 255, 0.4)",
        };
      case "red":
        return {
          background: "linear-gradient(180deg, #FF5252 0%, #D32F2F 100%)",
          color: "#FFFFFF",
          border: "1.5px solid rgba(255, 255, 255, 0.35)",
          boxShadow: glow
            ? "0 4px 0 #9A0007, 0 8px 18px rgba(211, 47, 47, 0.35)"
            : "0 4px 0 #9A0007",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)",
        };
      case "pink":
        return {
          background: "linear-gradient(180deg, #FF66CC 0%, #CC0088 100%)",
          color: "#FFFFFF",
          border: "1.5px solid rgba(255, 255, 255, 0.4)",
          boxShadow: glow
            ? "0 4px 0 #880055, 0 8px 18px rgba(204, 0, 136, 0.35)"
            : "0 4px 0 #880055",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
        };
      case "ghost":
        return {
          background: "transparent",
          color: "var(--text-primary, #ffffff)",
          border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.2))",
          boxShadow: "none",
        };
      case "default":
      default:
        return {
          background: "var(--btn-dark-bg, linear-gradient(180deg, #1C3574 0%, #0F1E4A 100%))",
          color: "var(--text-primary, #ffffff)",
          border: "1.5px solid var(--border-color, rgba(80, 140, 255, 0.4))",
          boxShadow: glow
            ? "var(--btn-dark-shadow, 0 4px 0 #081230, 0 6px 14px rgba(0, 0, 0, 0.35))"
            : "0 4px 0 #081230",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.4)",
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <motion.button
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display, inherit)",
        fontWeight: 700,
        letterSpacing: "0.5px",
        borderRadius,
        cursor: disabled || isLoading ? "not-allowed" : "pointer",
        opacity: disabled || isLoading ? 0.55 : 1,
        width: fullWidth ? "100%" : "auto",
        outline: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        boxSizing: "border-box",
        ...sizeStyles[size],
        ...vStyles,
        ...props.style,
      }}
      className={`btn-3d btn-3d-${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98, y: 2 } : {}}
      {...props}
      onClick={handleClick}
    >
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Loader2
            style={{
              width: "18px",
              height: "18px",
              animation: "spin 1s linear infinite",
            }}
          />
          <span>Loading...</span>
        </div>
      ) : (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </span>
      )}
    </motion.button>
  );
}
