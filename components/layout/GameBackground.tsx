"use client";

import React from "react";

export function GameBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {/* Ambient Top Glow */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80vw",
          maxWidth: "800px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--accent-glow, rgba(0, 163, 255, 0.15)) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Floating Decorative Shapes (X and O) */}
      <div
        className="floating-decoration"
        style={{
          position: "absolute",
          top: "8%",
          left: "5%",
          animation: "floatSlow 8s ease-in-out infinite",
          opacity: "var(--decor-opacity, 0.14)",
        }}
      >
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <path
            d="M8 8L36 36M36 8L8 36"
            stroke="var(--accent-x, #00A3FF)"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        className="floating-decoration"
        style={{
          position: "absolute",
          top: "14%",
          right: "8%",
          animation: "floatSlowReverse 9s ease-in-out infinite",
          opacity: "var(--decor-opacity, 0.14)",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
          <circle
            cx="21"
            cy="21"
            r="16"
            stroke="var(--accent-o, #FF7A00)"
            strokeWidth="6.5"
          />
        </svg>
      </div>

      <div
        className="floating-decoration"
        style={{
          position: "absolute",
          bottom: "18%",
          left: "7%",
          animation: "floatSlowReverse 10s ease-in-out infinite",
          opacity: "var(--decor-opacity, 0.12)",
        }}
      >
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle
            cx="26"
            cy="26"
            r="20"
            stroke="var(--accent-o, #FF7A00)"
            strokeWidth="7"
          />
        </svg>
      </div>

      <div
        className="floating-decoration"
        style={{
          position: "absolute",
          bottom: "22%",
          right: "6%",
          animation: "floatSlow 8.5s ease-in-out infinite",
          opacity: "var(--decor-opacity, 0.12)",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path
            d="M9 9L39 39M39 9L9 39"
            stroke="var(--accent-x, #00A3FF)"
            strokeWidth="7.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Mid Subtle Accent Tokens */}
      <div
        className="floating-decoration"
        style={{
          position: "absolute",
          top: "45%",
          left: "2%",
          animation: "floatSlow 11s ease-in-out infinite",
          opacity: "var(--decor-opacity, 0.08)",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke="var(--accent-x, #00A3FF)"
            strokeWidth="5"
          />
        </svg>
      </div>

      <div
        className="floating-decoration"
        style={{
          position: "absolute",
          top: "48%",
          right: "3%",
          animation: "floatSlowReverse 11s ease-in-out infinite",
          opacity: "var(--decor-opacity, 0.08)",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path
            d="M6 6L24 24M24 6L6 24"
            stroke="var(--accent-o, #FF7A00)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Multi-Layered Cartoon Bottom Wave */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: "clamp(60px, 11vh, 120px)",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {/* Back Wave (Purple accent) */}
          <path
            d="M0,90 C320,160 540,20 860,110 C1140,180 1320,80 1440,110 L1440,180 L0,180 Z"
            fill="var(--wave-color-3, #432b85)"
            opacity="0.6"
          />
          {/* Middle Wave (Medium blue) */}
          <path
            d="M0,120 C240,60 520,160 820,90 C1100,30 1300,140 1440,90 L1440,180 L0,180 Z"
            fill="var(--wave-color-2, #21439e)"
            opacity="0.75"
          />
          {/* Front Wave (Deep blue base) */}
          <path
            d="M0,140 C360,100 680,180 1020,130 C1240,95 1380,145 1440,140 L1440,180 L0,180 Z"
            fill="var(--wave-color-1, #13245a)"
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  );
}
