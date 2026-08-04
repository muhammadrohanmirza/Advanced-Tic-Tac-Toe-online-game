"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NeonCard } from "@/components/ui/NeonCard";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonButton } from "@/components/ui/NeonButton";
import { ChatMessage } from "@/types/game";
import { Send, MessageSquare, Circle } from "lucide-react";

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
}

export function ChatBox({ messages, newMessage, onMessageChange, onSendMessage, onKeyPress, disabled = false, currentUserId, partnerName = "Opponent", isPartnerOnline = true, isPartnerTyping = false }: ChatBoxProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <NeonCard variant="default" style={{ width: "100%", height: "340px", display: "flex", flexDirection: "column", background: "linear-gradient(145deg, rgba(10,10,10,0.95), rgba(20,20,20,0.95))", border: "1px solid rgba(0,255,255,0.18)", boxShadow: "0 0 24px rgba(0,255,255,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(0,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare style={{ width: "16px", height: "16px", color: "#00FFFF" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#e5e7eb", margin: 0 }}>Live Chat</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: isPartnerTyping ? "#FFD700" : isPartnerOnline ? "#00FF41" : "#FF3131", fontSize: "12px" }}>
              <Circle style={{ width: "8px", height: "8px", fill: "currentColor", color: "currentColor" }} />
              <span>{isPartnerTyping ? `${partnerName} is typing...` : isPartnerOnline ? `${partnerName} online` : `${partnerName} offline`}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", marginBottom: "12px", paddingRight: "6px", display: "flex", flexDirection: "column" }}>
        {messages.length === 0 ? (
          <motion.div style={{ textAlign: "center", padding: "32px 0" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MessageSquare style={{ width: "48px", height: "48px", color: "#374151", margin: "0 auto 12px" }} />
            <p style={{ color: "#9ca3af", fontSize: "14px" }}>No messages yet. Say hello!</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;

              return (
              <motion.div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "82%",
                  marginBottom: "10px",
                  alignSelf: msg.isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                  alignItems: msg.isSystem ? "center" : isMine ? "flex-end" : "flex-start",
                }}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
              >
                {msg.isSystem ? (
                  <span style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic", padding: "4px 12px", backgroundColor: "#1a1a1a", borderRadius: "9999px" }}>{msg.message}</span>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: isMine ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "14px",
                        fontSize: "14px",
                        fontWeight: 500,
                        backgroundColor: isMine ? "rgba(0,255,255,0.16)" : "rgba(255,0,255,0.14)",
                        color: isMine ? "#00FFFF" : "#FF00FF",
                        border: `1px solid ${isMine ? "rgba(0,255,255,0.25)" : "rgba(255,0,255,0.25)"}`,
                        boxShadow: isMine ? "0 0 16px rgba(0,255,255,0.08)" : "0 0 16px rgba(255,0,255,0.08)",
                        wordBreak: "break-word",
                      }}
                    >
                      <span style={{ fontSize: "11px", opacity: 0.7, marginRight: "8px" }}>{isMine ? "You" : msg.senderName}</span>
                      {msg.message}
                    </motion.div>
                    <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", paddingLeft: "8px" }}>{formatTime(msg.timestamp)}</span>
                  </>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <motion.div style={{ display: "flex", gap: "8px", paddingTop: "4px" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <NeonInput
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={onKeyPress}
          variant="cyan"
          disabled={disabled}
          style={{ flex: 1 }}
        />
        <NeonButton variant="cyan" size="md" onClick={onSendMessage} disabled={disabled || !newMessage.trim()} style={{ padding: "12px 16px" }}>
          <Send style={{ width: "20px", height: "20px" }} />
        </NeonButton>
      </motion.div>
    </NeonCard>
  );
}
