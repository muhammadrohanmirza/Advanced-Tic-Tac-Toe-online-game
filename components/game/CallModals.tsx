"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, PhoneOff, Mic, Video, Users, Check, X } from "lucide-react";

interface CallModalsProps {
  incomingCall: {
    callerId: string;
    callerName: string;
    withVideo: boolean;
  } | null;
  incomingJoinRequest: {
    requesterId: string;
    requesterName: string;
    withVideo: boolean;
  } | null;
  onRespondCall: (accept: boolean) => void;
  onRespondJoinRequest: (requesterId: string, accept: boolean) => void;
}

export function CallModals({
  incomingCall,
  incomingJoinRequest,
  onRespondCall,
  onRespondJoinRequest,
}: CallModalsProps) {
  return (
    <>
      {/* 1. Incoming Player Call Modal */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              zIndex: 9999,
              width: "320px",
              backgroundColor: "var(--bg-card, rgba(13,13,13,0.96))",
              border: "2px solid var(--accent-x, #00FFFF)",
              boxShadow: "0 0 25px rgba(0, 255, 255, 0.4)",
              borderRadius: "16px",
              padding: "16px",
              backdropFilter: "blur(12px)",
              color: "var(--text-primary, #fff)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 255, 255, 0.15)",
                  border: "2px solid #00FFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00FFFF",
                }}
              >
                {incomingCall.withVideo ? <Video size={20} /> : <PhoneCall size={20} />}
              </motion.div>

              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                  Incoming {incomingCall.withVideo ? "Video" : "Voice"} Call
                </h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted, #9ca3af)" }}>
                  <strong style={{ color: "#00FFFF" }}>{incomingCall.callerName}</strong> is calling you...
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => onRespondCall(true)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(0, 255, 65, 0.15)",
                  border: "1px solid #00FF41",
                  color: "#00FF41",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 0 10px rgba(0, 255, 65, 0.2)",
                }}
              >
                <Check size={14} />
                <span>Accept</span>
              </button>

              <button
                type="button"
                onClick={() => onRespondCall(false)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 49, 49, 0.15)",
                  border: "1px solid #FF3131",
                  color: "#FF3131",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <PhoneOff size={14} />
                <span>Decline</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Spectator Join Request Modal (Ask mode) */}
      <AnimatePresence>
        {incomingJoinRequest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed",
              bottom: "24px",
              left: "24px",
              zIndex: 9999,
              width: "320px",
              backgroundColor: "var(--bg-card, rgba(13,13,13,0.96))",
              border: "2px solid var(--accent-o, #FF00FF)",
              boxShadow: "0 0 25px rgba(255, 0, 255, 0.4)",
              borderRadius: "16px",
              padding: "16px",
              backdropFilter: "blur(12px)",
              color: "var(--text-primary, #fff)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 0, 255, 0.15)",
                  border: "2px solid #FF00FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FF00FF",
                  flexShrink: 0,
                }}
              >
                <Users size={20} />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                  Spectator Call Request
                </h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted, #9ca3af)" }}>
                  <strong style={{ color: "#FF00FF" }}>{incomingJoinRequest.requesterName}</strong> wants to join the call
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => onRespondJoinRequest(incomingJoinRequest.requesterId, true)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(0, 255, 65, 0.15)",
                  border: "1px solid #00FF41",
                  color: "#00FF41",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Check size={14} />
                <span>Allow</span>
              </button>

              <button
                type="button"
                onClick={() => onRespondJoinRequest(incomingJoinRequest.requesterId, false)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 49, 49, 0.15)",
                  border: "1px solid #FF3131",
                  color: "#FF3131",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <X size={14} />
                <span>Deny</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
