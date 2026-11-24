import { z } from "zod";
import { CallParticipant, CallRole, CallState, CallStatus, SpectatorCallSetting } from "@/types/game";

/**
 * Validates which peer initiates the WebRTC offer for a given pair.
 * Rule: The participant who joined the call LATER (higher joinedAt, tie-break: larger userId string)
 * creates and sends the offer to the one who was already there.
 */
export interface ParticipantIdentity {
  userId: string;
  joinedAt: number;
}

export function shouldInitiate(me: ParticipantIdentity, other: ParticipantIdentity): boolean {
  if (me.userId === other.userId) return false;
  if (me.joinedAt > other.joinedAt) return true;
  if (me.joinedAt < other.joinedAt) return false;
  return me.userId > other.userId;
}

/**
 * Calculates whether this peer is "polite" in the WebRTC Perfect Negotiation pattern.
 * Glare handling rule: deterministic comparison of user IDs.
 */
export function isPolitePeer(myUserId: string, otherUserId: string): boolean {
  return myUserId < otherUserId;
}

export interface ReconcileResult {
  toCreate: string[];
  toInitiate: string[];
  toRemove: string[];
}

/**
 * Reconciles call participants to maintain full mesh connectivity for every participant.
 * For N participants, each participant creates N-1 peer connections.
 * Initiator is selected using shouldInitiate(me, other).
 */
export function reconcilePeers(
  myUserId: string,
  participants: CallParticipant[],
  existingPeerUserIds: string[] | Set<string>
): ReconcileResult {
  const existingSet = new Set(existingPeerUserIds);
  const currentParticipantMap = new Map<string, CallParticipant>();

  for (const p of participants) {
    currentParticipantMap.set(p.userId, p);
  }

  const me = currentParticipantMap.get(myUserId);
  const toCreate: string[] = [];
  const toInitiate: string[] = [];
  const toRemove: string[] = [];

  if (!me) {
    existingSet.forEach((uid) => {
      toRemove.push(uid);
    });
    return { toCreate, toInitiate, toRemove };
  }

  for (const p of participants) {
    if (p.userId === myUserId) continue;

    if (!existingSet.has(p.userId)) {
      toCreate.push(p.userId);
      if (shouldInitiate(me, p)) {
        toInitiate.push(p.userId);
      }
    }
  }

  existingSet.forEach((existingId) => {
    if (!currentParticipantMap.has(existingId)) {
      toRemove.push(existingId);
    }
  });

  return { toCreate, toInitiate, toRemove };
}

// Zod Validation Schemas for WebRTC & Call payloads

export const callStartSchema = z.object({
  roomId: z.string().min(1).max(100),
  withVideo: z.boolean().optional(),
  userId: z.string().optional(),
});

export const callCancelSchema = z.object({
  roomId: z.string().min(1).max(100),
  userId: z.string().optional(),
});

export const callJoinRequestSchema = z.object({
  roomId: z.string().min(1).max(100),
  withVideo: z.boolean().optional(),
  userId: z.string().optional(),
});

export const callJoinResponseSchema = z.object({
  roomId: z.string().min(1).max(100),
  requesterId: z.string().min(1).max(100),
  accepted: z.boolean(),
  withVideo: z.boolean().optional(),
  userId: z.string().optional(),
});

export const webrtcOfferSchema = z.object({
  roomId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  sdp: z.object({
    type: z.enum(["offer", "answer", "pranswer", "rollback"]),
    sdp: z.string().max(65536, "SDP too large"),
  }),
});

export const webrtcAnswerSchema = z.object({
  roomId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  sdp: z.object({
    type: z.enum(["offer", "answer", "pranswer", "rollback"]),
    sdp: z.string().max(65536, "SDP too large"),
  }),
});

export const webrtcCandidateSchema = z.object({
  roomId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  candidate: z.object({
    candidate: z.string().max(4096, "Candidate string too large").optional(),
    sdpMid: z.string().max(256).nullable().optional(),
    sdpMLineIndex: z.number().nullable().optional(),
    usernameFragment: z.string().max(256).nullable().optional(),
  }),
});

export const webrtcRequestOfferSchema = z.object({
  roomId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
});

export const callModerateSchema = z.object({
  roomId: z.string().min(1).max(100),
  targetUserId: z.string().min(1).max(100),
  action: z.enum(["mute", "unmute", "remove"]),
});

export const callMediaStateSchema = z.object({
  roomId: z.string().min(1).max(100),
  micOn: z.boolean(),
  cameraOn: z.boolean(),
});

export const callSettingChangeSchema = z
  .object({
    roomId: z.string().min(1).max(100),
    setting: z.enum(["ask", "allow", "off", "Ask", "Allow", "Off"]).optional(),
    spectatorsAllowed: z.enum(["ask", "allow", "off", "Ask", "Allow", "Off"]).optional(),
  })
  .refine((data) => data.setting !== undefined || data.spectatorsAllowed !== undefined, {
    message: "Either setting or spectatorsAllowed must be provided",
  });

/**
 * Setup and configure audio and video transceivers with direction "sendrecv" for a peer connection.
 * Used identically for offerers and answerers, players and spectators.
 */
export interface PeerTransceiversResult {
  audioTransceiver: any;
  videoTransceiver: any;
  audioSender: any;
  videoSender: any;
}

