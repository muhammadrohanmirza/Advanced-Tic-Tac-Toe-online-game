"use client";

import React from "react";
import { motion } from "framer-motion";

export function Home3DIllustration({ size = 280 }: { size?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: `min(${size}px, 84vw)`,
        height: `calc(min(${size}px, 84vw) * 0.9)`,
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      {/* Outer Glowing Energy Orbital Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: "115%",
          height: "65%",
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "rgba(0, 163, 255, 0.7)",
          borderBottomColor: "rgba(255, 122, 0, 0.7)",
          filter: "drop-shadow(0 0 16px rgba(0, 163, 255, 0.5)) drop-shadow(0 0 16px rgba(255, 122, 0, 0.5))",
          transform: "rotateX(62deg)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: "98%",
          height: "52%",
          borderRadius: "50%",
          border: "2.5px solid transparent",
          borderLeftColor: "rgba(255, 223, 0, 0.8)",
          borderRightColor: "rgba(181, 55, 242, 0.8)",
          filter: "drop-shadow(0 0 12px rgba(255, 223, 0, 0.4))",
          transform: "rotateX(62deg)",
          pointerEvents: "none",
        }}
      />

      {/* Floating 3D Isometric Tile Grid */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "relative",
          width: "180px",
          height: "180px",
          transform: "rotateX(55deg) rotateZ(-45deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Soft shadow underneath */}
        <div
          style={{
            position: "absolute",
            inset: "-10px",
            borderRadius: "32px",
            backgroundColor: "rgba(0, 10, 35, 0.55)",
            filter: "blur(20px)",
            transform: "translateZ(-30px)",
          }}
        />

        {/* 2x2 Floating Chunky 3D Tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "12px",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Tile 1: Blue X */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "18px",
              boxShadow: "0 8px 0 #BDCEF0, 0 14px 22px rgba(0, 15, 50, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
              <path
                d="M9 9L35 35M35 9L9 35"
                stroke="#00A3FF"
                strokeWidth="8"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 3px 0 #0066CC)" }}
              />
            </svg>
          </div>

          {/* Tile 2: Orange O */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "18px",
              boxShadow: "0 8px 0 #BDCEF0, 0 14px 22px rgba(0, 15, 50, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
              <circle
                cx="22"
                cy="22"
                r="14"
                stroke="#FF7A00"
                strokeWidth="7.5"
                style={{ filter: "drop-shadow(0 3px 0 #CC5500)" }}
              />
            </svg>
          </div>

          {/* Tile 3: Orange O */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "18px",
              boxShadow: "0 8px 0 #BDCEF0, 0 14px 22px rgba(0, 15, 50, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
              <circle
                cx="22"
                cy="22"
                r="14"
                stroke="#FF7A00"
                strokeWidth="7.5"
                style={{ filter: "drop-shadow(0 3px 0 #CC5500)" }}
              />
            </svg>
          </div>

          {/* Tile 4: Blue X */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "18px",
              boxShadow: "0 8px 0 #BDCEF0, 0 14px 22px rgba(0, 15, 50, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
              <path
                d="M9 9L35 35M35 9L9 35"
                stroke="#00A3FF"
                strokeWidth="8"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 3px 0 #0066CC)" }}
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
