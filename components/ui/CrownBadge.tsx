"use client";

import React from "react";

interface CrownBadgeProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CrownBadge({ size = 28, className = "", style }: CrownBadgeProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.75)}
      viewBox="0 0 32 24"
      fill="none"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        filter: "drop-shadow(0 2px 4px rgba(212, 122, 0, 0.45))",
        ...style,
      }}
    >
      <defs>
        <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="45%" stopColor="#FFC800" />
          <stop offset="100%" stopColor="#E69500" />
        </linearGradient>
        <linearGradient id="crownShine" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Crown base shape */}
      <path
        d="M2 19L5 7L11 13L16 3L21 13L27 7L30 19C30 20.66 28.66 22 27 22H5C3.34 22 2 20.66 2 19Z"
        fill="url(#crownGrad)"
        stroke="#B36B00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Crown jewels / circles */}
      <circle cx="5" cy="6" r="1.8" fill="#FFF8B0" stroke="#B36B00" strokeWidth="0.8" />
      <circle cx="16" cy="2.5" r="2.2" fill="#FFF8B0" stroke="#B36B00" strokeWidth="0.8" />
      <circle cx="27" cy="6" r="1.8" fill="#FFF8B0" stroke="#B36B00" strokeWidth="0.8" />
      {/* Crown base band */}
      <path
        d="M4 18C10 19 22 19 28 18"
        stroke="#8C4E00"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="18.5" r="1.2" fill="#FFFFFF" />
      <circle cx="16" cy="18.5" r="1.4" fill="#FF5252" />
      <circle cx="22" cy="18.5" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}
