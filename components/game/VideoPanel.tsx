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

/**
 * Persistent Remote Audio elements: always mounted and playing unmuted audio
 * whenever participants are present, even if the video panel UI is closed/collapsed.
 */
export function RemoteAudioElements({
  participants,
  myUserId,
  remoteStreams,
  isDeafened,
  mutedForMe,
  onAudioBlocked,
}: {
  participants: CallParticipant[];
  myUserId: string;
  remoteStreams: Map<string, MediaStream>;
  isDeafened: boolean;
  mutedForMe: Set<string>;
  onAudioBlocked?: () => void;
}) {
  // Collect all unique remote user IDs from both participants and remoteStreams keys
  const remoteUserIds = Array.from(
    new Set([
      ...participants.filter((p) => p.userId !== myUserId).map((p) => p.userId),
      ...Array.from(remoteStreams.keys()).filter((uid) => uid !== myUserId),
    ])
  );

  return (
    <div
      style={{ position: "fixed", top: -9999, left: -9999, opacity: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {remoteUserIds.map((userId) => {
        const stream = remoteStreams.get(userId);
        const isMuted = isDeafened || mutedForMe.has(userId);
        return (
          <RemoteAudioTrack
            key={userId}
            userId={userId}
            stream={stream}
            muted={isMuted}
            onAudioBlocked={onAudioBlocked}
          />
        );
      })}
    </div>
  );
}

export function RemoteAudioTrack({
  userId,
  stream,
  muted,
  onAudioBlocked,
}: {
  userId: string;
  stream?: MediaStream;
  muted: boolean;
  onAudioBlocked?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = muted;
      el.volume = 1;
      el.play().catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[WebRTC:Audio] Audio play blocked for ${userId}:`, err);
        }
        onAudioBlocked?.();
      });

      const handleTrack = () => {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.play().catch(() => onAudioBlocked?.());
      };
      stream.addEventListener("addtrack", handleTrack);
      stream.addEventListener("removetrack", handleTrack);
      return () => {
        stream.removeEventListener("addtrack", handleTrack);
        stream.removeEventListener("removetrack", handleTrack);
      };
    } else {
      el.srcObject = null;
    }
  }, [stream, muted, userId, onAudioBlocked]);

  return <audio ref={audioRef} autoPlay playsInline muted={muted} />;
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
  if (participants.length === 0) return null;

  // Sort participants: players first, then spectators, then by joinedAt
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.role === "player" && b.role !== "player") return -1;
    if (a.role !== "player" && b.role === "player") return 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag={!isMobile}
            dragMomentum={false}
            initial={isMobile ? { y: "100%", opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%", opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              width: "100%",
              maxWidth: isMobile ? "100vw" : "520px",
              boxSizing: "border-box",
              position: isMobile ? "fixed" : "relative",
              bottom: isMobile ? 0 : undefined,
              left: isMobile ? 0 : undefined,
              right: isMobile ? 0 : undefined,
              zIndex: isMobile ? 60 : 20,
              margin: isMobile ? 0 : "0 auto 16px auto",
              backgroundColor: "rgba(15, 23, 42, 0.94)",
              border: "1.5px solid rgba(255, 255, 255, 0.12)",
              borderRadius: isMobile ? "20px 20px 0 0" : "20px",
              padding: isMobile ? "12px 14px 18px 14px" : "16px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              maxHeight: isMobile ? "45vh" : undefined,
              overflowY: isMobile ? "auto" : undefined,
            }}
          >
        {/* Mobile bottom sheet grab handle */}
        {isMobile && (
          <div
            style={{
              width: "36px",
              height: "4px",
              backgroundColor: "rgba(255,255,255,0.3)",
              borderRadius: "2px",
              margin: "0 auto 8px auto",
            }}
          />
        )}

        {/* Panel Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
            paddingBottom: "6px",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.06))",
            cursor: !isMobile ? "grab" : "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
              Call Participants ({participants.length}/6)
            </span>
            {!isMobile && (
              <span style={{ fontSize: "10px", color: "var(--text-muted, #666)", marginLeft: "4px" }}>
                (drag to move)
              </span>
            )}
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
                : "repeat(auto-fit, minmax(120px, 1fr))",
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
    )}
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
  const [showMenu, setShowMenu] = useState(false);
  const [trackVersion, setTrackVersion] = useState(0);

  // Listen to stream and track events to refresh srcObject and tile state
  useEffect(() => {
    if (!stream) return;

    const handleTrackChange = () => {
      setTrackVersion((v) => v + 1);
    };

    stream.addEventListener("addtrack", handleTrackChange);
    stream.addEventListener("removetrack", handleTrackChange);

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((t) => {
      t.addEventListener("mute", handleTrackChange);
      t.addEventListener("unmute", handleTrackChange);
      t.addEventListener("ended", handleTrackChange);
    });

    return () => {
      stream.removeEventListener("addtrack", handleTrackChange);
      stream.removeEventListener("removetrack", handleTrackChange);
      videoTracks.forEach((t) => {
        t.removeEventListener("mute", handleTrackChange);
        t.removeEventListener("unmute", handleTrackChange);
        t.removeEventListener("ended", handleTrackChange);
      });
    };
  }, [stream, trackVersion]);

  // Check if live video track is currently present and active
  const liveVideoTrack = stream
    ?.getVideoTracks()
    .find((t) => t.readyState === "live");

  // Show live video when stream has a live video track and (for local: cameraOn is true; for remote: not hidden by user)
  const hasLiveVideo = Boolean(
    liveVideoTrack &&
    (isLocal ? participant.cameraOn : true) &&
    !isVideoHidden
  );

  // Attach media stream to video element whenever stream changes, hasLiveVideo changes, or tracks update
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (stream && (liveVideoTrack || hasLiveVideo)) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[WebRTC:Video] Play error:", err);
        }
      });
    } else {
      el.srcObject = null;
    }
  }, [stream, hasLiveVideo, liveVideoTrack, trackVersion]);

  const isSpectator = participant.role === "spectator";

  const audioTrackCount = stream ? stream.getAudioTracks().length : 0;
  const videoTrackCount = stream ? stream.getVideoTracks().length : 0;
  const srcObjectVideoTrackCount = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks?.().length ?? 0;
  const videoReadyState = videoRef.current?.readyState ?? 0;
  const videoDimensions = `${videoRef.current?.videoWidth ?? 0}x${videoRef.current?.videoHeight ?? 0}`;

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
      {/* Video Element: Video track display (local mirrored) - Kept in DOM, opacity toggled */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={true}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: hasLiveVideo ? 1 : 0,
          pointerEvents: hasLiveVideo ? "auto" : "none",
          transform: isLocal ? "scaleX(-1)" : "none",
          zIndex: 1,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Avatar Placeholder when live video is off */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          opacity: hasLiveVideo ? 0 : 1,
          zIndex: 0,
          transition: "opacity 0.2s ease",
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
            fontSize: "8.5px",
            fontFamily: "monospace",
            color: "#00FF41",
            zIndex: 15,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            border: "1px solid rgba(0, 255, 65, 0.2)",
            lineHeight: 1.25,
          }}
        >
          {isLocal ? (
            <div>
              <span>Local | A:{audioTrackCount > 0 && participant.micOn ? 1 : 0} | V:{videoTrackCount > 0 && participant.cameraOn ? 1 : 0} | mic:{participant.micOn ? "ON" : "OFF"} | cam:{participant.cameraOn ? "ON" : "OFF"}</span>
            </div>
          ) : (
            <div>
              <div>Conn:{diag?.connectionState || "new"} | ICE:{diag?.iceConnectionState || "new"} | A: send:{diag?.sendingAudio ?? (participant.micOn ? 1 : 0)} rcv:{audioTrackCount} | dir:{diag?.audioDirection || "-"}</div>
              <div>V: send:{diag?.sendingVideo ?? (participant.cameraOn ? 1 : 0)} rcv:{videoTrackCount} | dir:{diag?.videoDirection || "-"} | cam:{participant.cameraOn ? "ON" : "OFF"}</div>
            </div>
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
