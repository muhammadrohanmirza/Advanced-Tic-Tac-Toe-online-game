import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { roomManager } from "../server/roomManager";
import {
  shouldInitiate,
  isPolitePeer,
  callStartSchema,
  callCancelSchema,
  callJoinRequestSchema,
  callJoinResponseSchema,
  webrtcOfferSchema,
  webrtcAnswerSchema,
  webrtcCandidateSchema,
  webrtcRequestOfferSchema,
  callModerateSchema,
  callMediaStateSchema,
  callSettingChangeSchema,
} from "./webrtc";

describe("WebRTC Voice & Video Call Architecture - Phase 1 Server Call State & Signaling", () => {
  let roomId: string;
  const p1 = { id: "player-1", name: "Alice", socketId: "sock-1", symbol: "X" as const };
  const p2 = { id: "player-2", name: "Bob", socketId: "sock-2", symbol: "O" as const };
  const spec1 = { id: "spec-1", name: "Charlie", socketId: "sock-3" };
  const spec2 = { id: "spec-2", name: "Dave", socketId: "sock-4" };

  beforeEach(() => {
    const room = roomManager.createRoom(p1, true);
    roomManager.joinRoom(room.id, p2);
    roomManager.addSpectator(room.id, spec1);
    roomManager.addSpectator(room.id, spec2);
    roomId = room.id;
  });

  describe("Call Lifecycle: Start, Accept, Decline, Cancel, Timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("starts call in ringing state with caller as sole participant", () => {
      const res = roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, true);
      expect(res.error).toBeUndefined();
      expect(res.callState?.status).toBe("ringing");
      expect(res.callState?.active).toBe(false);
      expect(res.callState?.startedBy).toBe(p1.id);
      expect(res.callState?.withVideo).toBe(true);
      expect(res.callState?.participants).toHaveLength(1);
      expect(res.participant?.userId).toBe(p1.id);
      expect(res.participant?.micOn).toBe(true);
      expect(res.participant?.cameraOn).toBe(true);
    });

    it("prevents spectators from starting a call", () => {
      const res = roomManager.startCall(roomId, spec1.id, spec1.name, spec1.socketId, false);
      expect(res.error).toBe("Only players can start a call");
      expect(res.participant).toBeUndefined();
    });

    it("transitions from ringing to active when callee accepts the call", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, true);

      const acceptRes = roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, true);
      expect(acceptRes.error).toBeUndefined();
      expect(acceptRes.callState?.status).toBe("active");
      expect(acceptRes.callState?.active).toBe(true);
      expect(acceptRes.callState?.participants).toHaveLength(2);
      expect(acceptRes.participant?.role).toBe("player");
      expect(acceptRes.participant?.micOn).toBe(true);
      expect(acceptRes.participant?.cameraOn).toBe(true);
    });

    it("resets to idle when callee declines the call", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      const endState = roomManager.endCall(roomId);

      expect(endState?.status).toBe("idle");
      expect(endState?.active).toBe(false);
      expect(endState?.participants).toHaveLength(0);
    });

    it("resets to idle when caller cancels the ringing call", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);

      const cancelRes = roomManager.cancelCall(roomId, p1.id);
      expect(cancelRes.cancelled).toBe(true);
      expect(cancelRes.callState?.status).toBe("idle");
      expect(cancelRes.callState?.active).toBe(false);
      expect(cancelRes.callState?.participants).toHaveLength(0);
    });

    it("prevents non-callers from cancelling a ringing call", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);

      const cancelRes = roomManager.cancelCall(roomId, p2.id);
      expect(cancelRes.cancelled).toBe(false);
      expect(cancelRes.error).toBe("Only the caller can cancel the call");
    });

    it("times out ringing call after 30 seconds and resets to idle", () => {
      let timeoutFired = false;
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false, () => {
        timeoutFired = true;
      });

      const ringingState = roomManager.getCallState(roomId);
      expect(ringingState?.status).toBe("ringing");

      // Advance timers by 30 seconds
      vi.advanceTimersByTime(30000);

      expect(timeoutFired).toBe(true);
      const stateAfterTimeout = roomManager.getCallState(roomId);
      expect(stateAfterTimeout?.status).toBe("idle");
      expect(stateAfterTimeout?.active).toBe(false);
      expect(stateAfterTimeout?.participants).toHaveLength(0);
    });
  });

  describe("Spectator Call Settings (Ask / Allow / Off)", () => {
    it("initializes default setting as 'ask'", () => {
      const state = roomManager.getCallState(roomId);
      expect(state?.spectatorCallSetting).toBe("ask");
    });

    it("allows the host to update the spectator call setting", () => {
      const state1 = roomManager.setCallSetting(roomId, "allow");
      expect(state1?.spectatorCallSetting).toBe("allow");

      const state2 = roomManager.setCallSetting(roomId, "off");
      expect(state2?.spectatorCallSetting).toBe("off");

      const state3 = roomManager.setCallSetting(roomId, "ask");
      expect(state3?.spectatorCallSetting).toBe("ask");
    });

    it("joins spectators muted with camera off by default", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, false);

      const res = roomManager.addCallParticipant(roomId, spec1.id, spec1.name, spec1.socketId, true);
      expect(res.participant?.role).toBe("spectator");
      expect(res.participant?.micOn).toBe(false);
      expect(res.participant?.cameraOn).toBe(false);
    });
  });

  describe("Call Capacity Limits (MAX_CALL_PARTICIPANTS)", () => {
    it("enforces max participant limit (default 6) and rejects additional joiners", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, false);

      // Add 4 more participants to reach 6 total
      for (let i = 1; i <= 4; i++) {
        const u = { id: `user-extra-${i}`, name: `User ${i}`, socketId: `sock-extra-${i}` };
        roomManager.addSpectator(roomId, u);
        const res = roomManager.addCallParticipant(roomId, u.id, u.name, u.socketId, false);
        expect(res.error).toBeUndefined();
      }

      const state = roomManager.getCallState(roomId);
      expect(state?.participants).toHaveLength(6);

      // 7th participant attempt
      const u7 = { id: "user-extra-7", name: "User 7", socketId: "sock-extra-7" };
      roomManager.addSpectator(roomId, u7);
      const res7 = roomManager.addCallParticipant(roomId, u7.id, u7.name, u7.socketId, false);
      expect(res7.error).toBe("Call is full");
    });
  });

  describe("Leave Rule (2+ Continues, <= 1 Terminates)", () => {
    it("keeps call active when a participant leaves if 2 or more participants remain, even if players leave", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      roomManager.addCallParticipant(roomId, spec1.id, spec1.name, spec1.socketId, false);
      roomManager.addCallParticipant(roomId, spec2.id, spec2.name, spec2.socketId, false);

      // 3 participants in call (1 player, 2 spectators). p1 (player) leaves.
      const res1 = roomManager.removeCallParticipant(roomId, p1.id);
      expect(res1.callEnded).toBe(false);

      const state1 = roomManager.getCallState(roomId);
      expect(state1?.status).toBe("active");
      expect(state1?.active).toBe(true);
      expect(state1?.participants).toHaveLength(2);
      expect(state1?.participants.map((p) => p.userId)).toEqual([spec1.id, spec2.id]);

      // Now spec1 leaves, leaving only 1 participant (spec2). Call must end automatically.
      const res2 = roomManager.removeCallParticipant(roomId, spec1.id);
      expect(res2.callEnded).toBe(true);

      const state2 = roomManager.getCallState(roomId);
      expect(state2?.status).toBe("idle");
      expect(state2?.active).toBe(false);
      expect(state2?.participants).toHaveLength(0);
    });

    it("ends call automatically when 1 or 0 participants remain in 2-person call", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, false);

      const res = roomManager.removeCallParticipant(roomId, p1.id);
      expect(res.callEnded).toBe(true);

      const state = roomManager.getCallState(roomId);
      expect(state?.status).toBe("idle");
      expect(state?.active).toBe(false);
      expect(state?.participants).toHaveLength(0);
    });

    it("handles idempotent re-join with new socket without duplicating participants", () => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, false);

      // User 2 opens another tab with sock-2-tab2
      const rejoinRes = roomManager.addCallParticipant(roomId, p2.id, p2.name, "sock-2-tab2", false);
      expect(rejoinRes.callState?.participants).toHaveLength(2);
      expect(rejoinRes.participant?.socketId).toBe("sock-2-tab2");
    });
  });

  describe("Moderation Rules", () => {
    beforeEach(() => {
      roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      roomManager.addCallParticipant(roomId, spec1.id, spec1.name, spec1.socketId, false);
    });

    it("allows a player to mute a spectator and prevents spectator self-unmute", () => {
      // 1. Moderate mute
      const modRes = roomManager.moderateCallParticipant(roomId, p1.id, spec1.id, "mute");
      expect(modRes.success).toBe(true);
      expect(modRes.participant?.mutedByModerator).toBe(true);
      expect(modRes.participant?.micOn).toBe(false);

      // 2. Spectator attempts self-unmute -> server overrides micOn = false
      const updateRes = roomManager.updateCallMediaState(roomId, spec1.id, true, false);
      expect(updateRes?.micOn).toBe(false);
      expect(updateRes?.mutedByModerator).toBe(true);

      // 3. Player un-mutes spectator
      const unmuteRes = roomManager.moderateCallParticipant(roomId, p1.id, spec1.id, "unmute");
      expect(unmuteRes.success).toBe(true);
      expect(unmuteRes.participant?.mutedByModerator).toBe(false);

      // 4. Spectator can now unmute
      const updateRes2 = roomManager.updateCallMediaState(roomId, spec1.id, true, false);
      expect(updateRes2?.micOn).toBe(true);
    });

    it("allows a player to remove a spectator and blocks removed spectator from rejoining", () => {
      const removeRes = roomManager.moderateCallParticipant(roomId, p1.id, spec1.id, "remove");
      expect(removeRes.success).toBe(true);
      expect(removeRes.action).toBe("remove");

      const state = roomManager.getCallState(roomId);
      expect(state?.participants.find((p) => p.userId === spec1.id)).toBeUndefined();

      // Attempt to rejoin
      const rejoinRes = roomManager.addCallParticipant(roomId, spec1.id, spec1.name, spec1.socketId, false);
      expect(rejoinRes.error).toBe("You have been removed from this call by a player");
    });

    it("rejects moderation actions by non-players", () => {
      const res = roomManager.moderateCallParticipant(roomId, spec1.id, spec2.id, "mute");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Only players can moderate call participants");
    });
  });

  describe("shouldInitiate Rule (CORE DESIGN Item 2)", () => {
    it("determines initiator based on who joined LATER (higher joinedAt)", () => {
      const earlierPeer = { userId: "user-alice", joinedAt: 1000 };
      const laterPeer = { userId: "user-bob", joinedAt: 2000 };

      // Later peer initiates
      expect(shouldInitiate(laterPeer, earlierPeer)).toBe(true);
      // Earlier peer does not initiate
      expect(shouldInitiate(earlierPeer, laterPeer)).toBe(false);
    });

    it("tie-breaks by larger userId string when joinedAt timestamps are identical", () => {
      const peerA = { userId: "user-100", joinedAt: 5000 };
      const peerB = { userId: "user-200", joinedAt: 5000 };

      // "user-200" > "user-100", so peerB initiates
      expect(shouldInitiate(peerB, peerA)).toBe(true);
      expect(shouldInitiate(peerA, peerB)).toBe(false);
    });

    it("is strictly symmetric and mutually exclusive for any distinct pair", () => {
      const pairs: [string, number, string, number][] = [
        ["alice", 100, "bob", 200],
        ["charlie", 300, "dave", 300],
        ["zebra", 50, "apple", 50],
        ["user-x", 9999, "user-y", 1111],
      ];

      for (const [id1, t1, id2, t2] of pairs) {
        const pA = { userId: id1, joinedAt: t1 };
        const pB = { userId: id2, joinedAt: t2 };

        const aStarts = shouldInitiate(pA, pB);
        const bStarts = shouldInitiate(pB, pA);

        // Exactly one peer initiates
        expect(aStarts !== bStarts).toBe(true);
        expect(Number(aStarts) + Number(bStarts)).toBe(1);
      }
    });

    it("returns false when comparing a peer to itself", () => {
      const selfPeer = { userId: "user-alice", joinedAt: 1000 };
      expect(shouldInitiate(selfPeer, selfPeer)).toBe(false);
    });

    it("calculates deterministic polite peer for glare handling", () => {
      expect(isPolitePeer("alice", "bob")).toBe(true);
      expect(isPolitePeer("bob", "alice")).toBe(false);
    });
  });

  describe("Zod Payload Validation", () => {
    it("validates SDP payload and rejects oversized SDP (> 64KB)", () => {
      const valid = webrtcOfferSchema.safeParse({
        roomId: "test-room",
        targetUserId: "user-2",
        sdp: { type: "offer", sdp: "v=0\r\no=alice..." },
      });
      expect(valid.success).toBe(true);

      const hugeSdp = "x".repeat(70000);
      const invalid = webrtcOfferSchema.safeParse({
        roomId: "test-room",
        targetUserId: "user-2",
        sdp: { type: "offer", sdp: hugeSdp },
      });
      expect(invalid.success).toBe(false);
    });

    it("validates ICE candidate and rejects oversized candidate strings (> 4KB)", () => {
      const valid = webrtcCandidateSchema.safeParse({
        roomId: "test-room",
        targetUserId: "user-2",
        candidate: { candidate: "candidate:1 1 UDP 2130706431 192.168.1.1 5000 typ host", sdpMLineIndex: 0 },
      });
      expect(valid.success).toBe(true);

      const hugeCandidate = "c".repeat(5000);
      const invalid = webrtcCandidateSchema.safeParse({
        roomId: "test-room",
        targetUserId: "user-2",
        candidate: { candidate: hugeCandidate },
      });
      expect(invalid.success).toBe(false);
    });

    it("validates webrtc-request-offer schema", () => {
      const valid = webrtcRequestOfferSchema.safeParse({
        roomId: "room-123",
        targetUserId: "target-456",
      });
      expect(valid.success).toBe(true);

      const invalid = webrtcRequestOfferSchema.safeParse({
        roomId: "",
        targetUserId: "target-456",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates call-start, call-cancel, and call-join-response schemas", () => {
      expect(callStartSchema.safeParse({ roomId: "r1", withVideo: true }).success).toBe(true);
      expect(callCancelSchema.safeParse({ roomId: "r1" }).success).toBe(true);
      expect(callJoinRequestSchema.safeParse({ roomId: "r1", withVideo: false }).success).toBe(true);
      expect(callJoinResponseSchema.safeParse({ roomId: "r1", requesterId: "u1", accepted: true }).success).toBe(true);
      expect(callModerateSchema.safeParse({ roomId: "r1", targetUserId: "u2", action: "mute" }).success).toBe(true);
      expect(callMediaStateSchema.safeParse({ roomId: "r1", micOn: true, cameraOn: false }).success).toBe(true);
      expect(callSettingChangeSchema.safeParse({ roomId: "r1", setting: "allow" }).success).toBe(true);
      expect(callSettingChangeSchema.safeParse({ roomId: "r1", spectatorsAllowed: "off" }).success).toBe(true);
    });
  });
});
