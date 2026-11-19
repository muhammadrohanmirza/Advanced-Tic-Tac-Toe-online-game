"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Music,
  Sliders,
  Check,
  Play,
  X as CloseIcon,
} from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface SoundControlsProps {
  align?: "left" | "right";
  compact?: boolean;
}

export function SoundControls({
  align = "right",
  compact = false,
}: SoundControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    playSfx,
    sfxVolume,
    musicVolume,
    isSfxMuted,
    isMusicMuted,
    setSfxVolume,
    setMusicVolume,
    toggleSfxMute,
    toggleMusicMute,
  } = useSound();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const allMuted = isSfxMuted && isMusicMuted;
  const activeColor = allMuted ? "#FF3131" : !isMusicMuted ? "#FF00FF" : "#00FFFF";

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => {
          playSfx("click");
          setIsOpen((prev) => !prev);
        }}
        whileHover={{
          scale: 1.05,
          boxShadow: `0 0 16px ${activeColor}55`,
        }}
        whileTap={{ scale: 0.95 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: compact ? "6px 10px" : "8px 14px",
          minHeight: compact ? "36px" : "40px",
          borderRadius: "10px",
          border: `1.5px solid ${activeColor}`,
          backgroundColor: isOpen
            ? `${activeColor}22`
            : "var(--bg-card, rgba(13, 13, 13, 0.8))",
          color: activeColor,
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          textShadow: `0 0 8px ${activeColor}`,
          boxShadow: `0 0 10px ${activeColor}33`,
          transition: "border-color 0.2s, background-color 0.2s",
        }}
        title="Audio Settings"
        aria-label="Audio Settings"
      >
        {allMuted ? (
          <VolumeX style={{ width: "16px", height: "16px" }} />
        ) : !isMusicMuted ? (
          <Music style={{ width: "16px", height: "16px" }} />
        ) : (
          <Volume2 style={{ width: "16px", height: "16px" }} />
        )}
        <span style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
          {allMuted ? "Muted" : "Sound"}
        </span>
      </motion.button>

      {/* Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              [align === "right" ? "right" : "left"]: 0,
              width: "280px",
              padding: "16px",
              backgroundColor: "var(--bg-card-solid, rgba(13, 13, 13, 0.97))",
              borderRadius: "14px",
              border: "1px solid var(--border-color, rgba(0, 255, 255, 0.25))",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 255, 255, 0.15)",
              backdropFilter: "blur(12px)",
              zIndex: 1000,
              color: "var(--text-primary, #ffffff)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "10px",
                marginBottom: "14px",
                borderBottom: "1px solid var(--border-color, #1a1a1a)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#00FFFF",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                <Sliders style={{ width: "16px", height: "16px" }} />
                <span>Audio Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                }}
                aria-label="Close audio settings"
              >
                <CloseIcon style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Section 1: Sound Effects (SFX) */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: isSfxMuted ? "#6b7280" : "#00FFFF",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {isSfxMuted ? (
                    <VolumeX style={{ width: "15px", height: "15px" }} />
                  ) : (
                    <Volume2 style={{ width: "15px", height: "15px" }} />
                  )}
                  <span>Sound Effects</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx("placeX");
                    }}
                    disabled={isSfxMuted}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(0, 255, 255, 0.4)",
                      borderRadius: "6px",
                      color: isSfxMuted ? "#4b5563" : "#00FFFF",
                      padding: "2px 8px",
                      fontSize: "11px",
                      cursor: isSfxMuted ? "not-allowed" : "pointer",
                    }}
                    title="Test SFX sound"
                  >
                    Test
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleSfxMute();
                      playSfx("click");
                    }}
                    style={{
                      background: isSfxMuted
                        ? "rgba(255, 49, 49, 0.15)"
                        : "rgba(0, 255, 255, 0.15)",
                      border: `1px solid ${
                        isSfxMuted ? "#FF3131" : "#00FFFF"
                      }`,
                      color: isSfxMuted ? "#FF3131" : "#00FFFF",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {isSfxMuted ? "Unmute" : "Mute"}
                  </button>
                </div>
              </div>

              {/* SFX Volume Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isSfxMuted ? 0 : sfxVolume}
                  disabled={isSfxMuted}
                  onChange={(e) => {
                    setSfxVolume(parseFloat(e.target.value));
                  }}
                  className="neon-slider-cyan"
                  style={{
                    opacity: isSfxMuted ? 0.4 : 1,
                    cursor: isSfxMuted ? "not-allowed" : "pointer",
                  }}
                />
                <span
                  style={{
                    color: isSfxMuted ? "#6b7280" : "#00FFFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "monospace",
                    minWidth: "36px",
                    textAlign: "right",
                  }}
                >
                  {isSfxMuted ? "0%" : `${Math.round(sfxVolume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Section 2: Background Music */}
            <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border-color, #1a1a1a)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: isMusicMuted ? "#6b7280" : "#FF00FF",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <Music style={{ width: "15px", height: "15px" }} />
                  <span>Music (Synth)</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    toggleMusicMute();
                    playSfx("click");
                  }}
                  style={{
                    background: isMusicMuted
                      ? "rgba(255, 49, 49, 0.15)"
                      : "rgba(255, 0, 255, 0.15)",
                    border: `1px solid ${
                      isMusicMuted ? "#FF3131" : "#FF00FF"
                    }`,
                    color: isMusicMuted ? "#FF3131" : "#FF00FF",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {isMusicMuted ? "Turn On" : "Mute"}
                </button>
              </div>

              {/* Music Volume Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMusicMuted ? 0 : musicVolume}
                  disabled={isMusicMuted}
                  onChange={(e) => {
                    setMusicVolume(parseFloat(e.target.value));
                  }}
                  className="neon-slider-pink"
                  style={{
                    opacity: isMusicMuted ? 0.4 : 1,
                    cursor: isMusicMuted ? "not-allowed" : "pointer",
                  }}
                />
                <span
                  style={{
                    color: isMusicMuted ? "#6b7280" : "#FF00FF",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "monospace",
                    minWidth: "36px",
                    textAlign: "right",
                  }}
                >
                  {isMusicMuted ? "0%" : `${Math.round(musicVolume * 100)}%`}
                </span>
              </div>

              <p
                style={{
                  fontSize: "10px",
                  color: isMusicMuted ? "#6b7280" : "#a855f7",
                  marginTop: "6px",
                  marginBottom: 0,
                  fontStyle: "italic",
                }}
              >
                {isMusicMuted
                  ? "Ambient background music is off"
                  : "♪ Ambient neon lo-fi synth playing"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

