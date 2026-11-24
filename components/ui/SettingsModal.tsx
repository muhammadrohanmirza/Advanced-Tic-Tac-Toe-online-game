"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Volume2, VolumeX, Music, Check } from "lucide-react";
import { useTheme, THEMES, SKINS, ThemeId, SkinId } from "@/hooks/useTheme";
import { useSound } from "@/hooks/useSound";
import { NeonButton } from "@/components/ui/NeonButton";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, skin, setSkin } = useTheme();
  const {
    playSfx,
    isSfxMuted,
    isMusicMuted,
    toggleSfxMute,
    toggleMusicMute,
  } = useSound();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflowY;
      document.body.style.overflowY = "hidden";
      return () => {
        document.body.style.overflowY = prev || "auto";
      };
    }
  }, [isOpen]);

  const handleSave = () => {
    playSfx("click");
    onClose();
  };

  const themeColors: { id: ThemeId; color: string; label: string }[] = [
    { id: "neon-purple", color: "#00A3FF", label: "Classic 3D" },
    { id: "neon-blue", color: "#8B5CF6", label: "Sapphire" },
    { id: "neon-green", color: "#10B981", label: "Emerald" },
    { id: "sunset", color: "#F97316", label: "Sunset" },
    { id: "light", color: "#1E293B", label: "Light Mode" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(5, 12, 35, 0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="game-card-light"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "min(440px, calc(100vw - 24px))",
              padding: "clamp(16px, 4vw, 28px)",
              borderRadius: "clamp(22px, 5vw, 30px)",
              boxShadow: "0 24px 50px rgba(0, 15, 50, 0.45)",
              maxHeight: "calc(100dvh - 24px)",
              overflowY: "auto",
              scrollbarWidth: "thin",
              boxSizing: "border-box",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                paddingBottom: "12px",
                borderBottom: "1.5px solid #E2E8F0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "#0284C7",
                  }}
                />
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#0F172A",
                    margin: 0,
                  }}
                >
                  Settings
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "#F1F5F9",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
              >
                <X style={{ width: "20px", height: "20px" }} />
              </button>
            </div>

            {/* Section: Themes */}
            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "10px",
                }}
              >
                Theme
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#F8FAFC",
                  padding: "12px 16px",
                  borderRadius: "18px",
                  border: "1px solid #E2E8F0",
                }}
              >
                {themeColors.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playSfx("click");
                        setTheme(t.id);
                      }}
                      aria-label={t.label}
                      title={t.label}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: t.color,
                        border: isSelected ? "3px solid #FFFFFF" : "2px solid transparent",
                        boxShadow: isSelected
                          ? `0 0 0 3px #0284C7, 0 4px 10px rgba(0,0,0,0.2)`
                          : "0 2px 4px rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <Check style={{ width: "16px", height: "16px", color: "#FFFFFF" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: Skins */}
            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "10px",
                }}
              >
                Game Skin
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {SKINS.map((s) => {
                  const isSelected = skin === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        playSfx("click");
                        setSkin(s.id);
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "14px",
                        backgroundColor: isSelected ? "#0284C7" : "#F8FAFC",
                        color: isSelected ? "#FFFFFF" : "#0F172A",
                        border: isSelected ? "1.5px solid #0284C7" : "1px solid #E2E8F0",
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{s.name}</span>
                      <span style={{ fontSize: "12px", opacity: isSelected ? 0.9 : 0.6 }}>
                        {s.preview}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: Audio Toggles */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "10px",
                }}
              >
                Audio
              </label>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Sound Toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {!isSfxMuted ? (
                      <Volume2 style={{ width: "20px", height: "20px", color: "#0284C7" }} />
                    ) : (
                      <VolumeX style={{ width: "20px", height: "20px", color: "#94A3B8" }} />
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "15px",
                        color: "#0F172A",
                      }}
                    >
                      Sound Effects
                    </span>
                  </div>

                  {/* Toggle Pill Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isSfxMuted}
                    onClick={() => {
                      playSfx("click");
                      toggleSfxMute();
                    }}
                    style={{
                      width: "50px",
                      height: "28px",
                      borderRadius: "9999px",
                      backgroundColor: !isSfxMuted ? "#0284C7" : "#CBD5E1",
                      border: "none",
                      padding: "2px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      transition: "background-color 0.2s ease",
                      position: "relative",
                    }}
                  >
                    <motion.div
                      animate={{ x: !isSfxMuted ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  </button>
                </div>

                {/* Music Toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Music
                      style={{
                        width: "20px",
                        height: "20px",
                        color: !isMusicMuted ? "#0284C7" : "#94A3B8",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "15px",
                        color: "#0F172A",
                      }}
                    >
                      Background Music
                    </span>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isMusicMuted}
                    onClick={() => {
                      playSfx("click");
                      toggleMusicMute();
                    }}
                    style={{
                      width: "50px",
                      height: "28px",
                      borderRadius: "9999px",
                      backgroundColor: !isMusicMuted ? "#0284C7" : "#CBD5E1",
                      border: "none",
                      padding: "2px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      transition: "background-color 0.2s ease",
                      position: "relative",
                    }}
                  >
                    <motion.div
                      animate={{ x: !isMusicMuted ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <NeonButton
              variant="blue"
              size="lg"
              fullWidth
              onClick={handleSave}
            >
              <Check style={{ width: "20px", height: "20px" }} />
              <span>Save Settings</span>
            </NeonButton>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
