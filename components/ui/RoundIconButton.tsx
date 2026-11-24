"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { useSound } from "@/hooks/useSound";

interface RoundIconButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  size?: number; // default 44px
  variant?: "dark" | "blue" | "purple" | "yellow" | "ghost";
  ariaLabel: string;
}

export function RoundIconButton({
  children,
  size = 44,
  variant = "dark",
  ariaLabel,
  disabled,
  onClick,
  style,
  className = "",
  ...props
}: RoundIconButtonProps) {
  const { playSfx } = useSound();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      playSfx("click");
      onClick?.(e);
    }
  };

  const getVariantStyles = (): {
    background: string;
    border: string;
    boxShadow: string;
    color: string;
  } => {
    switch (variant) {
      case "blue":
        return {
          background: "linear-gradient(180deg, #22B8FF 0%, #0077FE 100%)",
          border: "1.5px solid rgba(255, 255, 255, 0.4)",
          boxShadow: "0 3px 0 #004DB3, 0 6px 14px rgba(0, 119, 254, 0.4)",
          color: "#FFFFFF",
        };
      case "purple":
        return {
          background: "linear-gradient(180deg, #B537F2 0%, #7B16D9 100%)",
          border: "1.5px solid rgba(255, 255, 255, 0.35)",
          boxShadow: "0 3px 0 #580B9E, 0 6px 14px rgba(123, 22, 217, 0.4)",
          color: "#FFFFFF",
        };
      case "yellow":
        return {
          background: "linear-gradient(180deg, #FFDF00 0%, #FFA800 100%)",
          border: "1.5px solid rgba(255, 255, 255, 0.4)",
          boxShadow: "0 3px 0 #D47A00, 0 6px 14px rgba(255, 168, 0, 0.4)",
          color: "#381E00",
        };
      case "ghost":
        return {
          background: "transparent",
          border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
          boxShadow: "none",
          color: "var(--text-primary, #FFFFFF)",
        };
      case "dark":
      default:
        return {
          background: "var(--btn-dark-bg, linear-gradient(180deg, #1C3574 0%, #0F1E4A 100%))",
          border: "1.5px solid var(--border-color, rgba(80, 140, 255, 0.4))",
          boxShadow: "0 3px 0 var(--btn-dark-border, #081230), 0 6px 12px rgba(0, 0, 0, 0.35)",
          color: "var(--text-primary, #FFFFFF)",
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      whileHover={!disabled ? { scale: 1.06, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.94, y: 2 } : {}}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform 0.1s ease, box-shadow 0.1s ease",
        outline: "none",
        ...vStyles,
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}
