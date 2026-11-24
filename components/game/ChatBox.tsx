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

function ChatBoxComponent({
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
      variant="glass"
      className="chat-box-card"
      style={{
        width: "100%",
        height: isMobile ? "370px" : "420px",
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "14px" : "16px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MessageSquare style={{ width: "16px", height: "16px", color: "#ffffff" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#ffffff",
                fontFamily: "var(--font-display, inherit)",
                margin: 0,
                letterSpacing: "0.2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Chat
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: isPartnerTyping ? "#FFD700" : isSpectator ? "#38bdf8" : isPartnerOnline ? "#22c55e" : "#ef4444",
                fontSize: "11px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <Circle style={{ width: "7px", height: "7px", fill: "currentColor", color: "currentColor", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
          <motion.button
            type="button"
            onClick={handleToggleHideSpectator}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            style={{
              background: hideSpectatorMessages ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${
                hideSpectatorMessages ? "#ef4444" : "rgba(255,255,255,0.12)"
              }`,
              borderRadius: "10px",
              padding: "6px 8px",
              color: hideSpectatorMessages ? "#ef4444" : "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                background: hideSpectatorReactions ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${
                  hideSpectatorReactions ? "#ef4444" : "rgba(255,255,255,0.12)"
                }`,
                borderRadius: "10px",
                padding: "6px 8px",
                color: hideSpectatorReactions ? "#ef4444" : "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
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
                    top: "2px",
                    right: "3px",
                    fontSize: "8px",
                    color: "#ef4444",
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
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                background: showReactionsInChat ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${
                  showReactionsInChat ? "#3b82f6" : "rgba(255,255,255,0.12)"
                }`,
                borderRadius: "10px",
                padding: "6px 8px",
                color: showReactionsInChat ? "#38bdf8" : "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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

      {/* Messages List */}
      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
          marginBottom: "10px",
          paddingRight: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
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
                <MessageSquare style={{ width: "36px", height: "36px", color: "rgba(255,255,255,0.2)", margin: "0 auto 8px" }} />
                <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: "13px", margin: 0 }}>
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
                      alignSelf: msg.isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                      alignItems: msg.isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                    }}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    {msg.isSystem ? (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted, #94a3b8)",
                          fontStyle: "italic",
                          padding: "3px 12px",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderRadius: "9999px",
                          border: "1px solid rgba(255,255,255,0.08)",
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
                          initial={{ opacity: 0, x: isMine ? 8 : -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            padding: "9px 13px",
                            borderRadius: "16px",
                            borderBottomRightRadius: isMine ? "4px" : "16px",
                            borderBottomLeftRadius: !isMine ? "4px" : "16px",
                            fontSize: "13px",
                            lineHeight: "1.4",
                            fontWeight: 500,
                            backgroundColor: isMine
                              ? "#2563eb"
                              : isSpectatorMsg
                              ? "rgba(255, 255, 255, 0.08)"
                              : "#1e293b",
                            color: "#ffffff",
                            border: isMine
                              ? "1px solid rgba(255,255,255,0.15)"
                              : "1px solid rgba(255, 255, 255, 0.1)",
                            boxShadow: isMine
                              ? "0 3px 12px rgba(37,99,235,0.35)"
                              : "0 2px 8px rgba(0,0,0,0.25)",
                            wordBreak: "break-word",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "11px", opacity: isMine ? 0.85 : 0.75, fontWeight: 700 }}>
                              {isMine ? "You" : msg.senderName}
                            </span>
                            {isSpectatorMsg && (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                                  color: "#94a3b8",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                👁 Spectator
                              </span>
                            )}
                          </div>
                          {msg.message}
                        </motion.div>
                        <span style={{ fontSize: "10px", color: "var(--text-muted, #94a3b8)", marginTop: "2px", paddingLeft: "4px", paddingRight: "4px" }}>
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
                justifyContent: "flex-start",
                gap: "6px",
                padding: "6px 8px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
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
                    whileHover={!disabled && !isCoolingDown ? { scale: 1.18, y: -2 } : {}}
                    whileTap={!disabled && !isCoolingDown ? { scale: 0.9 } : {}}
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isGG
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                        : "rgba(255, 255, 255, 0.08)",
                      border: isGG
                        ? "2px solid #fef3c7"
                        : "1px solid rgba(255, 255, 255, 0.12)",
                      cursor: disabled || isCoolingDown ? "not-allowed" : "pointer",
                      opacity: disabled || isCoolingDown ? 0.4 : 1,
                      fontSize: isGG ? "11px" : "17px",
                      fontWeight: isGG ? 900 : "normal",
                      color: isGG ? "#ffffff" : undefined,
                      fontFamily: isGG ? "var(--font-display, inherit)" : undefined,
                      boxShadow: isGG ? "0 2px 8px rgba(245, 158, 11, 0.5)" : "0 2px 5px rgba(0,0,0,0.2)",
                      flexShrink: 0,
                      userSelect: "none",
                      padding: 0,
                      transition: "transform 0.15s, opacity 0.15s",
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
          width: "100%",
          boxSizing: "border-box",
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
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: `1.5px solid ${
                isReactionsOpen ? "#3b82f6" : "rgba(255, 255, 255, 0.15)"
              }`,
              backgroundColor: isReactionsOpen
                ? "rgba(59, 130, 246, 0.2)"
                : "rgba(255, 255, 255, 0.06)",
              color: isReactionsOpen ? "#38bdf8" : "var(--text-muted, #94a3b8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: isReactionsOpen ? "0 0 10px rgba(59, 130, 246, 0.3)" : "none",
              transition: "all 0.2s ease",
            }}
            title={isReactionsOpen ? "Hide reactions bar" : "Show reactions bar"}
            aria-label="Toggle reactions bar"
          >
            <Smile style={{ width: "20px", height: "20px" }} />
          </motion.button>
        )}

        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <NeonInput
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={onKeyPress}
            variant="cyan"
            disabled={disabled}
            maxLength={isSpectator ? 200 : undefined}
            style={{ width: "100%", height: "44px", borderRadius: "22px" }}
          />
        </div>

        <motion.button
          type="button"
          onClick={onSendMessage}
          disabled={disabled || !newMessage.trim()}
          whileHover={!disabled && newMessage.trim() ? { scale: 1.08 } : {}}
          whileTap={!disabled && newMessage.trim() ? { scale: 0.92 } : {}}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: disabled || !newMessage.trim()
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            border: "none",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled || !newMessage.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
            boxShadow: disabled || !newMessage.trim() ? "none" : "0 4px 12px rgba(37,99,235,0.4)",
            transition: "all 0.2s ease",
          }}
          aria-label="Send message"
        >
          <Send style={{ width: "18px", height: "18px", transform: "translateX(1px)" }} />
        </motion.button>
      </motion.div>
    </NeonCard>
  );
}

export const ChatBox = React.memo(ChatBoxComponent);
