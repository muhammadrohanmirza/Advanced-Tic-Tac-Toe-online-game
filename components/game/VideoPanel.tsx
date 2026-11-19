"use client";

import React, { useRef, useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  Eye,
  EyeOff,
  MoreVertical,
  UserX,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CallParticipant } from "@/types/game";
import { PeerDiagnosticInfo } from "@/hooks/useWebRTC";

interface VideoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  myUserId: string;
  isPlayer: boolean;
  participants: CallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerDiagnostics?: Map<string, PeerDiagnosticInfo>;
  speakingUsers: Set<string>;
  mutedForMe: Set<string>;
  hiddenVideoForMe: Set<string>;
  isDeafened: boolean;
  onToggleMuteForMe: (userId: string) => void;
  onToggleHideVideoForMe: (userId: string) => void;
  onModerateParticipant: (targetUserId: string, action: "mute" | "unmute" | "remove") => void;
  onAudioBlocked?: () => void;
  isMobile: boolean;
}

export function VideoPanel({
  isOpen,
  onClose,
  myUserId,
  isPlayer,
  participants,
  localStream,
  remoteStreams,
  peerDiagnostics,
  speakingUsers,
  mutedForMe,
  hiddenVideoForMe,
  isDeafened,
  onToggleMuteForMe,
  onToggleHideVideoForMe,
  onModerateParticipant,
  onAudioBlocked,
  isMobile,
}: VideoPanelProps) {
  if (!isOpen || participants.length === 0) return null;

  // Sort participants: players first, then spectators, then by joinedAt
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.role === "player" && b.role !== "player") return -1;
    if (a.role !== "player" && b.role === "player") return 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={isMobile ? { y: 200, opacity: 0 } : { opacity: 0, scale: 0.95 }}
        animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={isMobile ? { y: 200, opacity: 0 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : "520px",
          margin: "0 auto 16px auto",
          backgroundColor: "var(--bg-card, rgba(13,13,13,0.92))",
          border: "1px solid var(--border-color, #222)",
          borderRadius: "16px",
          padding: isMobile ? "10px" : "14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
            paddingBottom: "6px",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.06))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
              Call Participants ({participants.length}/6)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Hide panel"
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
            <X size={16} />
          </button>
        </div>

        {/* Video / Tile Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              participants.length === 1
                ? "1fr"
                : participants.length === 2
                ? isMobile ? "1fr" : "1fr 1fr"
                : "repeat(auto-fit, minmax(140px, 1fr))",
            gap: isMobile ? "8px" : "10px",
            maxHeight: isMobile ? "240px" : "360px",
            overflowY: "auto",
          }}
        >
          {sortedParticipants.map((p) => {
            const isLocal = p.userId === myUserId;
            const stream = isLocal ? localStream : remoteStreams.get(p.userId);
            const isSpeaking = speakingUsers.has(p.userId);
            const isMutedForMe = mutedForMe.has(p.userId);
            const isVideoHidden = hiddenVideoForMe.has(p.userId);
            const diag = !isLocal && peerDiagnostics ? peerDiagnostics.get(p.userId) : undefined;

            return (
              <ParticipantTile
                key={p.userId}
                participant={p}
                isLocal={isLocal}
                isViewerPlayer={isPlayer}
                stream={stream || null}
                diag={diag}
                isSpeaking={isSpeaking}
                isMutedForMe={isMutedForMe}
                isVideoHidden={isVideoHidden}
                isDeafened={isDeafened}
                onToggleMuteForMe={() => onToggleMuteForMe(p.userId)}
                onToggleHideVideoForMe={() => onToggleHideVideoForMe(p.userId)}
                onModerate={(action) => onModerateParticipant(p.userId, action)}
                onAudioBlocked={onAudioBlocked}
                isMobile={isMobile}
              />
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface TileProps {
  participant: CallParticipant;
  isLocal: boolean;
  isViewerPlayer: boolean;
  stream: MediaStream | null;
  diag?: PeerDiagnosticInfo;
  isSpeaking: boolean;
  isMutedForMe: boolean;
  isVideoHidden: boolean;
  isDeafened: boolean;
  onToggleMuteForMe: () => void;
  onToggleHideVideoForMe: () => void;
  onModerate: (action: "mute" | "unmute" | "remove") => void;
  onAudioBlocked?: () => void;
  isMobile: boolean;
}

const ParticipantTile = memo(function ParticipantTile({
  participant,
  isLocal,
  isViewerPlayer,
  stream,
  diag,
  isSpeaking,
  isMutedForMe,
  isVideoHidden,
  isDeafened,
  onToggleMuteForMe,
  onToggleHideVideoForMe,
  onModerate,
  onAudioBlocked,
  isMobile,
}: TileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Check if live video track is currently present and active (not muted/ended)
  const liveVideoTrack = stream
    ?.getVideoTracks()
    .find((t) => t.readyState === "live" && !t.muted);
  const hasLiveVideo = Boolean(
    liveVideoTrack &&
    (isLocal ? participant.cameraOn : true) &&
    !isVideoHidden
  );

  // Attach media stream to video element when stream or tracks change
  useEffect(() => {
    if (videoRef.current) {
      if (stream && hasLiveVideo) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[WebRTC:Video] Play error:", err);
          }
        });
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, hasLiveVideo]);

  // Attach media stream to audio element for remote participants when video is not active
  useEffect(() => {
    if (!isLocal && audioRef.current && stream) {
      if (!hasLiveVideo) {
        if (audioRef.current.srcObject !== stream) {
          audioRef.current.srcObject = stream;
        }
        audioRef.current.muted = isDeafened || isMutedForMe;
        audioRef.current.volume = 1;
        audioRef.current.play().catch((err) => {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[WebRTC:Audio] Audio play blocked for ${participant.userId}:`, err);
          }
          onAudioBlocked?.();
        });
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [isLocal, stream, hasLiveVideo, isDeafened, isMutedForMe, participant.userId, onAudioBlocked]);

  const isSpectator = participant.role === "spectator";

  const audioTrackCount = stream ? stream.getAudioTracks().length : 0;
  const videoTrackCount = stream ? stream.getVideoTracks().length : 0;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        border: `2px solid ${
          isSpeaking
            ? "#00FF41"
            : participant.role === "player"
            ? "var(--accent-x, #00FFFF)"
            : "var(--border-color, #333)"
        }`,
        boxShadow: isSpeaking ? "0 0 16px rgba(0, 255, 65, 0.45)" : "none",
        aspectRatio: isMobile ? "16 / 10" : "4 / 3",
        minHeight: "110px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Dedicated Audio Element for remote participants when video tile is off/hidden */}
      {!isLocal && stream && !hasLiveVideo && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />
      )}

      {/* Video Element: Local tile muted, remote tiles unmuted (unless deafened/mutedForMe) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal ? true : (isDeafened || isMutedForMe)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: hasLiveVideo ? "block" : "none",
          transform: isLocal ? "scaleX(-1)" : "none",
        }}
      />

      {/* Avatar Placeholder when live video is off */}
      {!hasLiveVideo && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: isSpectator ? "rgba(255, 0, 255, 0.15)" : "rgba(0, 255, 255, 0.15)",
              border: `2px solid ${isSpectator ? "var(--accent-o, #FF00FF)" : "var(--accent-x, #00FFFF)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSpectator ? "var(--accent-o, #FF00FF)" : "var(--accent-x, #00FFFF)",
              fontSize: "18px",
              fontWeight: 700,
              boxShadow: isSpeaking ? "0 0 12px rgba(0,255,65,0.4)" : "none",
            }}
          >
            {participant.name ? participant.name.charAt(0).toUpperCase() : "U"}
          </div>
        </div>
      )}

      {/* Top Overlay Badges */}
      <div
        style={{
          position: "absolute",
          top: "6px",
          left: "6px",
          right: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {/* Role badge */}
        {isSpectator ? (
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 0, 255, 0.25)",
              border: "1px solid rgba(255, 0, 255, 0.5)",
              color: "#FF66FF",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            👁 Spectator
          </span>
        ) : (
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(0, 255, 255, 0.2)",
              border: "1px solid rgba(0, 255, 255, 0.5)",
              color: "#00FFFF",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            ⚔️ Player
          </span>
        )}

        {/* Remote Tile Menu Trigger (only for remote participants) */}
        {!isLocal && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="Participant options"
              style={{
                background: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
                padding: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MoreVertical size={13} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "4px",
                  backgroundColor: "var(--bg-card, #0f0f0f)",
                  border: "1px solid var(--border-color, #333)",
                  borderRadius: "8px",
                  padding: "4px",
                  zIndex: 20,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
                  minWidth: "140px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {/* Local Mute */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleMuteForMe();
                    setShowMenu(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color: isMutedForMe ? "#00FF41" : "#fff",
                    padding: "5px 8px",
                    textAlign: "left",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isMutedForMe ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  <span>{isMutedForMe ? "Unmute for me" : "Mute for me"}</span>
                </button>

                {/* Local Hide Video */}
                {participant.cameraOn && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleHideVideoForMe();
                      setShowMenu(false);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderRadius: "4px",
                      color: isVideoHidden ? "#00FF41" : "#fff",
                      padding: "5px 8px",
                      textAlign: "left",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isVideoHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{isVideoHidden ? "Show video" : "Hide video"}</span>
                  </button>
                )}

                {/* Moderator Controls (Player -> Spectator) */}
                {isViewerPlayer && isSpectator && (
                  <>
                    <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.08)", margin: "2px 0" }} />
                    <button
                      type="button"
                      onClick={() => {
                        onModerate(participant.mutedByModerator ? "unmute" : "mute");
                        setShowMenu(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: participant.mutedByModerator ? "#00FF41" : "#FFD700",
                        padding: "5px 8px",
                        textAlign: "left",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <MicOff size={12} />
                      <span>{participant.mutedByModerator ? "Unmute mic" : "Mute mic"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onModerate("remove");
                        setShowMenu(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: "#FF3131",
                        padding: "5px 8px",
                        textAlign: "left",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <UserX size={12} />
                      <span>Remove from call</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call Diagnostics Banner in Development */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            left: "6px",
            right: "6px",
            padding: "2px 6px",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            borderRadius: "4px",
            fontSize: "9px",
            fontFamily: "monospace",
            color: "#00FF41",
            zIndex: 15,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            border: "1px solid rgba(0, 255, 65, 0.2)",
          }}
        >
          {isLocal ? (
            <span>
              Local | Tracks A:{audioTrackCount} V:{videoTrackCount}
            </span>
          ) : (
            <span>
              Conn:{diag?.connectionState || "new"} | ICE:{diag?.iceConnectionState || "new"} | A:
              {audioTrackCount} V:{videoTrackCount}
            </span>
          )}
        </div>
      )}

      {/* Bottom Name & Mic State Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "4px 8px",
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "70%",
          }}
        >
          {participant.name} {isLocal && "(You)"}
        </span>

        {/* Mic & Volume Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {isMutedForMe && (
            <span title="Muted for you only" style={{ color: "#FF3131" }}>
              <VolumeX size={12} />
            </span>
          )}
          {!participant.micOn ? (
            <span
              title={participant.mutedByModerator ? "Muted by a player" : "Muted"}
              style={{ color: "#FF3131" }}
            >
              <MicOff size={12} />
            </span>
          ) : (
            <span
              style={{
                color: isSpeaking ? "#00FF41" : "var(--text-muted, #777)",
              }}
            >
              <Mic size={12} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