/**
 * Offerer: create transceivers with direction "sendrecv", store senders, attach local audio track.
 */
export function setupOffererTransceivers(
  pc: {
    addTransceiver: (kind: string, init?: { direction: "sendrecv" | "sendonly" | "recvonly" | "inactive" }) => any;
  },
  localAudioTrack?: { kind: string; enabled: boolean } | null,
  localVideoTrack?: { kind: string; enabled: boolean } | null,
  cameraOn: boolean = false
): PeerTransceiversResult {
  const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
  const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });

  if (localAudioTrack && audioTransceiver.sender?.replaceTrack) {
    try {
      audioTransceiver.sender.replaceTrack(localAudioTrack);
    } catch {}
  }

  if (videoTransceiver.sender?.replaceTrack) {
    try {
      videoTransceiver.sender.replaceTrack(cameraOn && localVideoTrack ? localVideoTrack : null);
    } catch {}
  }

  return {
    audioTransceiver,
    videoTransceiver,
    audioSender: audioTransceiver.sender,
    videoSender: videoTransceiver.sender,
  };
}

/**
 * Answerer: after setRemoteDescription(offer) and BEFORE createAnswer,
 * loop pc.getTransceivers(), match by kind, set direction = "sendrecv",
 * replaceTrack with local tracks, and store senders without creating extra transceivers.
 */
export function setupAnswererTransceivers(
  pc: {
    getTransceivers: () => any[];
  },
  localAudioTrack?: { kind: string; enabled: boolean } | null,
  localVideoTrack?: { kind: string; enabled: boolean } | null,
  cameraOn: boolean = false
): PeerTransceiversResult {
  const transceivers = pc.getTransceivers ? pc.getTransceivers() : [];
  let audioTransceiver: any = null;
  let videoTransceiver: any = null;
  let audioSender: any = null;
  let videoSender: any = null;

  for (const t of transceivers) {
    t.direction = "sendrecv";
    const kind = t.receiver?.track?.kind || (t as any).kind;
    if (kind === "audio") {
      audioTransceiver = t;
      audioSender = t.sender;
      if (localAudioTrack && t.sender?.replaceTrack) {
        try {
          t.sender.replaceTrack(localAudioTrack);
        } catch {}
      }
    } else if (kind === "video") {
      videoTransceiver = t;
      videoSender = t.sender;
      if (t.sender?.replaceTrack) {
        try {
          t.sender.replaceTrack(cameraOn && localVideoTrack ? localVideoTrack : null);
        } catch {}
      }
    }
  }

  return {
    audioTransceiver,
    videoTransceiver,
    audioSender,
    videoSender,
  };
}

export function setupPeerTransceivers(
  pc: any,
  localAudioTrack?: { kind: string; enabled: boolean } | null,
  localVideoTrack?: { kind: string; enabled: boolean } | null,
  cameraOn: boolean = false
): PeerTransceiversResult {
  if (pc.getTransceivers && pc.getTransceivers().length > 0) {
    return setupAnswererTransceivers(pc, localAudioTrack, localVideoTrack, cameraOn);
  }
  return setupOffererTransceivers(pc, localAudioTrack, localVideoTrack, cameraOn);
}

/**
 * Extracts SDP media section directions (a=sendrecv, a=recvonly, etc.) without exposing SDP content.
 */
export function extractSdpDirections(sdp?: string): { audioDirection: string; videoDirection: string } {
  let audioDirection = "unknown";
  let videoDirection = "unknown";
  if (!sdp) return { audioDirection, videoDirection };

  let currentSection: "audio" | "video" | "other" = "other";
  const lines = sdp.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith("m=audio")) {
      currentSection = "audio";
    } else if (line.startsWith("m=video")) {
      currentSection = "video";
    } else if (line.startsWith("m=")) {
      currentSection = "other";
    }

    if (line === "a=sendrecv" || line === "a=recvonly" || line === "a=sendonly" || line === "a=inactive") {
      if (currentSection === "audio" && audioDirection === "unknown") {
        audioDirection = line.replace("a=", "");
      } else if (currentSection === "video" && videoDirection === "unknown") {
        videoDirection = line.replace("a=", "");
      }
    }
  }
  return { audioDirection, videoDirection };
}

/**
 * Development-only logger for WebRTC negotiation results without exposing SDP contents or ICE candidates.
 */
export function logPeerNegotiation(
  peerId: string,
  pc: { getTransceivers: () => any[] },
  type: "offer" | "answer",
  sdp?: string,
  remoteStream?: any
) {
  if (process.env.NODE_ENV === "production") return;

  const transceivers = (pc.getTransceivers ? pc.getTransceivers() : []).map((t: any) => ({
    kind: t.receiver?.track?.kind || "unknown",
    direction: t.direction,
    currentDirection: t.currentDirection,
    senderTrackKind: t.sender?.track?.kind || null,
    senderTrackEnabled: t.sender?.track?.enabled ?? null,
  }));

  const { audioDirection, videoDirection } = extractSdpDirections(sdp);
  const rAudioTracks = remoteStream?.getAudioTracks ? remoteStream.getAudioTracks().length : 0;

  console.log(`[WebRTC:NegotiationLog] Peer ${peerId} (${type}):`, {
    sdpMediaDirections: { audio: audioDirection, video: videoDirection },
    remoteAudioTrackCount: rAudioTracks,
    transceivers,
  });
}

