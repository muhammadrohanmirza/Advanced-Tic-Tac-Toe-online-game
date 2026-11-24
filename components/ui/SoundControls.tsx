"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Sliders } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { RoundIconButton } from "@/components/ui/RoundIconButton";

interface SoundControlsProps {
  align?: "left" | "right";
  compact?: boolean;
}

export function SoundControls({
  align = "right",
  compact = false,
}: SoundControlsProps) {
  const [showPopover, setShowPopover] = useState(false);
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
  } = useSound();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover]);

  const isMuted = isSfxMuted && isMusicMuted;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <RoundIconButton
        variant="dark"
        size={compact ? 38 : 44}
        ariaLabel={isMuted ? "Unmute audio" : "Audio settings"}
        onClick={() => {
          playSfx("click");
          // Toggle mute or open volume slider
          setShowPopover((prev) => !prev);
        }}
      >
        {isMuted ? (
          <VolumeX style={{ width: compact ? "18px" : "20px", height: compact ? "18px" : "20px", color: "var(--accent-red, #FF3B30)" }} />
        ) : (
          <Volume2 style={{ width: compact ? "18px" : "20px", height: compact ? "18px" : "20px", color: "var(--accent-x, #00A3FF)" }} />
        )}
      </RoundIconButton>

      {/* Popover Volume Sliders */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.15 }}
            className="game-card-light"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              [align === "right" ? "right" : "left"]: 0,
              width: "240px",
              padding: "16px",
              borderRadius: "20px",
              boxShadow: "0 12px 30px rgba(0, 15, 50, 0.35)",
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>
                Volume
              </span>
              <button
                type="button"
                onClick={() => {
                  playSfx("click");
                  toggleSfxMute();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: isSfxMuted ? "#EF4444" : "#0284C7",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                }}
              >
                {isSfxMuted ? "Unmute" : "Mute SFX"}
              </button>
            </div>

            {/* SFX Volume */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                <span>SFX</span>
                <span>{Math.round(sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isSfxMuted ? 0 : sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#0284C7", cursor: "pointer" }}
              />
            </div>

            {/* Music Volume */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                <span>Music</span>
                <span>{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMusicMuted ? 0 : musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#A855F7", cursor: "pointer" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
