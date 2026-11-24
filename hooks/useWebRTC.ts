"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { CallParticipant, CallState, SpectatorCallPermission } from "@/types/game";
import { reconcilePeers, shouldInitiate, isPolitePeer, setupOffererTransceivers, setupAnswererTransceivers, logPeerNegotiation } from "@/lib/webrtc";

export interface PeerDiagnosticInfo {
  connectionState: string;
  iceConnectionState: string;
  signalingState: string;
  audioTracks: number;
  videoTracks: number;
  sendingAudio?: number | boolean;
  sendingAudioEnabled?: boolean;
  sendingVideo?: number | boolean;
  audioDirection?: string;
  audioCurrentDirection?: string;
  audioBytesReceiving?: boolean;
  bytesReceived?: number;
  videoDirection?: string;
  videoCurrentDirection?: string;
  videoFramesIncreasing?: boolean;
  framesDecoded?: number;
}

interface PeerSenders {
  audioSender: RTCRtpSender;
  videoSender: RTCRtpSender;
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  isPlayer: boolean;
  isHost: boolean;
  socket: Socket | null;
}

export function useWebRTC({
  roomId,
  userId,
  userName,
  isPlayer,
  isHost,
  socket,
}: UseWebRTCOptions) {
  // Call State
  const [callState, setCallState] = useState<CallState>({
    status: "idle",
    active: false,
    startedBy: null,
    spectatorCallSetting: "ask",
    spectatorsAllowed: "ask",
    participants: [],
  });
  const [isInCall, setIsInCall] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [mutedByModerator, setMutedByModerator] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Local-only controls (only affect my own screen)
  const [mutedForMe, setMutedForMe] = useState<Set<string>>(new Set());
  const [hiddenVideoForMe, setHiddenVideoForMe] = useState<Set<string>>(new Set());

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // Diagnostics (NODE_ENV === 'development')
  const [peerDiagnostics, setPeerDiagnostics] = useState<Map<string, PeerDiagnosticInfo>>(new Map());

  // Speaking indicator (AudioContext analyser)
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // Prompts
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    withVideo: boolean;
  } | null>(null);
  const [incomingJoinRequest, setIncomingJoinRequest] = useState<{
    requesterId: string;
    requesterName: string;
    withVideo: boolean;
  } | null>(null);
  const [isPendingJoin, setIsPendingJoin] = useState(false);

  // Audio autoplay blocked banner
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Synchronous refs for WebRTC and socket state
  const isInCallRef = useRef<boolean>(false);
  const roomIdRef = useRef<string>(roomId);
  const userIdRef = useRef<string>(userId);
  const userNameRef = useRef<string>(userName);
  const isPlayerRef = useRef<boolean>(isPlayer);
  const socketRef = useRef<Socket | null>(socket);

  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const micOnRef = useRef<boolean>(false);
  const cameraOnRef = useRef<boolean>(false);
  const mutedByModeratorRef = useRef<boolean>(false);
  const prevBytesReceivedRef = useRef<Map<string, number>>(new Map());
  const prevFramesDecodedRef = useRef<Map<string, number>>(new Map());

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerSendersRef = useRef<Map<string, PeerSenders>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const ignoreOfferRef = useRef<Map<string, boolean>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceRestartAttemptedRef = useRef<Map<string, boolean>>(new Map());
  const watchdogTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mediaReadyPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs up-to-date synchronously
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);

  useEffect(() => {
    mutedByModeratorRef.current = mutedByModerator;
  }, [mutedByModerator]);

  // Keep refs up-to-date synchronously
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    isPlayerRef.current = isPlayer;
  }, [isPlayer]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // WebRTC ICE Servers
  const getRtcConfig = useCallback((): RTCConfiguration => {
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        ...(turnUsername ? { username: turnUsername } : {}),
        ...(turnCredential ? { credential: turnCredential } : {}),
      });
    }
    return { iceServers };
  }, []);

  // Update Peer Diagnostics for UI (memoized to avoid re-renders if unchanged)
  const updatePeerDiagnostics = useCallback((remoteUid: string, pc: RTCPeerConnection) => {
    setPeerDiagnostics((prev) => {
      const rStream = remoteStreamsRef.current.get(remoteUid);
      const audioTracks = rStream ? rStream.getAudioTracks().length : 0;
      const videoTracks = rStream ? rStream.getVideoTracks().length : 0;
      const senders = peerSendersRef.current.get(remoteUid);
      const sendingAudio = senders?.audioSender?.track ? 1 : 0;
      const sendingAudioEnabled = senders?.audioSender?.track?.enabled ?? false;
      const sendingVideo = senders?.videoSender?.track ? 1 : 0;
      const audioTransceiver = pc.getTransceivers ? pc.getTransceivers().find(
        (t) => t.receiver?.track?.kind === "audio" || (t.sender?.track && t.sender.track.kind === "audio")
      ) : undefined;
      const audioDirection = audioTransceiver?.direction || "none";
      const audioCurrentDirection = audioTransceiver?.currentDirection || "none";

      const videoTransceiver = pc.getTransceivers ? pc.getTransceivers().find(
        (t) => t.receiver?.track?.kind === "video" || (t.sender?.track && t.sender.track.kind === "video")
      ) : undefined;
      const videoDirection = videoTransceiver?.direction || "none";
      const videoCurrentDirection = videoTransceiver?.currentDirection || "none";

      const connState = pc.connectionState || "new";
      const iceState = pc.iceConnectionState || "new";
      const sigState = pc.signalingState || "stable";
      const existing = prev.get(remoteUid);
      if (
        existing &&
        existing.connectionState === connState &&
        existing.iceConnectionState === iceState &&
        existing.signalingState === sigState &&
        existing.audioTracks === audioTracks &&
        existing.videoTracks === videoTracks &&
        existing.sendingAudio === sendingAudio &&
        existing.sendingAudioEnabled === sendingAudioEnabled &&
        existing.sendingVideo === sendingVideo &&
        existing.audioDirection === audioDirection &&
        existing.audioCurrentDirection === audioCurrentDirection &&
        existing.videoDirection === videoDirection &&
        existing.videoCurrentDirection === videoCurrentDirection
      ) {
        return prev;
      }
      const next = new Map(prev);
      next.set(remoteUid, {
        connectionState: connState,
        iceConnectionState: iceState,
        signalingState: sigState,
        audioTracks,
        videoTracks,
        sendingAudio,
        sendingAudioEnabled,
        sendingVideo,
        audioDirection,
        audioCurrentDirection,
        videoDirection,
        videoCurrentDirection,
        bytesReceived: existing?.bytesReceived,
        audioBytesReceiving: existing?.audioBytesReceiving,
        framesDecoded: existing?.framesDecoded,
        videoFramesIncreasing: existing?.videoFramesIncreasing,
      });
      return next;
    });
  }, []);

  // Initialize or resume AudioContext
  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          setAudioBlocked(true);
        }
        audioContextRef.current = ctx;
      }
    }
    return audioContextRef.current;
  }, []);

  // Resume blocked audio (e.g. user gesture)
  const resumeAudio = useCallback(async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
        setAudioBlocked(false);
        if (process.env.NODE_ENV !== "production") {
          console.log("[WebRTC:Client] AudioContext resumed successfully");
        }
      } catch (e) {
        console.error("[WebRTC:Client] AudioContext resume failed:", e);
      }
    } else {
      setAudioBlocked(false);
    }

    if (typeof document !== "undefined") {
      document.querySelectorAll("audio").forEach((el) => {
        el.play().catch(() => {});
      });
    }
  }, [getAudioContext]);

  // Periodic sampling of inbound-rtp audio bytesReceived & video framesDecoded (every 2 seconds in development)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const interval = setInterval(async () => {
      pcsRef.current.forEach(async (pc, peerId) => {
        if (!pc || pc.connectionState === "closed") return;
        try {
          const stats = await pc.getStats();
          let currentBytes = 0;
          let currentFrames = 0;
          stats.forEach((report) => {
            if (report.type === "inbound-rtp") {
              if (report.kind === "audio" || report.mediaType === "audio") {
                currentBytes = report.bytesReceived || 0;
              } else if (report.kind === "video" || report.mediaType === "video") {
                currentFrames = report.framesDecoded || 0;
              }
            }
          });

          const prevBytes = prevBytesReceivedRef.current.get(peerId) ?? 0;
          const isBytesIncreasing = currentBytes > prevBytes && currentBytes > 0;
          prevBytesReceivedRef.current.set(peerId, currentBytes);

          const prevFrames = prevFramesDecodedRef.current.get(peerId) ?? 0;
          const isFramesIncreasing = currentFrames > prevFrames && currentFrames > 0;
          prevFramesDecodedRef.current.set(peerId, currentFrames);

          setPeerDiagnostics((prevMap) => {
            const existing = prevMap.get(peerId);
            if (!existing) return prevMap;
            if (
              existing.bytesReceived === currentBytes &&
              existing.audioBytesReceiving === isBytesIncreasing &&
              existing.framesDecoded === currentFrames &&
              existing.videoFramesIncreasing === isFramesIncreasing
            ) {
              return prevMap;
            }
            const next = new Map(prevMap);
            next.set(peerId, {
              ...existing,
              bytesReceived: currentBytes,
              audioBytesReceiving: isBytesIncreasing,
              framesDecoded: currentFrames,
              videoFramesIncreasing: isFramesIncreasing,
            });
            return next;
          });
        } catch {}
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Speaking detection loop
  useEffect(() => {
    if (!isInCall) {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setSpeakingUsers(new Set());
      return;
    }

    audioIntervalRef.current = setInterval(() => {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state !== "running") return;

      const activeSpeakers = new Set<string>();

      audioAnalysersRef.current.forEach((analyser, uid) => {
        if (uid === userIdRef.current && !localStreamRef.current?.getAudioTracks()[0]?.enabled) {
          return;
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        if (average > 15) {
          activeSpeakers.add(uid);
        }
      });

      setSpeakingUsers((prev) => {
        if (prev.size === activeSpeakers.size) {
          let same = true;
          activeSpeakers.forEach((uid) => {
            if (!prev.has(uid)) {
              same = false;
            }
          });
          if (same) return prev;
        }
        return activeSpeakers;
      });
    }, 120);

    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isInCall]);

  // Attach audio stream to analyser
  const attachAudioAnalyser = useCallback(
    (uid: string, stream: MediaStream) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioAnalysersRef.current.set(uid, analyser);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error(`[WebRTC:Client] Failed to attach analyser for ${uid}:`, err);
        }
      }
    },
    [getAudioContext]
  );

  // Stop all local tracks and close all peer connections
  const cleanupCall = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[WebRTC:Client] Cleaning up call state and connections");
    }

    // 1. Stop local tracks only when leaving call
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
      } catch {}
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
      } catch {}
      localVideoTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // 2. Close peer connections & clear sender maps
    pcsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    pcsRef.current.clear();
    peerSendersRef.current.clear();
    makingOfferRef.current.clear();
    ignoreOfferRef.current.clear();
    pendingCandidatesRef.current.clear();
    iceRestartAttemptedRef.current.clear();
    watchdogTimersRef.current.forEach((t) => clearTimeout(t));
    watchdogTimersRef.current.clear();
    prevBytesReceivedRef.current.clear();
    prevFramesDecodedRef.current.clear();

    // 3. Clear remote streams & diagnostics
    remoteStreamsRef.current.clear();
    setRemoteStreams(new Map());
    setPeerDiagnostics(new Map());

    // 4. Clear audio analysers
    audioAnalysersRef.current.clear();
    setSpeakingUsers(new Set());

    // 5. Reset states
    isInCallRef.current = false;
    setIsInCall(false);
    setIsRinging(false);
    micOnRef.current = false;
    setMicOn(false);
    cameraOnRef.current = false;
    setCameraOn(false);
    mutedByModeratorRef.current = false;
    setMutedByModerator(false);
    setIsPendingJoin(false);
  }, []);

  // Handle local video track ending unexpectedly (device unplugged/interrupted)
  const handleVideoTrackEnded = useCallback(() => {
    if (!isInCallRef.current) return;
    toast("Camera disconnected", { icon: "📷" });
    if (localVideoTrackRef.current) {
      try {
        localVideoTrackRef.current.stop();
      } catch {}
      localVideoTrackRef.current = null;
    }
    cameraOnRef.current = false;
    setCameraOn(false);

    peerSendersRef.current.forEach(({ videoSender }, peerId) => {
      try {
        videoSender.replaceTrack(null);
      } catch (err) {
        console.error(`[WebRTC] replaceTrack(null) error for peer ${peerId}:`, err);
      }
    });

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    pcsRef.current.forEach((_, pid) => updatePeerDiagnostics(pid, pcsRef.current.get(pid)!));

    if (socketRef.current) {
      socketRef.current.emit("call-media-state", {
        roomId: roomIdRef.current,
        micOn: micOnRef.current,
        cameraOn: false,
      });
    }
  }, [updatePeerDiagnostics]);

  // Sync senders with current local tracks (audioSender.track === localAudioTrack, videoSender.track === localVideoTrack)
  const syncSenders = useCallback(
    async (remoteUserId: string) => {
      const pc = pcsRef.current.get(remoteUserId);
      if (!pc) return;

      let senders = peerSendersRef.current.get(remoteUserId);
      if (!senders) {
        const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
        let aSender: RTCRtpSender | undefined;
        let vSender: RTCRtpSender | undefined;
        for (const t of transceivers) {
          const kind = t.receiver?.track?.kind || t.sender?.track?.kind || (t as any).kind;
          if (kind === "audio") {
            aSender = t.sender;
          } else if (kind === "video") {
            vSender = t.sender;
          }
        }
        if (aSender && vSender) {
          senders = { audioSender: aSender, videoSender: vSender };
          peerSendersRef.current.set(remoteUserId, senders);
        }
      }
      if (!senders) return;

      const currentAudio = localAudioTrackRef.current;
      if (currentAudio && senders.audioSender) {
        if (senders.audioSender.track !== currentAudio) {
          try {
            await senders.audioSender.replaceTrack(currentAudio);
          } catch (e: any) {
            console.error(`[WebRTC] syncSenders audio error for ${remoteUserId}:`, e);
            toast.error("Audio track sync failed");
          }
        }
      }

      const currentVideo = cameraOnRef.current && localVideoTrackRef.current ? localVideoTrackRef.current : null;
      if (senders.videoSender) {
        if (senders.videoSender.track !== currentVideo) {
          try {
            await senders.videoSender.replaceTrack(currentVideo);
          } catch (e: any) {
            console.error(`[WebRTC] syncSenders video error for ${remoteUserId}:`, e);
            toast.error("Video track sync failed");
          }
        }
      }
    },
    []
  );

  // Acquire or reuse local audio track (one track per participant, shared by all peers)
  const ensureLocalMedia = useCallback(
    async (withVideo: boolean = false): Promise<MediaStream | null> => {
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        toast.error("Voice & video chat requires HTTPS (or localhost).");
        return null;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("WebRTC is not supported in this browser.");
        return null;
      }

      // Check if live audio track already exists
      if (localAudioTrackRef.current && localAudioTrackRef.current.readyState === "live") {
        if (withVideo && (!localVideoTrackRef.current || localVideoTrackRef.current.readyState !== "live")) {
          try {
            const vStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 24, max: 30 },
              },
            });
            const vTrack = vStream.getVideoTracks()[0];
            if (vTrack) {
              vTrack.onended = handleVideoTrackEnded;
              localVideoTrackRef.current = vTrack;
              if (localStreamRef.current) {
                localStreamRef.current.addTrack(vTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
              }
              pcsRef.current.forEach((_, peerId) => syncSenders(peerId));
            }
          } catch (err) {
            console.warn("[WebRTC] Video capture error:", err);
          }
        }
        return localStreamRef.current;
      }

      // If media acquisition in flight, await it
      if (mediaReadyPromiseRef.current) {
        return mediaReadyPromiseRef.current;
      }

      mediaReadyPromiseRef.current = (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: withVideo
              ? {
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                  frameRate: { ideal: 24, max: 30 },
                }
              : false,
          });

          const aTrack = stream.getAudioTracks()[0];
          if (aTrack) {
            localAudioTrackRef.current = aTrack;
            aTrack.enabled = micOnRef.current && !mutedByModeratorRef.current;
            aTrack.onended = async () => {
              if (!isInCallRef.current) return;
              toast("Microphone disconnected, re-acquiring...", { icon: "🎙️" });
              try {
                const reacquired = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newTrack = reacquired.getAudioTracks()[0];
                if (newTrack) {
                  localAudioTrackRef.current = newTrack;
                  newTrack.enabled = micOnRef.current && !mutedByModeratorRef.current;
                  if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach((t) => localStreamRef.current?.removeTrack(t));
                    localStreamRef.current.addTrack(newTrack);
                  }
                  pcsRef.current.forEach((_, pid) => syncSenders(pid));
                }
              } catch (e) {
                console.error("[WebRTC] Failed to reacquire audio track:", e);
              }
            };
          }

          const vTrack = stream.getVideoTracks()[0];
          if (vTrack) {
            vTrack.onended = handleVideoTrackEnded;
            localVideoTrackRef.current = vTrack;
          }

          localStreamRef.current = stream;
          setLocalStream(stream);

          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[WebRTC:Client] ensureLocalMedia success: audioTracks=${stream.getAudioTracks().length}, videoTracks=${stream.getVideoTracks().length}`
            );
          }

          // Sync senders across any existing peer connections
          pcsRef.current.forEach((_, peerId) => syncSenders(peerId));

          return stream;
        } catch (err: any) {
          console.error("[WebRTC:Client] getUserMedia error:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            toast.error("Microphone/camera access was denied. Please check your browser permissions.");
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            toast.error("No microphone or camera found on your device.");
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            toast.error("Camera or microphone is already in use by another application.");
          } else {
            toast.error(`Media access failed: ${err.message || "Unknown error"}`);
          }
          return null;
        } finally {
          mediaReadyPromiseRef.current = null;
        }
      })();

      return mediaReadyPromiseRef.current;
    },
    [syncSenders]
  );

  const getUserMediaStream = ensureLocalMedia;

  // Create an RTCPeerConnection for a remote user
  const getOrCreatePeerConnection = useCallback(
    (remoteUserId: string, isInitiator: boolean = false): RTCPeerConnection => {
      let pc = pcsRef.current.get(remoteUserId);
      if (pc) return pc;

      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Creating RTCPeerConnection for remote peer: ${remoteUserId} (isInitiator: ${isInitiator})`);
      }

      const rtcConfig = getRtcConfig();
      pc = new RTCPeerConnection(rtcConfig);
      pcsRef.current.set(remoteUserId, pc);
      makingOfferRef.current.set(remoteUserId, false);
      ignoreOfferRef.current.set(remoteUserId, false);

      if (isInitiator) {
        // Offerer: create pc.addTransceiver("audio",{direction:"sendrecv"}) and pc.addTransceiver("video",{direction:"sendrecv"})
        const { audioSender, videoSender } = setupOffererTransceivers(
          pc,
          localAudioTrackRef.current,
          localVideoTrackRef.current,
          cameraOnRef.current
        );
        peerSendersRef.current.set(remoteUserId, { audioSender, videoSender });
      }
      // Answerer: do NOT create extra transceivers! Wait for offer in handleWebRTCOffer

      // Signaling & Connection state changes
      pc.onsignalingstatechange = () => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] PC (${remoteUserId}) signalingState: ${pc!.signalingState}`);
        }
        updatePeerDiagnostics(remoteUserId, pc!);
        if (pc!.signalingState === "stable") {
          syncSenders(remoteUserId);
        }
      };

      pc.onconnectionstatechange = () => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] PC (${remoteUserId}) connectionState: ${pc!.connectionState}`);
        }
        updatePeerDiagnostics(remoteUserId, pc!);
      };

      pc.oniceconnectionstatechange = () => {
        if (!pc) return;
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] PC (${remoteUserId}) iceConnectionState: ${pc.iceConnectionState}`);
        }
        updatePeerDiagnostics(remoteUserId, pc);

        if (pc.iceConnectionState === "failed") {
          const tried = iceRestartAttemptedRef.current.get(remoteUserId);
          if (!tried) {
            iceRestartAttemptedRef.current.set(remoteUserId, true);
            if (process.env.NODE_ENV !== "production") {
              console.log(`[WebRTC:Client] Attempting ICE restart for ${remoteUserId}`);
            }
            toast("Reconnecting peer...", { icon: "🔄" });
            try {
              pc.restartIce();
            } catch (e) {
              console.error("[WebRTC:Client] ICE restart failed:", e);
            }
          } else {
            toast.error("Peer connection lost");
          }
        }
      };

      // Handle remote tracks: add track to remote MediaStream and listen for mute/unmute/ended
      pc.ontrack = (event) => {
        const track = event.track;
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[WebRTC:Client] ontrack from ${remoteUserId}: kind=${track.kind}, id=${track.id}, streams=${event.streams.length}`
          );
        }

        let stream = remoteStreamsRef.current.get(remoteUserId);
        if (!stream) {
          stream = new MediaStream();
          remoteStreamsRef.current.set(remoteUserId, stream);
        }
        if (!stream.getTracks().some((t) => t.id === track.id)) {
          stream.addTrack(track);
        }
        setRemoteStreams(new Map(remoteStreamsRef.current));

        if (track.kind === "audio") {
          attachAudioAnalyser(remoteUserId, stream);
        }

        const handleTrackStateChange = () => {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[WebRTC:Client] Track state changed for ${remoteUserId} (${track.kind}): muted=${track.muted}, readyState=${track.readyState}`
            );
          }
          setRemoteStreams(new Map(remoteStreamsRef.current));
          updatePeerDiagnostics(remoteUserId, pc!);
        };

        track.onmute = handleTrackStateChange;
        track.onunmute = handleTrackStateChange;
        track.onended = handleTrackStateChange;

        updatePeerDiagnostics(remoteUserId, pc!);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[WebRTC:Client] Generated ICE candidate for ${remoteUserId} (mid: ${event.candidate.sdpMid}, mline: ${event.candidate.sdpMLineIndex})`
            );
          }
          socketRef.current.emit("webrtc-ice-candidate", {
            roomId: roomIdRef.current,
            targetUserId: remoteUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Negotiation handler
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current.set(remoteUserId, true);
          if (process.env.NODE_ENV !== "production") {
            console.log(`[WebRTC:Client] onnegotiationneeded -> creating offer for ${remoteUserId}`);
          }
          await ensureLocalMedia(false);
          await pc!.setLocalDescription();
          if (socketRef.current && pc!.localDescription) {
            if (process.env.NODE_ENV !== "production") {
              console.log(
                `[WebRTC:Client] Created and sending offer (type: ${pc!.localDescription.type}) to ${remoteUserId}`
              );
            }
            logPeerNegotiation(remoteUserId, pc!, "offer", pc!.localDescription.sdp, remoteStreamsRef.current.get(remoteUserId));
            socketRef.current.emit("webrtc-offer", {
              roomId: roomIdRef.current,
              targetUserId: remoteUserId,
              sdp: {
                type: pc!.localDescription.type,
                sdp: pc!.localDescription.sdp,
              },
            });
          }
        } catch (err) {
          console.error(`[WebRTC:Client] Error in onnegotiationneeded for ${remoteUserId}:`, err);
        } finally {
          makingOfferRef.current.set(remoteUserId, false);
        }
      };

      updatePeerDiagnostics(remoteUserId, pc);

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Active Peer Connections for ${userIdRef.current} (${userNameRef.current}):`,
          Array.from(pcsRef.current.keys())
        );
      }

      return pc;
    },
    [getRtcConfig, attachAudioAnalyser, updatePeerDiagnostics, syncSenders, ensureLocalMedia]
  );

  // Full Mesh Reconciliation
  const runReconcilePeers = useCallback(
    (participants: CallParticipant[]) => {
      if (!isInCallRef.current || !userIdRef.current) return;

      const existingPeerIds = Array.from(pcsRef.current.keys());
      const { toCreate, toInitiate, toRemove } = reconcilePeers(
        userIdRef.current,
        participants,
        existingPeerIds
      );

      // Clean up removed peers
      toRemove.forEach((uid) => {
        const pc = pcsRef.current.get(uid);
        if (pc) {
          pc.close();
          pcsRef.current.delete(uid);
        }
        peerSendersRef.current.delete(uid);
        makingOfferRef.current.delete(uid);
        ignoreOfferRef.current.delete(uid);
        pendingCandidatesRef.current.delete(uid);
        const wd = watchdogTimersRef.current.get(uid);
        if (wd) {
          clearTimeout(wd);
          watchdogTimersRef.current.delete(uid);
        }
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(uid);
          return next;
        });
        setPeerDiagnostics((prev) => {
          const next = new Map(prev);
          next.delete(uid);
          return next;
        });
        audioAnalysersRef.current.delete(uid);
      });

      // Create new peer connections
      toCreate.forEach((uid) => {
        const shouldInit = toInitiate.includes(uid);
        const pc = getOrCreatePeerConnection(uid, shouldInit);

        if (shouldInit) {
          const doInitiate = async () => {
            if (mediaReadyPromiseRef.current) {
              await mediaReadyPromiseRef.current;
            }
            syncSenders(uid);
            try {
              makingOfferRef.current.set(uid, true);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (socketRef.current && pc.localDescription) {
                if (process.env.NODE_ENV !== "production") {
                  console.log(`[WebRTC:Client] Reconcile initiated offer to ${uid}`);
                }
                logPeerNegotiation(uid, pc, "offer", pc.localDescription.sdp, remoteStreamsRef.current.get(uid));
                socketRef.current.emit("webrtc-offer", {
                  roomId: roomIdRef.current,
                  targetUserId: uid,
                  sdp: {
                    type: pc.localDescription.type,
                    sdp: pc.localDescription.sdp,
                  },
                });
              }
            } catch (e) {
              console.error(`[WebRTC:Client] Failed to create reconcile offer for ${uid}:`, e);
            } finally {
              makingOfferRef.current.set(uid, false);
            }
          };
          doInitiate();
        } else {
          // Uninitiated peer watchdog timer: if no remote description received within 6s, request offer
          const existingTimer = watchdogTimersRef.current.get(uid);
          if (existingTimer) clearTimeout(existingTimer);

          const timer = setTimeout(() => {
            const currentPc = pcsRef.current.get(uid);
            if (currentPc && !currentPc.remoteDescription) {
              if (process.env.NODE_ENV !== "production") {
                console.log(`[WebRTC:Client] Watchdog requesting offer from ${uid}`);
              }
              socketRef.current?.emit("webrtc-request-offer", {
                roomId: roomIdRef.current,
                targetUserId: uid,
              });
            }
          }, 6000);
          watchdogTimersRef.current.set(uid, timer);
        }
      });
    },
    [getOrCreatePeerConnection, syncSenders]
  );

  // Player starts a call
  const startCall = useCallback(
    async (withVideo = false) => {
      if (!isPlayerRef.current) {
        toast.error("Only players can start a call.");
        return;
      }
      if (!socketRef.current) return;

      await resumeAudio();

      micOnRef.current = true;
      setMicOn(true);
      cameraOnRef.current = withVideo;
      setCameraOn(withVideo);

      const stream = await ensureLocalMedia(withVideo);
      if (!stream) return;

      isInCallRef.current = true;
      setIsInCall(true);
      setIsRinging(true);

      attachAudioAnalyser(userIdRef.current, stream);

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Emitting call-start in room ${roomIdRef.current}, withVideo: ${withVideo}`
        );
      }

      socketRef.current.emit("call-start", {
        roomId: roomIdRef.current,
        withVideo,
        userId: userIdRef.current,
      });

      toast.success(withVideo ? "Video call started" : "Voice call started");
    },
    [resumeAudio, ensureLocalMedia, attachAudioAnalyser]
  );

  // Join an existing call
  const joinCall = useCallback(
    async (withVideo = false) => {
      if (!socketRef.current) return;

      // Spectator in 'Ask' mode -> send request and wait
      if (!isPlayerRef.current && callState.spectatorsAllowed === "Ask") {
        setIsPendingJoin(true);
        socketRef.current.emit("call-join-request", {
          roomId: roomIdRef.current,
          withVideo,
          userId: userIdRef.current,
        });
        toast("Join request sent to players...", { icon: "⏳" });
        return;
      }

      // If 'Off' mode for spectator
      if (!isPlayerRef.current && callState.spectatorsAllowed === "Off") {
        toast.error("Spectators are not allowed in this call.");
        return;
      }

      await resumeAudio();

      const shouldEnableMic = isPlayerRef.current;
      const shouldEnableCam = Boolean(withVideo);
      micOnRef.current = shouldEnableMic;
      setMicOn(shouldEnableMic);
      cameraOnRef.current = shouldEnableCam;
      setCameraOn(shouldEnableCam);

      const stream = await ensureLocalMedia(shouldEnableCam);
      if (!stream) return;

      isInCallRef.current = true;
      setIsInCall(true);

      attachAudioAnalyser(userIdRef.current, stream);

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Emitting call-join-request in room ${roomIdRef.current}`
        );
      }

      socketRef.current.emit("call-join-request", {
        roomId: roomIdRef.current,
        withVideo: shouldEnableCam,
        userId: userIdRef.current,
      });

      // Full mesh: reconcile peers for all existing participants
      runReconcilePeers(callState.participants);

      toast.success("Joined the call");
    },
    [
      callState.spectatorsAllowed,
      callState.participants,
      resumeAudio,
      ensureLocalMedia,
      attachAudioAnalyser,
      runReconcilePeers,
    ]
  );

  // Leave the call voluntarily (for EVERYONE - only removes myself)
  const leaveCall = useCallback(() => {
    setIsRinging(false);
    if (socketRef.current) {
      socketRef.current.emit("call-leave", {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
      });
    }
    cleanupCall();
    toast("Left the call", { icon: "👋" });
  }, [cleanupCall]);

  // Cancel outgoing call while ringing (caller only)
  const endCall = useCallback(() => {
    leaveCall();
  }, [leaveCall]);

  // Respond to incoming player call
  const respondIncomingCall = useCallback(
    async (accept: boolean) => {
      if (!incomingCall || !socketRef.current) return;
      const { withVideo, callerId } = incomingCall;
      setIncomingCall(null);

      if (!accept) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] Declining incoming call from ${callerId}`);
        }
        socketRef.current.emit("call-join-response", {
          roomId: roomIdRef.current,
          requesterId: callerId,
          accepted: false,
          userId: userIdRef.current,
        });
        return;
      }

      await resumeAudio();

      micOnRef.current = true;
      setMicOn(true);
      cameraOnRef.current = withVideo;
      setCameraOn(withVideo);

      const stream = await ensureLocalMedia(withVideo);
      if (!stream) {
        socketRef.current.emit("call-join-response", {
          roomId: roomIdRef.current,
          requesterId: callerId,
          accepted: false,
          userId: userIdRef.current,
        });
        return;
      }

      isInCallRef.current = true;
      setIsInCall(true);

      attachAudioAnalyser(userIdRef.current, stream);

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Accepting incoming call from ${callerId}, withVideo: ${withVideo}`
        );
      }

      socketRef.current.emit("call-join-response", {
        roomId: roomIdRef.current,
        requesterId: callerId,
        accepted: true,
        withVideo,
        userId: userIdRef.current,
      });

      // Full mesh reconciliation
      runReconcilePeers(callState.participants);

      toast.success("Call connected");
    },
    [
      incomingCall,
      callState.participants,
      resumeAudio,
      ensureLocalMedia,
      attachAudioAnalyser,
      runReconcilePeers,
    ]
  );

  // Respond to spectator join request (players only)
  const respondJoinRequest = useCallback(
    (requesterId: string, accept: boolean) => {
      if (!isPlayerRef.current || !socketRef.current) return;
      setIncomingJoinRequest(null);
      socketRef.current.emit("call-join-response", {
        roomId: roomIdRef.current,
        requesterId,
        accepted: accept,
        userId: userIdRef.current,
      });
      if (accept) {
        toast.success("Spectator accepted into call");
      } else {
        toast("Join request declined", { icon: "❌" });
      }
    },
    []
  );

  // Toggle Mic (mute/unmute via track.enabled)
  const toggleMic = useCallback(() => {
    if (mutedByModeratorRef.current) {
      toast.error("You are muted by a player and cannot unmute yourself.");
      return;
    }

    const audioTrack = localAudioTrackRef.current;
    if (!audioTrack) {
      ensureLocalMedia(cameraOnRef.current).then((stream) => {
        if (stream && localAudioTrackRef.current) {
          const track = localAudioTrackRef.current;
          track.enabled = true;
          micOnRef.current = true;
          setMicOn(true);
          pcsRef.current.forEach((_, pid) => updatePeerDiagnostics(pid, pcsRef.current.get(pid)!));
          socketRef.current?.emit("call-media-state", {
            roomId: roomIdRef.current,
            micOn: true,
            cameraOn: cameraOnRef.current,
          });
          toast("Microphone ON", { icon: "🎙️" });
        }
      });
      return;
    }

    const nextState = !audioTrack.enabled;
    audioTrack.enabled = nextState;
    micOnRef.current = nextState;
    setMicOn(nextState);

    pcsRef.current.forEach((_, pid) => updatePeerDiagnostics(pid, pcsRef.current.get(pid)!));

    if (socketRef.current) {
      socketRef.current.emit("call-media-state", {
        roomId: roomIdRef.current,
        micOn: nextState,
        cameraOn: cameraOnRef.current,
      });
    }

    toast(nextState ? "Microphone ON" : "Microphone MUTED", {
      icon: nextState ? "🎙️" : "🔇",
    });
  }, [ensureLocalMedia, updatePeerDiagnostics]);

  // Toggle Camera (Camera ON: getUserMedia + videoSender.replaceTrack; Camera OFF: stop + videoSender.replaceTrack(null))
  const toggleCamera = useCallback(async () => {
    if (cameraOnRef.current) {
      // Camera OFF: stop video track, clear ref, and replace on every peer's videoSender with null
      const videoTrack = localVideoTrackRef.current;
      if (videoTrack) {
        try {
          videoTrack.stop();
        } catch {}
        localVideoTrackRef.current = null;
        if (localStreamRef.current) {
          localStreamRef.current.removeTrack(videoTrack);
        }
      }

      peerSendersRef.current.forEach(({ videoSender }, peerId) => {
        try {
          videoSender.replaceTrack(null);
        } catch (err: any) {
          console.error(`[WebRTC:Client] replaceTrack(null) failed for peer ${peerId}:`, err);
        }
      });

      cameraOnRef.current = false;
      setCameraOn(false);

      if (localStreamRef.current) {
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      pcsRef.current.forEach((_, pid) => updatePeerDiagnostics(pid, pcsRef.current.get(pid)!));

      if (socketRef.current) {
        socketRef.current.emit("call-media-state", {
          roomId: roomIdRef.current,
          micOn: micOnRef.current,
          cameraOn: false,
        });
      }

      toast("Camera turned OFF", { icon: "📷" });
    } else {
      // Camera ON: getUserMedia for video ONCE, then for EVERY peer call videoSender.replaceTrack(newTrack)
      try {
        if (localVideoTrackRef.current) {
          try {
            localVideoTrackRef.current.stop();
          } catch {}
          localVideoTrackRef.current = null;
        }

        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 },
          },
        });
        const newTrack = videoStream.getVideoTracks()[0];
        if (!newTrack) return;

        if (newTrack.kind !== "video") {
          throw new Error("Track kind is not video");
        }

        newTrack.onended = handleVideoTrackEnded;

        localVideoTrackRef.current = newTrack;
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(newTrack);
        } else {
          localStreamRef.current = new MediaStream([newTrack]);
          if (localAudioTrackRef.current) {
            localStreamRef.current.addTrack(localAudioTrackRef.current);
          }
        }
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        peerSendersRef.current.forEach(({ videoSender }, peerId) => {
          try {
            if (newTrack.kind === "video") {
              videoSender.replaceTrack(newTrack);
            }
          } catch (err: any) {
            console.error(`[WebRTC:Client] replaceTrack failed for peer ${peerId}:`, err);
            toast.error(`Camera attach failed for peer: ${err?.message || "unknown"}`);
          }
        });

        cameraOnRef.current = true;
        setCameraOn(true);

        pcsRef.current.forEach((_, pid) => updatePeerDiagnostics(pid, pcsRef.current.get(pid)!));

        if (socketRef.current) {
          socketRef.current.emit("call-media-state", {
            roomId: roomIdRef.current,
            micOn: micOnRef.current,
            cameraOn: true,
          });
        }

        toast("Camera turned ON", { icon: "📹" });
      } catch (err: any) {
        console.error("[WebRTC:Client] Failed to enable camera:", err);
        toast.error(`Could not activate camera: ${err?.message || "error"}`);
      }
    }
  }, [handleVideoTrackEnded, updatePeerDiagnostics]);

  // Toggle Deafen
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      toast(next ? "Deafened (all incoming audio silenced)" : "Undeafened", {
        icon: next ? "🔕" : "🔔",
      });
      return next;
    });
  }, []);

  // Mute specific user for me only
  const toggleMuteForMe = useCallback((targetUserId: string) => {
    setMutedForMe((prev) => {
      const next = new Set(prev);
      if (next.has(targetUserId)) {
        next.delete(targetUserId);
        toast("Unmuted for you", { icon: "🔊" });
      } else {
        next.add(targetUserId);
        toast("Muted for you", { icon: "🔇" });
      }
      return next;
    });
  }, []);

  // Hide video for specific user for me only
  const toggleHideVideoForMe = useCallback((targetUserId: string) => {
    setHiddenVideoForMe((prev) => {
      const next = new Set(prev);
      if (next.has(targetUserId)) {
        next.delete(targetUserId);
        toast("Video shown", { icon: "👁️" });
      } else {
        next.add(targetUserId);
        toast("Video hidden for you", { icon: "🙈" });
      }
      return next;
    });
  }, []);

  // Moderate participant (players only)
  const moderateParticipant = useCallback(
    (targetUserId: string, action: "mute" | "unmute" | "remove") => {
      if (!isPlayerRef.current || !socketRef.current) return;
      socketRef.current.emit("call-moderate", {
        roomId: roomIdRef.current,
        targetUserId,
        action,
      });
    },
    []
  );

  // Change room call setting (host only)
  const changeCallSetting = useCallback(
    (spectatorsAllowed: SpectatorCallPermission) => {
      if (!isHost || !socketRef.current) return;
      socketRef.current.emit("call-setting-change", {
        roomId: roomIdRef.current,
        spectatorsAllowed,
      });
      toast.success(`Spectator call access set to: ${spectatorsAllowed}`);
    },
    [isHost]
  );

  // Keyboard shortcuts: M for mic, V for camera (ignored while typing in inputs)
  useEffect(() => {
    if (!isInCall) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when modifier keys are pressed (e.g. Ctrl+V paste)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (isInput) return;

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMic();
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        toggleCamera();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInCall, toggleMic, toggleCamera]);

  // Main Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Call state update
    const handleCallState = (state: CallState) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Received call-state: active=${state.active}, participants=${state.participants.length}`
        );
      }
      setCallState(state);

      if (state.participants.length >= 2) {
        setIsRinging(false);
      }

      const me = state.participants.find((p) => p.userId === userIdRef.current);
      if (me) {
        if (!isInCallRef.current) {
          isInCallRef.current = true;
          setIsInCall(true);
        }

        // Full mesh reconciliation
        runReconcilePeers(state.participants);

        if (me.mutedByModerator !== mutedByModeratorRef.current) {
          mutedByModeratorRef.current = me.mutedByModerator;
          setMutedByModerator(me.mutedByModerator);
          if (me.mutedByModerator) {
            micOnRef.current = false;
            setMicOn(false);
            if (localAudioTrackRef.current) {
              localAudioTrackRef.current.enabled = false;
            }
          }
        }
      } else if (isInCallRef.current) {
        // We were in the call but are no longer listed in participants
        cleanupCall();
      }
    };

    // Incoming call prompt for player
    const handleCallIncoming = (data: { callerId: string; callerName: string; withVideo: boolean }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Received call-incoming from ${data.callerName} (${data.callerId})`);
      }
      if (!isInCallRef.current && data.callerId !== userIdRef.current) {
        setIncomingCall(data);
      }
    };

    // Spectator join request prompt for players
    const handleCallJoinRequest = (data: { requesterId: string; requesterName: string; withVideo: boolean }) => {
      if (isPlayerRef.current && data.requesterId !== userIdRef.current) {
        setIncomingJoinRequest(data);
      }
    };

    // Response to spectator's join request
    const handleCallJoinResponse = async (data: { accepted: boolean; reason?: string }) => {
      setIsPendingJoin(false);
      if (!data.accepted) {
        toast.error(data.reason || "Join request was declined");
        return;
      }

      await resumeAudio();

      micOnRef.current = false;
      setMicOn(false);
      cameraOnRef.current = false;
      setCameraOn(false);

      const stream = await ensureLocalMedia(false);
      if (!stream) return;

      isInCallRef.current = true;
      setIsInCall(true);

      attachAudioAnalyser(userIdRef.current, stream);

      // Full mesh reconciliation
      runReconcilePeers(callState.participants);

      toast.success("Joined the call");
    };

    // Participant joined
    const handleParticipantJoined = (data: { participant: CallParticipant; participants: CallParticipant[] }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Participant joined: ${data.participant.name} (${data.participant.userId})`
        );
      }
      setIsRinging(false);
      setCallState((prev) => ({
        ...prev,
        participants: data.participants,
      }));

      // Reconcile mesh connections
      if (isInCallRef.current) {
        runReconcilePeers(data.participants);
      }
    };

    // Participant left: ONLY close that peer's connection, others remain connected
    const handleParticipantLeft = (data: { userId: string; name?: string; reason?: string; participants: CallParticipant[] }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Participant left: ${data.userId} (${data.name})`);
      }
      setCallState((prev) => ({
        ...prev,
        participants: data.participants,
      }));

      if (data.userId === userIdRef.current) {
        cleanupCall();
        if (data.reason === "removed") {
          toast.error("You have been removed from the call by a player");
        }
      } else {
        // Show toast to remaining participants
        if (data.reason !== "removed") {
          toast(`${data.name || "A participant"} left the call`, { icon: "👋" });
        }

        // Close ONLY that peer connection
        const pc = pcsRef.current.get(data.userId);
        if (pc) {
          pc.close();
          pcsRef.current.delete(data.userId);
        }
        peerSendersRef.current.delete(data.userId);
        makingOfferRef.current.delete(data.userId);
        ignoreOfferRef.current.delete(data.userId);
        pendingCandidatesRef.current.delete(data.userId);
        const wd = watchdogTimersRef.current.get(data.userId);
        if (wd) {
          clearTimeout(wd);
          watchdogTimersRef.current.delete(data.userId);
        }

        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });

        setPeerDiagnostics((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });

        audioAnalysersRef.current.delete(data.userId);

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[WebRTC:Client] Active Peer Connections after ${data.userId} left:`,
            Array.from(pcsRef.current.keys())
          );
        }

        if (isInCallRef.current) {
          runReconcilePeers(data.participants);
        }
      }
    };

    // WebRTC Offer
    const handleWebRTCOffer = async (data: { senderId: string; sdp: RTCSessionDescriptionInit }) => {
      const { senderId, sdp } = data;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Received webrtc-offer from ${senderId} (type: ${sdp?.type})`);
      }

      // Clear any watchdog timer for this peer
      const wd = watchdogTimersRef.current.get(senderId);
      if (wd) {
        clearTimeout(wd);
        watchdogTimersRef.current.delete(senderId);
      }

      // Ensure local media is ready (acquires audio track if not already present)
      await ensureLocalMedia(false);

      const pc = getOrCreatePeerConnection(senderId, false);
      const isPolite = isPolitePeer(userIdRef.current, senderId);
      const offerCollision = makingOfferRef.current.get(senderId) || pc.signalingState !== "stable";
      const ignoreOffer = !isPolite && offerCollision;
      ignoreOfferRef.current.set(senderId, ignoreOffer);

      if (ignoreOffer) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] Impolite peer ignoring colliding offer from ${senderId}`);
        }
        return;
      }

      try {
        if (offerCollision) {
          await pc.setLocalDescription({ type: "rollback" });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Transceivers were received with remoteDescription - configure direction to "sendrecv" and extract senders
        const { audioSender, videoSender } = setupAnswererTransceivers(
          pc,
          localAudioTrackRef.current,
          localVideoTrackRef.current,
          cameraOnRef.current
        );
        peerSendersRef.current.set(senderId, { audioSender, videoSender });

        // Ensure senders have the local tracks attached before creating answer
        syncSenders(senderId);

        // Flush queued candidates
        const queued = pendingCandidatesRef.current.get(senderId) || [];
        for (const candidate of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.delete(senderId);

        // Explicitly create answer so answer SDP is generated with a=sendrecv
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        logPeerNegotiation(senderId, pc, "answer", answer.sdp, remoteStreamsRef.current.get(senderId));

        if (socketRef.current && pc.localDescription) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[WebRTC:Client] Created and sending answer to ${senderId} (type: ${pc.localDescription.type})`
            );
          }
          socketRef.current.emit("webrtc-answer", {
            roomId: roomIdRef.current,
            targetUserId: senderId,
            sdp: {
              type: pc.localDescription.type,
              sdp: pc.localDescription.sdp,
            },
          });
        }
      } catch (err) {
        console.error(`[WebRTC:Client] Error handling offer from ${senderId}:`, err);
      }
    };

    // WebRTC Answer
    const handleWebRTCAnswer = async (data: { senderId: string; sdp: RTCSessionDescriptionInit }) => {
      const { senderId, sdp } = data;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Received webrtc-answer from ${senderId} (type: ${sdp?.type})`);
      }
      const pc = pcsRef.current.get(senderId);
      if (!pc) return;

      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Flush queued candidates
          const queued = pendingCandidatesRef.current.get(senderId) || [];
          for (const candidate of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current.delete(senderId);

          syncSenders(senderId);

          logPeerNegotiation(senderId, pc, "answer", sdp.sdp, remoteStreamsRef.current.get(senderId));
        }
      } catch (err) {
        console.error(`[WebRTC:Client] Error handling answer from ${senderId}:`, err);
      }
    };

    // WebRTC Request Offer handler
    const handleWebRTCRequestOffer = async (data: { senderId: string }) => {
      const { senderId } = data;
      if (!isInCallRef.current) return;
      const pc = pcsRef.current.get(senderId);
      if (pc) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] Received webrtc-request-offer from ${senderId}, generating offer`);
        }
        try {
          makingOfferRef.current.set(senderId, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socketRef.current && pc.localDescription) {
            logPeerNegotiation(senderId, pc, "offer", pc.localDescription.sdp, remoteStreamsRef.current.get(senderId));
            socketRef.current.emit("webrtc-offer", {
              roomId: roomIdRef.current,
              targetUserId: senderId,
              sdp: {
                type: pc.localDescription.type,
                sdp: pc.localDescription.sdp,
              },
            });
          }
        } catch (err) {
          console.error(`[WebRTC:Client] Error generating offer on request for ${senderId}:`, err);
        } finally {
          makingOfferRef.current.set(senderId, false);
        }
      }
    };

    // WebRTC ICE Candidate
    const handleWebRTCIceCandidate = async (data: { senderId: string; candidate: RTCIceCandidateInit }) => {
      const { senderId, candidate } = data;
      if (!candidate) return;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Received webrtc-ice-candidate from ${senderId}`);
      }

      const pc = pcsRef.current.get(senderId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          if (!ignoreOfferRef.current.get(senderId)) {
            console.error(`[WebRTC:Client] Error adding ICE candidate from ${senderId}:`, err);
          }
        }
      } else {
        const queued = pendingCandidatesRef.current.get(senderId) || [];
        queued.push(candidate);
        pendingCandidatesRef.current.set(senderId, queued);
      }
    };

    // Remote media state updated (mic/camera toggle)
    const handleCallMediaState = (data: {
      userId: string;
      micOn: boolean;
      cameraOn: boolean;
      mutedByModerator?: boolean;
    }) => {
      setCallState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.userId === data.userId
            ? {
                ...p,
                micOn: data.micOn,
                cameraOn: data.cameraOn,
                mutedByModerator: data.mutedByModerator ?? p.mutedByModerator,
              }
            : p
        ),
      }));

      if (data.userId === userIdRef.current) {
        if (data.mutedByModerator && !mutedByModeratorRef.current) {
          mutedByModeratorRef.current = true;
          setMutedByModerator(true);
          micOnRef.current = false;
          setMicOn(false);
          if (localAudioTrackRef.current) {
            localAudioTrackRef.current.enabled = false;
          }
          toast.error("You were muted by a player");
        } else if (!data.mutedByModerator && mutedByModeratorRef.current) {
          mutedByModeratorRef.current = false;
          setMutedByModerator(false);
          toast.success("A player unmuted your microphone");
        }
      }
    };

    // Moderation event
    const handleCallModerated = (data: { action: "mute" | "unmute" | "remove"; moderatorName: string }) => {
      if (data.action === "mute") {
        mutedByModeratorRef.current = true;
        setMutedByModerator(true);
        micOnRef.current = false;
        setMicOn(false);
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.enabled = false;
        }
        toast.error(`You were muted by ${data.moderatorName}`);
      } else if (data.action === "unmute") {
        mutedByModeratorRef.current = false;
        setMutedByModerator(false);
        toast.success(`You were unmuted by ${data.moderatorName}`);
      } else if (data.action === "remove") {
        cleanupCall();
        toast.error(`You were removed from the call by ${data.moderatorName}`);
      }
    };

    // Call ended: fired when <= 1 participants remain in the call
    const handleCallEnded = (data: { roomId: string; reason?: string }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Call ended event received: ${data.reason}`);
      }
      setIsRinging(false);
      cleanupCall();
      toast(data.reason || "Call ended, everyone left", { icon: "⏹️" });
    };

    // Socket error handler
    const handleError = (data: { message?: string }) => {
      if (data?.message?.includes("Call is full")) {
        toast.error("Call is full (max 6 participants)");
        setIsPendingJoin(false);
      }
    };

    socket.on("call-state", handleCallState);
    socket.on("call-incoming", handleCallIncoming);
    socket.on("call-join-request", handleCallJoinRequest);
    socket.on("call-join-response", handleCallJoinResponse);
    socket.on("call-participant-joined", handleParticipantJoined);
    socket.on("call-participant-left", handleParticipantLeft);
    socket.on("webrtc-offer", handleWebRTCOffer);
    socket.on("webrtc-answer", handleWebRTCAnswer);
    socket.on("webrtc-ice-candidate", handleWebRTCIceCandidate);
    socket.on("webrtc-request-offer", handleWebRTCRequestOffer);
    socket.on("call-media-state", handleCallMediaState);
    socket.on("call-moderated", handleCallModerated);
    socket.on("call-ended", handleCallEnded);
    socket.on("error", handleError);

    return () => {
      socket.off("call-state", handleCallState);
      socket.off("call-incoming", handleCallIncoming);
      socket.off("call-join-request", handleCallJoinRequest);
      socket.off("call-join-response", handleCallJoinResponse);
      socket.off("call-participant-joined", handleParticipantJoined);
      socket.off("call-participant-left", handleParticipantLeft);
      socket.off("webrtc-offer", handleWebRTCOffer);
      socket.off("webrtc-answer", handleWebRTCAnswer);
      socket.off("webrtc-ice-candidate", handleWebRTCIceCandidate);
      socket.off("webrtc-request-offer", handleWebRTCRequestOffer);
      socket.off("call-media-state", handleCallMediaState);
      socket.off("call-moderated", handleCallModerated);
      socket.off("call-ended", handleCallEnded);
      socket.off("error", handleError);
    };
  }, [
    socket,
    getOrCreatePeerConnection,
    getUserMediaStream,
    attachAudioAnalyser,
    resumeAudio,
    cleanupCall,
    runReconcilePeers,
    syncSenders,
  ]);

  // Clean up on unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInCallRef.current && socketRef.current) {
        socketRef.current.emit("call-leave", {
          roomId: roomIdRef.current,
          userId: userIdRef.current,
        });
      }
      cleanupCall();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    callState,
    isInCall,
    isRinging,
    localStream,
    remoteStreams,
    peerDiagnostics,
    micOn,
    cameraOn,
    isDeafened,
    mutedByModerator,
    mutedForMe,
    hiddenVideoForMe,
    speakingUsers,
    incomingCall,
    incomingJoinRequest,
    isPendingJoin,
    audioBlocked,
    setAudioBlocked,
    startCall,
    joinCall,
    leaveCall,
    endCall,
    respondIncomingCall,
    respondJoinRequest,
    toggleMic,
    toggleCamera,
    toggleDeafen,
    toggleMuteForMe,
    toggleHideVideoForMe,
    moderateParticipant,
    changeCallSetting,
    resumeAudio,
  };
}
