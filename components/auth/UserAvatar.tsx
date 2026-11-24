"use client";

import React from "react";
import { motion } from "framer-motion";
import { useWindowSize } from "@/hooks/useWindowSize";

interface UserAvatarProps {
  userName: string;
  userEmail: string;
}

export function UserAvatar({ userName, userEmail }: UserAvatarProps) {
  const { width } = useWindowSize();
  const firstName = userName ? userName.split(" ")[0] : "Player";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isSmallScreen = width < 480;

  return (
    <motion.div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        minWidth: 0,
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        style={{
          width: isSmallScreen ? "32px" : "38px",
          height: isSmallScreen ? "32px" : "38px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00FFFF, #FF00FF)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          color: "#050505",
          fontSize: isSmallScreen ? "13px" : "15px",
          boxShadow: "0 0 10px rgba(0,255,255,0.3)",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <p
          style={{
            fontWeight: 700,
            color: "var(--text-primary, #ffffff)",
            margin: 0,
            fontSize: isSmallScreen ? "12px" : "13px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "var(--font-display)",
            maxWidth: isSmallScreen ? "80px" : "140px",
          }}
          title={userName}
        >
          {isSmallScreen ? firstName : userName}
        </p>
        {userEmail && (
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted, #9ca3af)",
              margin: "1px 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "140px",
              display: isSmallScreen ? "none" : "block",
            }}
            title={userEmail}
          >
            {userEmail}
          </p>
        )}
      </div>
    </motion.div>
  );
}
