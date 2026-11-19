"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonButton } from "@/components/ui/NeonButton";
import { ChatMessage, AllowedReaction, ALLOWED_REACTIONS } from "@/types/game";
import { Send, MessageSquare, Circle, MessageSquareText, Smile, Eye, EyeOff } from "lucide-react";

interface ChatBoxProps {
  messages: ChatMessage[];
  newMessage: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  currentUserId?: string;
  partnerName?: string;
  isPartnerOnline?: boolean;
  isPartnerTyping?: boolean;
  onSendReaction?: (reaction: AllowedReaction) => void;
  showReactionsInChat?: boolean;
  onToggleShowReactionsInChat?: (enabled: boolean) => void;
  isMobile?: boolean;
  isSpectator?: boolean;
  spectatorCount?: number;
  playerCount?: number;
  hideSpectatorReactions?: boolean;
  onToggleHideSpectatorReactions?: (hide: boolean) => void;
}

export function ChatBox({
  messages,
  newMessage,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  disabled = false,
  currentUserId,
  partnerName = "Opponent",
  isPartnerOnline = true,
  isPartnerTyping = false,
  onSendReaction,
  showReactionsInChat = false,
  onToggleShowReactionsInChat,
  isMobile = false,
  isSpectator = false,
  spectatorCount = 0,
  playerCount = 2,
  hideSpectatorReactions = false,
  onToggleHideSpectatorReactions,
}: ChatBoxProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isReactionsOpen, setIsReactionsOpen] = useState(!isMobile);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const [hideSpectatorMessages, setHideSpectatorMessages] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ttt_hide_spectator_messages");
      if (saved !== null) {
        setHideSpectatorMessages(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleHideSpectator = () => {
    setHideSpectatorMessages((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ttt_hide_spectator_messages", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keep desktop open by default, mobile collapsed by default
  useEffect(() => {
    setIsReactionsOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1-second cooldown ticker
  useEffect(() => {
    if (cooldownTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setCooldownTimeLeft((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [cooldownTimeLeft]);

  const handleReactionClick = (emoji: AllowedReaction) => {
    if (disabled || cooldownTimeLeft > 0) return;
    setCooldownTimeLeft(isSpectator ? 1500 : 1000);
    onSendReaction?.(emoji);
  };

  const isCoolingDown = cooldownTimeLeft > 0;
  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <NeonCard
      variant="default"
      style={{
        width: "100%",
        height: isMobile ? "370px" : "390px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-card, rgba(13,13,13,0.92))",
        border: "1px solid var(--border-color, rgba(0,255,255,0.18))",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 0 16px var(--border-color-glow, rgba(0,255,255,0.08))",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "10px",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(0,255,255,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MessageSquare style={{ width: "15px", height: "15px", color: "var(--accent-x, #00FFFF)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary, #ffffff)", margin: 0 }}>
              Live Chat
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: isPartnerTyping ? "#FFD700" : isSpectator ? "var(--accent-x, #00FFFF)" : isPartnerOnline ? "#00FF41" : "#FF3131",
                fontSize: "11px",
              }}
            >
              <Circle style={{ width: "7px", height: "7px", fill: "currentColor", color: "currentColor" }} />
              <span>
                {isPartnerTyping
                  ? `${partnerName} is typing...`
                  : isSpectator
                  ? `${playerCount || 2} players • ${spectatorCount ?? 0} watching`
                  : isPartnerOnline
                  ? `${partnerName} online`
                  : `${partnerName} offline`}
              </span>
            </div>
          </div>
        </div>

        {/* Header Right: Hide Spectator Messages Toggle + Chat Log Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <motion.button
            type="button"
            onClick={handleToggleHideSpectator}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            style={{
              background: hideSpectatorMessages ? "rgba(255, 49, 49, 0.15)" : "transparent",
              border: `1px solid ${
                hideSpectatorMessages ? "#FF3131" : "var(--border-color, rgba(255,255,255,0.12))"
              }`,
              borderRadius: "8px",
              padding: "6px 8px",
              color: hideSpectatorMessages ? "#FF3131" : "var(--text-muted, #6b7280)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: hideSpectatorMessages ? "0 0 10px rgba(255, 49, 49, 0.25)" : "none",
              transition: "all 0.2s ease",
            }}
            title={
              hideSpectatorMessages
                ? "Spectator messages: Hidden (click to show)"
                : "Spectator messages: Visible (click to hide)"
            }
            aria-label="Toggle spectator messages"
          >
            {hideSpectatorMessages ? (
              <EyeOff style={{ width: "15px", height: "15px" }} />
            ) : (
              <Eye style={{ width: "15px", height: "15px" }} />
            )}
          </motion.button>

          {onToggleHideSpectatorReactions && (
            <motion.button
              type="button"
              onClick={() => onToggleHideSpectatorReactions(!hideSpectatorReactions)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              style={{
                background: hideSpectatorReactions ? "rgba(255, 49, 49, 0.15)" : "transparent",
                border: `1px solid ${
                  hideSpectatorReactions ? "#FF3131" : "var(--border-color, rgba(255,255,255,0.12))"
                }`,
                borderRadius: "8px",
                padding: "6px 8px",
                color: hideSpectatorReactions ? "#FF3131" : "var(--text-muted, #6b7280)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: hideSpectatorReactions ? "0 0 10px rgba(255, 49, 49, 0.25)" : "none",
                transition: "all 0.2s ease",
              }}
              title={
                hideSpectatorReactions
                  ? "Spectator reactions: Hidden (click to show)"
                  : "Spectator reactions: Visible (click to hide)"
              }
              aria-label="Toggle spectator reactions"
            >
              <Smile style={{ width: "15px", height: "15px" }} />
              {hideSpectatorReactions && (
                <span
                  style={{
                    position: "absolute",
                    top: "1px",
                    right: "3px",
                    fontSize: "8px",
                    color: "#FF3131",
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </span>
              )}
            </motion.button>
          )}

          {onToggleShowReactionsInChat && (
            <motion.button
              type="button"
              onClick={() => onToggleShowReactionsInChat(!showReactionsInChat)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              style={{
                background: showReactionsInChat ? "rgba(0, 255, 255, 0.15)" : "transparent",
                border: `1px solid ${
                  showReactionsInChat ? "var(--accent-x, #00FFFF)" : "var(--border-color, rgba(255,255,255,0.12))"
                }`,
                borderRadius: "8px",
                padding: "6px 8px",
                color: showReactionsInChat ? "var(--accent-x, #00FFFF)" : "var(--text-muted, #6b7280)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: showReactionsInChat ? "0 0 10px rgba(0, 255, 255, 0.25)" : "none",
                transition: "all 0.2s ease",
              }}
              title={
                showReactionsInChat
                  ? "Reaction chat log: ON (click to hide from chat)"
                  : "Reaction chat log: OFF (click to show in chat)"
              }
              aria-label="Toggle reaction log in chat"
            >
              <MessageSquareText style={{ width: "15px", height: "15px" }} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Messages List - strictly flexes to available height without card growth */}
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
          marginBottom: "8px",
          paddingRight: "6px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {(() => {
          const displayedMessages = hideSpectatorMessages
            ? messages.filter((msg) => msg.role !== "spectator")
            : messages;

          if (displayedMessages.length === 0) {
            return (
              <motion.div
                style={{ textAlign: "center", padding: "28px 0" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <MessageSquare style={{ width: "40px", height: "40px", color: "var(--text-muted, #4b5563)", margin: "0 auto 10px" }} />
                <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: "13px", margin: 0 }}>
                  {hideSpectatorMessages && messages.length > 0
                    ? "Spectator messages are hidden."
                    : "No messages yet. Say hello!"}
                </p>
              </motion.div>
            );
          }

          return (
            <AnimatePresence mode="popLayout">
              {displayedMessages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const isSpectatorMsg = msg.role === "spectator";

                return (
                  <motion.div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      maxWidth: "85%",
                      marginBottom: "8px",
                      alignSelf: msg.isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                      alignItems: msg.isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                    }}
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  >
                    {msg.isSystem ? (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted, #9ca3af)",
                          fontStyle: "italic",
                          padding: "3px 10px",
                          backgroundColor: "var(--bg-card-hover, rgba(20,20,20,0.85))",
                          borderRadius: "9999px",
                          border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textAlign: "center",
                        }}
                      >
                        {msg.message}
                      </span>
                    ) : (
                      <>
                        <motion.div
                          initial={{ opacity: 0, x: isMine ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "12px",
                            fontSize: "13px",
                            fontWeight: 500,
                            backgroundColor: isSpectatorMsg
                              ? isMine
                                ? "rgba(255, 255, 255, 0.08)"
                                : "rgba(255, 255, 255, 0.04)"
                              : isMine
                              ? "rgba(0,255,255,0.16)"
                              : "rgba(255,0,255,0.14)",
                            color: isSpectatorMsg
                              ? isMine
                                ? "var(--text-primary, #ffffff)"
                                : "var(--text-main, #d1d5db)"
                              : isMine
                              ? "var(--accent-x, #00FFFF)"
                              : "var(--accent-o, #FF00FF)",
                            border: isSpectatorMsg
                              ? isMine
                                ? "1px solid rgba(255, 255, 255, 0.22)"
                                : "1px solid rgba(255, 255, 255, 0.1)"
                              : isMine
                              ? "1px solid rgba(0,255,255,0.25)"
                              : "1px solid rgba(255,0,255,0.25)",
                            boxShadow: isSpectatorMsg
                              ? "0 2px 8px rgba(0,0,0,0.25)"
                              : isMine
                              ? "0 0 14px rgba(0,255,255,0.08)"
                              : "0 0 14px rgba(255,0,255,0.08)",
                            wordBreak: "break-word",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <span style={{ fontSize: "10px", opacity: 0.75, fontWeight: 600 }}>
                              {isMine ? "You" : msg.senderName}
                            </span>
                            {isSpectatorMsg && (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                                  color: "var(--text-muted, #9ca3af)",
                                  border: "1px solid rgba(255, 255, 255, 0.14)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  letterSpacing: "0.2px",
                                }}
                              >
                                👁 Spectator
                              </span>
                            )}
                          </div>
                          {msg.message}
                        </motion.div>
                        <span style={{ fontSize: "10px", color: "var(--text-muted, #6b7280)", marginTop: "2px", paddingLeft: "6px" }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          );
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Reaction Bar Row (between messages list and input box) */}
      <AnimatePresence initial={false}>
        {isReactionsOpen && onSendReaction && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: "auto", opacity: 1, marginBottom: 8 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "5px",
                padding: "4px 6px",
                backgroundColor: "var(--bg-card-hover, rgba(255, 255, 255, 0.03))",
                borderRadius: "12px",
                border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                overflowX: "auto",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {ALLOWED_REACTIONS.map((emoji) => {
                const isGG = emoji === "GG";

                return (
                  <motion.button
                    key={emoji}
                    type="button"
                    onClick={() => handleReactionClick(emoji)}
                    disabled={disabled || isCoolingDown}
                    whileHover={!disabled && !isCoolingDown ? { scale: 1.2 } : {}}
                    whileTap={!disabled && !isCoolingDown ? { scale: 0.88 } : {}}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isGG
                        ? "rgba(255, 215, 0, 0.15)"
                        : "var(--bg-card, rgba(0, 0, 0, 0.25))",
                      border: isGG
                        ? "1.5px solid #FFD700"
                        : "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                      cursor: disabled || isCoolingDown ? "not-allowed" : "pointer",
                      opacity: disabled || isCoolingDown ? 0.4 : 1,
                      fontSize: isGG ? "11px" : "16px",
                      fontWeight: isGG ? 800 : "normal",
                      color: isGG ? "#FFD700" : undefined,
                      fontFamily: isGG ? "monospace" : undefined,
                      boxShadow: isGG ? "0 0 8px rgba(255, 215, 0, 0.3)" : "none",
                      flexShrink: 0,
                      userSelect: "none",
                      padding: 0,
                      transition: "border-color 0.15s, background-color 0.15s, opacity 0.15s",
                    }}
                    title={isCoolingDown ? "Please wait..." : isGG ? "Good Game!" : emoji}
                    aria-label={`Reaction ${emoji}`}
                  >
                    {emoji}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Row: Smiley toggle + Text Input + Send button */}
      <motion.div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          paddingTop: "2px",
          flexShrink: 0,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {onSendReaction && (
          <motion.button
            type="button"
            onClick={() => setIsReactionsOpen((prev) => !prev)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              border: `1.5px solid ${
                isReactionsOpen ? "var(--accent-x, #00FFFF)" : "var(--border-color, rgba(255, 255, 255, 0.15))"
              }`,
              backgroundColor: isReactionsOpen
                ? "rgba(0, 255, 255, 0.14)"
                : "var(--bg-card, rgba(13,13,13,0.8))",
              color: isReactionsOpen ? "var(--accent-x, #00FFFF)" : "var(--text-muted, #9ca3af)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: isReactionsOpen ? "0 0 10px rgba(0, 255, 255, 0.25)" : "none",
              transition: "all 0.2s ease",
            }}
            title={isReactionsOpen ? "Hide reactions bar" : "Show reactions bar"}
            aria-label="Toggle reactions bar"
          >
            <Smile style={{ width: "19px", height: "19px" }} />
          </motion.button>
        )}

        <NeonInput
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={onKeyPress}
          variant="cyan"
          disabled={disabled}
          maxLength={isSpectator ? 200 : undefined}
          style={{ flex: 1 }}
        />

        <NeonButton
          variant="cyan"
          size="md"
          onClick={onSendMessage}
          disabled={disabled || !newMessage.trim()}
          style={{ padding: "10px 16px", minHeight: "40px", flexShrink: 0 }}
        >
          <Send style={{ width: "18px", height: "18px" }} />
        </NeonButton>
      </motion.div>
    </NeonCard>
  );
}
