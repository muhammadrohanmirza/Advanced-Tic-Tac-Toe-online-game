"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { CallParticipant, CallState, SpectatorCallPermission } from "@/types/game";

export interface PeerDiagnosticInfo {
  connectionState: string;
  iceConnectionState: string;
  signalingState: string;
  audioTracks: number;
  videoTracks: number;
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
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerSendersRef = useRef<Map<string, PeerSenders>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const ignoreOfferRef = useRef<Map<string, boolean>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceRestartAttemptedRef = useRef<Map<string, boolean>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Update Peer Diagnostics for UI
  const updatePeerDiagnostics = useCallback((remoteUid: string, pc: RTCPeerConnection) => {
    setPeerDiagnostics((prev) => {
      const next = new Map(prev);
      const rStream = remoteStreams.get(remoteUid);
      const audioTracks = rStream ? rStream.getAudioTracks().length : 0;
      const videoTracks = rStream ? rStream.getVideoTracks().length : 0;
      next.set(remoteUid, {
        connectionState: pc.connectionState || "new",
        iceConnectionState: pc.iceConnectionState || "new",
        signalingState: pc.signalingState || "stable",
        audioTracks,
        videoTracks,
      });
      return next;
    });
  }, [remoteStreams]);

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
  }, [getAudioContext]);

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

      setSpeakingUsers(activeSpeakers);
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

    // 1. Stop local tracks
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

    // 3. Clear remote streams & diagnostics
    setRemoteStreams(new Map());
    setPeerDiagnostics(new Map());

    // 4. Clear audio analysers
    audioAnalysersRef.current.clear();
    setSpeakingUsers(new Set());

    // 5. Reset states
    isInCallRef.current = false;
    setIsInCall(false);
    setIsRinging(false);
    setMicOn(false);
    setCameraOn(false);
    setMutedByModerator(false);
    setIsPendingJoin(false);
  }, []);

  // Request user media
  const getUserMediaStream = useCallback(
    async (withVideo: boolean): Promise<MediaStream | null> => {
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        toast.error("Voice & video chat requires HTTPS (or localhost).");
        return null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("WebRTC is not supported in this browser.");
        return null;
      }

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

        // Ensure audio tracks are enabled by default
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[WebRTC:Client] getUserMedia success: audioTracks=${stream.getAudioTracks().length}, videoTracks=${stream.getVideoTracks().length}`
          );
        }

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
      }
    },
    []
  );

  // Create an RTCPeerConnection for a remote user (Pre-created Transceivers & Full Mesh)
  const getOrCreatePeerConnection = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      let pc = pcsRef.current.get(remoteUserId);
      if (pc) return pc;

      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Creating RTCPeerConnection for remote peer: ${remoteUserId}`);
      }

      const rtcConfig = getRtcConfig();
      pc = new RTCPeerConnection(rtcConfig);
      pcsRef.current.set(remoteUserId, pc);
      makingOfferRef.current.set(remoteUserId, false);
      ignoreOfferRef.current.set(remoteUserId, false);

      // Pre-create transceivers for audio and video immediately
      // This ensures both audio and video m-lines always exist in the SDP offer/answer
      const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
      const audioSender = audioTransceiver.sender;
      const videoSender = videoTransceiver.sender;
      peerSendersRef.current.set(remoteUserId, { audioSender, videoSender });

      // If local stream already exists, attach current audio and video tracks
      if (localStreamRef.current) {
        const currentAudioTrack = localStreamRef.current.getAudioTracks()[0];
        if (currentAudioTrack && currentAudioTrack.kind === "audio") {
          try {
            audioSender.replaceTrack(currentAudioTrack);
          } catch (err) {
            console.error(`[WebRTC:Client] Initial audio replaceTrack error for ${remoteUserId}:`, err);
          }
        }

        const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (currentVideoTrack && currentVideoTrack.kind === "video" && cameraOn) {
          try {
            videoSender.replaceTrack(currentVideoTrack);
          } catch (err) {
            console.error(`[WebRTC:Client] Initial video replaceTrack error for ${remoteUserId}:`, err);
          }
        }
      }

      // Signaling & Connection state changes
      pc.onsignalingstatechange = () => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[WebRTC:Client] PC (${remoteUserId}) signalingState: ${pc!.signalingState}`);
        }
        updatePeerDiagnostics(remoteUserId, pc!);
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

        setRemoteStreams((prev) => {
          const next = new Map(prev);
          let stream = next.get(remoteUserId);
          if (!stream) {
            stream = new MediaStream();
            next.set(remoteUserId, stream);
          }
          if (!stream.getTracks().some((t) => t.id === track.id)) {
            stream.addTrack(track);
          }
          return new Map(next);
        });

        if (track.kind === "audio") {
          attachAudioAnalyser(remoteUserId, new MediaStream([track]));
        }

        const handleTrackStateChange = () => {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `[WebRTC:Client] Track state changed for ${remoteUserId} (${track.kind}): muted=${track.muted}, readyState=${track.readyState}`
            );
          }
          setRemoteStreams((prev) => new Map(prev));
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
          await pc!.setLocalDescription();
          if (socketRef.current && pc!.localDescription) {
            if (process.env.NODE_ENV !== "production") {
              console.log(
                `[WebRTC:Client] Created and sending offer (type: ${pc!.localDescription.type}) to ${remoteUserId}`
              );
            }
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

      // Dev-only log of full mesh active peer connections
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Active Peer Connections for ${userIdRef.current} (${userNameRef.current}):`,
          Array.from(pcsRef.current.keys())
        );
      }

      return pc;
    },
    [getRtcConfig, cameraOn, attachAudioAnalyser, updatePeerDiagnostics]
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

      const stream = await getUserMediaStream(withVideo);
      if (!stream) return;

      localStreamRef.current = stream;
      setLocalStream(stream);
      isInCallRef.current = true;
      setIsInCall(true);
      setIsRinging(true);

      // Players start with mic enabled by default
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = true;
      setMicOn(true);

      const videoTrack = stream.getVideoTracks()[0];
      setCameraOn(Boolean(videoTrack && withVideo));

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
    [resumeAudio, getUserMediaStream, attachAudioAnalyser]
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

      const stream = await getUserMediaStream(withVideo);
      if (!stream) return;

      localStreamRef.current = stream;
      setLocalStream(stream);
      isInCallRef.current = true;
      setIsInCall(true);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isPlayerRef.current ? true : false;
      }
      setMicOn(isPlayerRef.current ? true : false);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && !isPlayerRef.current) {
        videoTrack.stop();
        stream.removeTrack(videoTrack);
        setCameraOn(false);
      } else {
        setCameraOn(Boolean(videoTrack && withVideo));
      }

      attachAudioAnalyser(userIdRef.current, stream);

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[WebRTC:Client] Emitting call-join-request in room ${roomIdRef.current}`
        );
      }

      socketRef.current.emit("call-join-request", {
        roomId: roomIdRef.current,
        withVideo: isPlayerRef.current ? withVideo : false,
        userId: userIdRef.current,
      });

      // Full mesh: connect to every existing participant in the call
      callState.participants.forEach((p) => {
        if (p.userId !== userIdRef.current) {
          getOrCreatePeerConnection(p.userId);
        }
      });

      toast.success("Joined the call");
    },
    [
      callState.spectatorsAllowed,
      callState.participants,
      resumeAudio,
      getUserMediaStream,
      attachAudioAnalyser,
      getOrCreatePeerConnection,
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

      const stream = await getUserMediaStream(withVideo);
      if (!stream) {
        socketRef.current.emit("call-join-response", {
          roomId: roomIdRef.current,
          requesterId: callerId,
          accepted: false,
          userId: userIdRef.current,
        });
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      isInCallRef.current = true;
      setIsInCall(true);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = true;
      setMicOn(true);

      const videoTrack = stream.getVideoTracks()[0];
      setCameraOn(Boolean(videoTrack && withVideo));

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

      // Full mesh: connect to caller and all existing participants
      getOrCreatePeerConnection(callerId);
      callState.participants.forEach((p) => {
        if (p.userId !== userIdRef.current) {
          getOrCreatePeerConnection(p.userId);
        }
      });

      toast.success("Call connected");
    },
    [
      incomingCall,
      callState.participants,
      resumeAudio,
      getUserMediaStream,
      attachAudioAnalyser,
      getOrCreatePeerConnection,
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
    if (mutedByModerator) {
      toast.error("You are muted by a player and cannot unmute yourself.");
      return;
    }

    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;

    const nextState = !audioTrack.enabled;
    audioTrack.enabled = nextState;
    setMicOn(nextState);

    if (socketRef.current) {
      socketRef.current.emit("call-media-state", {
        roomId: roomIdRef.current,
        micOn: nextState,
        cameraOn,
      });
    }

    toast(nextState ? "Microphone ON" : "Microphone MUTED", {
      icon: nextState ? "🎙️" : "🔇",
    });
  }, [mutedByModerator, cameraOn]);

  // Toggle Camera (Camera ON: getUserMedia + videoSender.replaceTrack; Camera OFF: stop + videoSender.replaceTrack(null))
  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) return;

    if (cameraOn) {
      // Camera OFF: stop video track and replace on every peer's videoSender with null
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current.removeTrack(videoTrack);
      }

      peerSendersRef.current.forEach(({ videoSender }, peerId) => {
        try {
          videoSender.replaceTrack(null);
        } catch (err: any) {
          console.error(`[WebRTC:Client] replaceTrack(null) failed for peer ${peerId}:`, err);
        }
      });

      setCameraOn(false);

      if (socketRef.current) {
        socketRef.current.emit("call-media-state", {
          roomId: roomIdRef.current,
          micOn,
          cameraOn: false,
        });
      }

      toast("Camera turned OFF", { icon: "📷" });
    } else {
      // Camera ON: getUserMedia for video, then for EVERY peer call videoSender.replaceTrack(videoTrack)
      try {
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

        localStreamRef.current.addTrack(newTrack);

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

        setCameraOn(true);

        if (socketRef.current) {
          socketRef.current.emit("call-media-state", {
            roomId: roomIdRef.current,
            micOn,
            cameraOn: true,
          });
        }

        toast("Camera turned ON", { icon: "📹" });
      } catch (err: any) {
        console.error("[WebRTC:Client] Failed to enable camera:", err);
        toast.error(`Could not activate camera: ${err?.message || "error"}`);
      }
    }
  }, [cameraOn, micOn]);

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

        // Full mesh: ensure connections exist for all other participants
        if (localStreamRef.current) {
          state.participants.forEach((p) => {
            if (p.userId !== userIdRef.current && !pcsRef.current.has(p.userId)) {
              getOrCreatePeerConnection(p.userId);
            }
          });
        }

        if (me.mutedByModerator !== mutedByModerator) {
          setMutedByModerator(me.mutedByModerator);
          if (me.mutedByModerator) {
            setMicOn(false);
            if (localStreamRef.current?.getAudioTracks()[0]) {
              localStreamRef.current.getAudioTracks()[0].enabled = false;
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

      const stream = await getUserMediaStream(false);
      if (!stream) return;

      localStreamRef.current = stream;
      setLocalStream(stream);
      isInCallRef.current = true;
      setIsInCall(true);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = false;
      setMicOn(false);
      setCameraOn(false);

      attachAudioAnalyser(userIdRef.current, stream);

      // Full mesh: connect to existing participants
      callState.participants.forEach((p) => {
        if (p.userId !== userIdRef.current) {
          getOrCreatePeerConnection(p.userId);
        }
      });

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

      // If we are in call and another participant joined, establish peer connection to them
      if (isInCallRef.current && data.participant.userId !== userIdRef.current) {
        getOrCreatePeerConnection(data.participant.userId);
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
      }
    };

    // WebRTC Offer
    const handleWebRTCOffer = async (data: { senderId: string; sdp: RTCSessionDescriptionInit }) => {
      const { senderId, sdp } = data;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[WebRTC:Client] Received webrtc-offer from ${senderId} (type: ${sdp?.type})`);
      }

      const pc = getOrCreatePeerConnection(senderId);
      const isPolite = userIdRef.current < senderId;
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

        // Flush queued candidates
        const queued = pendingCandidatesRef.current.get(senderId) || [];
        for (const candidate of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.delete(senderId);

        await pc.setLocalDescription();
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
        }
      } catch (err) {
        console.error(`[WebRTC:Client] Error handling answer from ${senderId}:`, err);
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
        if (data.mutedByModerator && !mutedByModerator) {
          setMutedByModerator(true);
          setMicOn(false);
          if (localStreamRef.current?.getAudioTracks()[0]) {
            localStreamRef.current.getAudioTracks()[0].enabled = false;
          }
          toast.error("You were muted by a player");
        } else if (!data.mutedByModerator && mutedByModerator) {
          setMutedByModerator(false);
          toast.success("A player unmuted your microphone");
        }
      }
    };

    // Moderation event
    const handleCallModerated = (data: { action: "mute" | "unmute" | "remove"; moderatorName: string }) => {
      if (data.action === "mute") {
        setMutedByModerator(true);
        setMicOn(false);
        if (localStreamRef.current?.getAudioTracks()[0]) {
          localStreamRef.current.getAudioTracks()[0].enabled = false;
        }
        toast.error(`You were muted by ${data.moderatorName}`);
      } else if (data.action === "unmute") {
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
      socket.off("call-media-state", handleCallMediaState);
      socket.off("call-moderated", handleCallModerated);
      socket.off("call-ended", handleCallEnded);
      socket.off("error", handleError);
    };
  }, [
    socket,
    mutedByModerator,
    getOrCreatePeerConnection,
    getUserMediaStream,
    attachAudioAnalyser,
    resumeAudio,
    cleanupCall,
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
