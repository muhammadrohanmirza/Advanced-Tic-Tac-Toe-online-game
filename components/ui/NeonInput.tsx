"use client";

import React, { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface NeonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: "cyan" | "pink" | "green" | "yellow" | "red" | "purple";
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const NeonInput = forwardRef<HTMLInputElement, NeonInputProps>(
  function NeonInput(
    {
      label,
      error,
      variant = "cyan",
      icon,
      showPasswordToggle = false,
      type = "text",
      className = "",
      style,
      ...props
    },
    ref
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

    return (
      <div style={{ width: "100%" }}>
        {label && (
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "8px",
              color: isFocused ? "var(--accent-x, #00A3FF)" : "var(--text-secondary, #c2d6ff)",
              transition: "color 0.2s ease",
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          {icon && (
            <div
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: isFocused ? "var(--accent-x, #00A3FF)" : "var(--text-muted, #8aa0d4)",
                transition: "color 0.2s ease",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
              }}
            >
              {icon}
            </div>
          )}
          <input
            type={inputType}
            ref={ref}
            style={{
              width: "100%",
              minHeight: "48px",
              padding: icon
                ? "12px 18px 12px 48px"
                : showPasswordToggle
                ? "12px 48px 12px 18px"
                : "12px 18px",
              backgroundColor: "var(--bg-input, rgba(10, 19, 51, 0.9))",
              border: `1.5px solid ${
                error
                  ? "var(--accent-red, #FF3B30)"
                  : isFocused
                  ? "var(--accent-x, #00A3FF)"
                  : "var(--border-color, rgba(65, 115, 235, 0.35))"
              }`,
              borderRadius: "16px",
              color: "var(--text-primary, #ffffff)",
              outline: "none",
              fontSize: "16px", // 16px prevents iOS automatic zoom
              fontFamily: "var(--font-body)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: isFocused && !error
                ? "0 0 14px rgba(0, 163, 255, 0.35)"
                : error
                ? "0 0 14px rgba(255, 59, 48, 0.3)"
                : "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
              ...style,
            }}
            className={className}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted, #8aa0d4)",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
              }}
            >
              {showPassword ? (
                <EyeOff style={{ width: "20px", height: "20px" }} />
              ) : (
                <Eye style={{ width: "20px", height: "20px" }} />
              )}
            </button>
          )}
        </div>
        {error && (
          <motion.p
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "var(--accent-red, #FF3B30)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-body)",
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span
              style={{
                display: "inline-block",
                width: "5px",
                height: "5px",
                backgroundColor: "var(--accent-red, #FF3B30)",
                borderRadius: "50%",
              }}
            />
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
