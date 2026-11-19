"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, Sparkles, X as CloseIcon, Sun, Moon } from "lucide-react";
import { useTheme, THEMES, SKINS, ThemeId, SkinId } from "@/hooks/useTheme";
import { useSound } from "@/hooks/useSound";
import { GameSkinIcon } from "@/components/game/GameSkinIcon";

interface ThemeSwitcherProps {
  align?: "left" | "right";
  compact?: boolean;
}

export function ThemeSwitcher({
  align = "right",
  compact = false,
}: ThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, skin, setSkin, isLight, currentThemeConfig } = useTheme();
  const { playSfx } = useSound();

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

  const activeColor = currentThemeConfig.accentX;

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
          textShadow: isLight ? "none" : `0 0 8px ${activeColor}`,
          boxShadow: `0 0 10px ${activeColor}33`,
          transition: "all 0.2s ease",
        }}
        title="Theme & Skins"
        aria-label="Theme and Skin settings"
      >
        <Palette style={{ width: "16px", height: "16px" }} />
        <span style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
          Theme
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
              width: "320px",
              maxWidth: "92vw",
              padding: "16px",
              backgroundColor: "var(--bg-card, rgba(13, 13, 13, 0.97))",
              borderRadius: "16px",
              border: `1px solid var(--border-color-glow, rgba(0, 255, 255, 0.25))`,
              boxShadow: "0 10px 35px rgba(0, 0, 0, 0.7), 0 0 25px var(--border-color-glow, rgba(0, 255, 255, 0.15))",
              backdropFilter: "blur(14px)",
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
                  color: activeColor,
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                <Palette style={{ width: "16px", height: "16px" }} />
                <span>Theme & Skins</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted, #6b7280)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                }}
                aria-label="Close theme settings"
              >
                <CloseIcon style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Section 1: Themes */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted, #9ca3af)",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <span>Select Theme</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "6px",
                }}
              >
                {THEMES.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playSfx("click");
                        setTheme(t.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: isSelected
                          ? `1.5px solid ${t.accentX}`
                          : "1px solid var(--border-color, #1a1a1a)",
                        backgroundColor: isSelected
                          ? `${t.accentX}18`
                          : "var(--bg-card-hover, rgba(20, 20, 20, 0.6))",
                        color: "var(--text-primary, #ffffff)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {/* Swatch color circles */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "-4px",
                          }}
                        >
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              backgroundColor: t.bgPreview,
                              border: "1px solid rgba(255,255,255,0.2)",
                              display: "inline-block",
                            }}
                          />
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              backgroundColor: t.accentX,
                              marginLeft: "-4px",
                              boxShadow: `0 0 6px ${t.accentX}`,
                              display: "inline-block",
                            }}
                          />
                          <span
                            style={{
                              width: "14px",
                              height: "14px",
                              borderRadius: "50%",
                              backgroundColor: t.accentO,
                              marginLeft: "-4px",
                              boxShadow: `0 0 6px ${t.accentO}`,
                              display: "inline-block",
                            }}
                          />
                        </div>

                        <div>
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              margin: 0,
                              color: isSelected
                                ? t.accentX
                                : "var(--text-primary, #ffffff)",
                            }}
                          >
                            {t.name}
                          </p>
                          <p
                            style={{
                              fontSize: "10px",
                              margin: 0,
                              color: "var(--text-muted, #9ca3af)",
                            }}
                          >
                            {t.tagline}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check
                          style={{
                            width: "16px",
                            height: "16px",
                            color: t.accentX,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: X/O Skins */}
            <div
              style={{
                paddingTop: "12px",
                borderTop: "1px solid var(--border-color, #1a1a1a)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-muted, #9ca3af)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  X / O Piece Skins
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: activeColor,
                    fontWeight: 600,
                  }}
                >
                  Live in-game
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
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
                        padding: "8px",
                        borderRadius: "10px",
                        border: isSelected
                          ? `1.5px solid ${activeColor}`
                          : "1px solid var(--border-color, #1a1a1a)",
                        backgroundColor: isSelected
                          ? `${activeColor}18`
                          : "var(--bg-card-hover, rgba(20, 20, 20, 0.6))",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Visual Preview */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          height: "30px",
                          width: "100%",
                        }}
                      >
                        <div style={{ width: "22px", height: "22px" }}>
                          <GameSkinIcon
                            symbol="X"
                            skin={s.id}
                            size={20}
                            animate={false}
                          />
                        </div>
                        <span style={{ color: "var(--text-muted, #666)", fontSize: "11px" }}>vs</span>
                        <div style={{ width: "22px", height: "22px" }}>
                          <GameSkinIcon
                            symbol="O"
                            skin={s.id}
                            size={20}
                            animate={false}
                          />
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: isSelected
                            ? activeColor
                            : "var(--text-primary, #ffffff)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

