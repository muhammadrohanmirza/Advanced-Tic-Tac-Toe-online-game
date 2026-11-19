"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Settings,
  ChevronDown,
  Maximize2,
  Minimize2,
  Radio,
} from "lucide-react";
import { CallState, SpectatorCallPermission } from "@/types/game";

interface CallBarProps {
  isPlayer: boolean;
  isHost: boolean;
  isInCall: boolean;
  isRinging?: boolean;
  myUserId?: string;
  callState: CallState;
  micOn: boolean;
  cameraOn: boolean;
  isDeafened: boolean;
  mutedByModerator: boolean;
  isPendingJoin: boolean;
  audioBlocked: boolean;
  onStartCall: (withVideo: boolean) => void;
  onJoinCall: (withVideo: boolean) => void;
  onLeaveCall: () => void;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleDeafen: () => void;
  onChangeCallSetting: (setting: SpectatorCallPermission) => void;
  onResumeAudio: () => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  isMobile: boolean;
}

export function CallBar({
  isPlayer,
  isHost,
  isInCall,
  isRinging = false,
  myUserId = "",
  callState,
  micOn,
  cameraOn,
  isDeafened,
  mutedByModerator,
  isPendingJoin,
  audioBlocked,
  onStartCall,
  onJoinCall,
  onLeaveCall,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onToggleDeafen,
  onChangeCallSetting,
  onResumeAudio,
  isPanelOpen,
  onTogglePanel,
  isMobile,
}: CallBarProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const participantCount = callState.participants.length;
  const isSpectatorsAllowed = callState.spectatorsAllowed !== "Off";

  // Derive whether the current user is active in the call
  const isUserInCall =
    isInCall ||
    (callState.active && Boolean(myUserId) && callState.participants.some((p) => p.userId === myUserId));

  // Determine if caller is waiting for callee to answer
  const isCallerRinging = Boolean(
    isRinging ||
      (isUserInCall &&
        callState.startedBy === myUserId &&
        callState.participants.length <= 1 &&
        isPlayer)
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
        maxWidth: isMobile ? "100%" : "520px",
        margin: "0 auto 12px auto",
      }}
    >
      {/* Audio blocked notification banner */}
      {audioBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: "10px",
            backgroundColor: "rgba(255, 215, 0, 0.12)",
            border: "1px solid #FFD700",
            color: "#FFD700",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <VolumeX size={15} />
            <span>Browser paused audio playback.</span>
          </div>
          <button
            type="button"
            onClick={onResumeAudio}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              backgroundColor: "rgba(255, 215, 0, 0.2)",
              border: "1px solid #FFD700",
              color: "#FFD700",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Click to enable audio
          </button>
        </motion.div>
      )}

      {/* Main Call Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "8px 10px" : "8px 14px",
          borderRadius: "14px",
          backgroundColor: "var(--bg-card, rgba(13,13,13,0.85))",
          border: `1px solid ${
            callState.active ? "var(--accent-x, #00FFFF)" : "var(--border-color, #222)"
          }`,
          boxShadow: callState.active ? "0 0 15px rgba(0,255,255,0.2)" : "none",
          backdropFilter: "blur(8px)",
          flexWrap: "wrap",
          gap: "8px",
          position: "relative",
        }}
      >
        {/* Left: Call Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isCallerRinging ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 215, 0, 0.15)",
                border: "1px solid #FFD700",
                color: "#FFD700",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                <Radio size={12} color="#FFD700" />
              </motion.div>
              <span>Ringing opponent...</span>
            </div>
          ) : callState.active ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(0, 255, 65, 0.12)",
                border: "1px solid #00FF41",
                color: "#00FF41",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <motion.div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: "#00FF41",
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span>In call • {participantCount}</span>
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-color, #333)",
                color: "var(--text-muted, #9ca3af)",
                fontSize: "12px",
              }}
            >
              <PhoneCall size={12} />
              <span>Voice & Video</span>
            </div>
          )}

          {/* Toggle Panel button if active */}
          {callState.active && (
            <button
              type="button"
              onClick={onTogglePanel}
              title={isPanelOpen ? "Collapse video panel" : "Expand video panel"}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #9ca3af)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                borderRadius: "6px",
              }}
            >
              {isPanelOpen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>

        {/* Right: Controls based on state */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* STATE 1: Caller is Ringing Opponent */}
          {isCallerRinging ? (
            <>
              {/* Mic toggle */}
              <button
                type="button"
                onClick={onToggleMic}
                title={micOn ? "Mute Mic (M)" : "Unmute Mic (M)"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: `1px solid ${micOn ? "#00FF41" : "#FF3131"}`,
                  backgroundColor: micOn ? "rgba(0, 255, 65, 0.12)" : "rgba(255, 49, 49, 0.12)",
                  color: micOn ? "#00FF41" : "#FF3131",
                  cursor: "pointer",
                }}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              {/* Camera toggle */}
              <button
                type="button"
                onClick={onToggleCamera}
                title={cameraOn ? "Turn Camera Off (V)" : "Turn Camera On (V)"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: `1px solid ${cameraOn ? "var(--accent-x, #00FFFF)" : "var(--border-color, #444)"}`,
                  backgroundColor: cameraOn ? "rgba(0, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
                  color: cameraOn ? "var(--accent-x, #00FFFF)" : "var(--text-muted, #9ca3af)",
                  cursor: "pointer",
                }}
              >
                {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>

              {/* Cancel Call Button */}
              <motion.button
                type="button"
                onClick={onEndCall}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                title="Cancel call"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  backgroundColor: "#FF3131",
                  border: "1px solid #FF3131",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(255, 49, 49, 0.4)",
                }}
              >
                <PhoneOff size={14} />
                <span>Cancel Call</span>
              </motion.button>
            </>
          ) : isUserInCall ? (
            /* STATE 2: User is Active in Call */
            <>
              {/* Mic toggle */}
              <button
                type="button"
                onClick={onToggleMic}
                disabled={mutedByModerator}
                title={mutedByModerator ? "Muted by a player" : micOn ? "Mute Mic (M)" : "Unmute Mic (M)"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: `1px solid ${mutedByModerator ? "#FF3131" : micOn ? "#00FF41" : "#FF3131"}`,
                  backgroundColor: mutedByModerator
                    ? "rgba(255,49,49,0.15)"
                    : micOn
                    ? "rgba(0, 255, 65, 0.12)"
                    : "rgba(255, 49, 49, 0.12)",
                  color: mutedByModerator ? "#FF3131" : micOn ? "#00FF41" : "#FF3131",
                  cursor: mutedByModerator ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {micOn && !mutedByModerator ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              {/* Camera toggle */}
              <button
                type="button"
                onClick={onToggleCamera}
                title={cameraOn ? "Turn Camera Off (V)" : "Turn Camera On (V)"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: `1px solid ${cameraOn ? "var(--accent-x, #00FFFF)" : "var(--border-color, #444)"}`,
                  backgroundColor: cameraOn ? "rgba(0, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.05)",
                  color: cameraOn ? "var(--accent-x, #00FFFF)" : "var(--text-muted, #9ca3af)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>

              {/* Deafen toggle */}
              <button
                type="button"
                onClick={onToggleDeafen}
                title={isDeafened ? "Undeafen (restore remote audio)" : "Deafen (silence all remote audio)"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: `1px solid ${isDeafened ? "#FF3131" : "var(--border-color, #444)"}`,
                  backgroundColor: isDeafened ? "rgba(255, 49, 49, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: isDeafened ? "#FF3131" : "var(--text-muted, #9ca3af)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {isDeafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* Leave Call button for EVERYONE (players and spectators) */}
              <motion.button
                type="button"
                onClick={onLeaveCall}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                title="Leave call"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  backgroundColor: "#FF3131",
                  border: "1px solid #FF3131",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(255, 49, 49, 0.4)",
                }}
              >
                <PhoneOff size={14} />
                <span>Leave call</span>
              </motion.button>
            </>
          ) : (
            /* STATE 3: User is NOT in call */
            <>
              {isPlayer ? (
                <>
                  {!callState.active ? (
                    <>
                      <motion.button
                        type="button"
                        onClick={() => onStartCall(false)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "10px",
                          backgroundColor: "rgba(0, 255, 255, 0.1)",
                          border: "1px solid var(--accent-x, #00FFFF)",
                          color: "var(--accent-x, #00FFFF)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Mic size={14} />
                        <span>Start Voice</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => onStartCall(true)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "10px",
                          backgroundColor: "rgba(255, 0, 255, 0.1)",
                          border: "1px solid var(--accent-o, #FF00FF)",
                          color: "var(--accent-o, #FF00FF)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Video size={14} />
                        <span>Start Video</span>
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={() => onJoinCall(false)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(0, 255, 65, 0.12)",
                        border: "1px solid #00FF41",
                        color: "#00FF41",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <PhoneCall size={14} />
                      <span>Join Call</span>
                    </motion.button>
                  )}
                </>
              ) : (
                /* Spectator view when not in call */
                <>
                  {callState.active && isSpectatorsAllowed && (
                    <motion.button
                      type="button"
                      disabled={isPendingJoin}
                      onClick={() => onJoinCall(false)}
                      whileHover={{ scale: isPendingJoin ? 1 : 1.04 }}
                      whileTap={{ scale: isPendingJoin ? 1 : 0.96 }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(0, 255, 255, 0.1)",
                        border: "1px solid var(--accent-x, #00FFFF)",
                        color: "var(--accent-x, #00FFFF)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: isPendingJoin ? "not-allowed" : "pointer",
                        opacity: isPendingJoin ? 0.7 : 1,
                      }}
                    >
                      <PhoneCall size={14} />
                      <span>{isPendingJoin ? "Requesting..." : "Join Call"}</span>
                    </motion.button>
                  )}
                </>
              )}

              {/* Host Settings Dropdown Button */}
              {isHost && (
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowSettingsMenu((prev) => !prev)}
                    title="Spectators in call setting"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-color, #333)",
                      borderRadius: "8px",
                      color: "var(--text-muted, #9ca3af)",
                      cursor: "pointer",
                      padding: "6px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                    }}
                  >
                    <Settings size={13} />
                    <span>Spectators: {callState.spectatorsAllowed}</span>
                    <ChevronDown size={11} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showSettingsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "100%",
                          marginTop: "6px",
                          backgroundColor: "var(--bg-card, #0f0f0f)",
                          border: "1px solid var(--border-color, #333)",
                          borderRadius: "10px",
                          padding: "6px",
                          zIndex: 60,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          minWidth: "160px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <p
                          style={{
                            margin: "2px 6px 4px 6px",
                            fontSize: "10px",
                            color: "var(--text-muted, #777)",
                            textTransform: "uppercase",
                          }}
                        >
                          Spectators in call:
                        </p>
                        {(["Ask", "Allow", "Off"] as SpectatorCallPermission[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              onChangeCallSetting(mode);
                              setShowSettingsMenu(false);
                            }}
                            style={{
                              background:
                                callState.spectatorsAllowed === mode
                                  ? "rgba(0,255,255,0.12)"
                                  : "transparent",
                              border: "none",
                              borderRadius: "6px",
                              color:
                                callState.spectatorsAllowed === mode
                                  ? "var(--accent-x, #00FFFF)"
                                  : "var(--text-primary, #fff)",
                              padding: "6px 10px",
                              textAlign: "left",
                              fontSize: "12px",
                              fontWeight: callState.spectatorsAllowed === mode ? 700 : 400,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>
                              {mode === "Ask"
                                ? "Ask (Prompt players)"
                                : mode === "Allow"
                                ? "Allow (Direct join)"
                                : "Off (Disabled)"}
                            </span>
                            {callState.spectatorsAllowed === mode && <span>✓</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
