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
