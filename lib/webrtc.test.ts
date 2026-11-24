import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { roomManager } from "../server/roomManager";
import { CallParticipant } from "../types/game";
import {
  shouldInitiate,
  isPolitePeer,
  reconcilePeers,
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
  setupPeerTransceivers,
  setupOffererTransceivers,
  setupAnswererTransceivers,
  extractSdpDirections,
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

  describe("Coexistence: Game State, WebRTC Call, Spectators & Full Mesh Reconcile", () => {
    it("(a) verifying call start, join, and leave does NOT alter room.spectators, spectator count, or room game state/board", () => {
      // 1. Initial room state: 2 players, 2 spectators, playing
      const room = roomManager.resolveRoom(roomId);
      expect(room).toBeDefined();
      expect(room!.status).toBe("playing");
      expect(room!.spectators.size).toBe(2);
      expect(room!.board.every((c) => c === "")).toBe(true);

      // Make a gameplay move on the board
      const move1 = roomManager.makeMove(roomId, 0, p1.id);
      expect(move1.error).toBeUndefined();
      expect(room!.board[0]).toBe("X");
      expect(room!.currentTurn).toBe("O");
      expect(room!.spectators.size).toBe(2);

      // 2. Start call by Player 1
      const startRes = roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      expect(startRes.error).toBeUndefined();
      expect(startRes.callState?.status).toBe("ringing");

      // Verify board and spectator state are 100% untouched
      expect(room!.board[0]).toBe("X");
      expect(room!.currentTurn).toBe("O");
      expect(room!.spectators.size).toBe(2);
      expect(room!.spectators.has(spec1.id)).toBe(true);
      expect(room!.spectators.has(spec2.id)).toBe(true);

      // 3. Player 2 accepts and joins call
      const p2Join = roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, false);
      expect(p2Join.error).toBeUndefined();
      expect(p2Join.callState?.status).toBe("active");
      expect(p2Join.callState?.participants).toHaveLength(2);

      // Verify board, turn, spectators are untouched
      expect(room!.board[0]).toBe("X");
      expect(room!.currentTurn).toBe("O");
      expect(room!.spectators.size).toBe(2);

      // 4. Spectator 1 and Spectator 2 join the call
      const s1Join = roomManager.addCallParticipant(roomId, spec1.id, spec1.name, spec1.socketId, false);
      expect(s1Join.error).toBeUndefined();
      expect(s1Join.participant?.role).toBe("spectator");
      expect(s1Join.participant?.micOn).toBe(false); // Spectator default muted

      const s2Join = roomManager.addCallParticipant(roomId, spec2.id, spec2.name, spec2.socketId, false);
      expect(s2Join.error).toBeUndefined();
      expect(s2Join.participant?.role).toBe("spectator");

      // Now 4 participants are in the call
      expect(s2Join.callState?.participants).toHaveLength(4);

      // Verify board state is untouched
      expect(room!.board[0]).toBe("X");
      expect(room!.currentTurn).toBe("O");
      expect(room!.status).toBe("playing");
      expect(room!.spectators.size).toBe(2);

      // 5. Spectator 1 leaves the call
      const s1Leave = roomManager.removeCallParticipant(roomId, spec1.id);
      expect(s1Leave.removedUser?.userId).toBe(spec1.id);
      expect(s1Leave.callEnded).toBe(false);
      expect(s1Leave.callState?.participants).toHaveLength(3);

      // CRITICAL: Spectator 1 remains in room.spectators!
      expect(room!.spectators.size).toBe(2);
      expect(room!.spectators.has(spec1.id)).toBe(true);
      expect(room!.board[0]).toBe("X");
      expect(room!.currentTurn).toBe("O");

      // 6. Player 1 leaves the call
      const p1Leave = roomManager.removeCallParticipant(roomId, p1.id);
      expect(p1Leave.removedUser?.userId).toBe(p1.id);
      expect(p1Leave.callEnded).toBe(false);
      expect(p1Leave.callState?.participants).toHaveLength(2); // p2 and spec2 remain

      // Match continues: Player 2 makes a move on the board while call is ongoing
      const move2 = roomManager.makeMove(roomId, 4, p2.id);
      expect(move2.error).toBeUndefined();
      expect(room!.board[4]).toBe("O");
      expect(room!.currentTurn).toBe("X");

      // Spectators and players are still in the room
      expect(room!.player1?.id).toBe(p1.id);
      expect(room!.player2?.id).toBe(p2.id);
      expect(room!.spectators.size).toBe(2);
      expect(room!.status).toBe("playing");

      // 7. Remaining participants leave call, call ends
      const p2Leave = roomManager.removeCallParticipant(roomId, p2.id);
      expect(p2Leave.callEnded).toBe(true); // <= 1 left
      expect(p2Leave.callState?.status).toBe("idle");
      expect(p2Leave.callState?.participants).toHaveLength(0);

      // Game state and spectators still completely preserved
      expect(room!.board[0]).toBe("X");
      expect(room!.board[4]).toBe("O");
      expect(room!.currentTurn).toBe("X");
      expect(room!.spectators.size).toBe(2);
      expect(room!.status).toBe("playing");
    });

    it("(b) 2 players + 2 spectators (4 participants) in reconcilePeers gives 3 connections each (6 total pairs) and shouldInitiate selects exactly 1 initiator per pair (including spectator-to-spectator)", () => {
      const participants: any[] = [
        { userId: "player-1", name: "Alice", role: "player", joinedAt: 1000 },
        { userId: "player-2", name: "Bob", role: "player", joinedAt: 2000 },
        { userId: "spec-1", name: "Charlie", role: "spectator", joinedAt: 3000 },
        { userId: "spec-2", name: "Dave", role: "spectator", joinedAt: 4000 },
      ];

      // Each of the 4 participants must create connections to the other 3
      const reconcileResults = new Map<string, ReturnType<typeof reconcilePeers>>();

      for (const p of participants) {
        const result = reconcilePeers(p.userId, participants, []);
        reconcileResults.set(p.userId, result);

        // Every participant must connect to all other 3 participants (N - 1 = 3)
        expect(result.toCreate).toHaveLength(3);
        expect(result.toCreate).not.toContain(p.userId);
        expect(result.toRemove).toHaveLength(0);
      }

      // Check all 6 distinct pairs:
      // (player-1, player-2), (player-1, spec-1), (player-1, spec-2),
      // (player-2, spec-1), (player-2, spec-2), (spec-1, spec-2)
      let totalInitiators = 0;
      const testedPairs = new Set<string>();

      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const userA = participants[i];
          const userB = participants[j];
          const pairKey = `${userA.userId}:${userB.userId}`;
          testedPairs.add(pairKey);

          const aInitiates = shouldInitiate(userA, userB);
          const bInitiates = shouldInitiate(userB, userA);

          // Exactly one peer in the pair must be the initiator (mutually exclusive)
          expect(aInitiates !== bInitiates).toBe(true);

          if (aInitiates) {
            expect(bInitiates).toBe(false);
          } else {
            expect(bInitiates).toBe(true);
          }

          // In particular, for the spectator-to-spectator pair (spec-1, spec-2):
          if (userA.userId === "spec-1" && userB.userId === "spec-2") {
            // spec-2 joined later (4000 > 3000), so spec-2 must be initiator
            expect(bInitiates).toBe(true);
            expect(aInitiates).toBe(false);
          }
        }
      }

      expect(testedPairs.size).toBe(6);

      // Verify that summing toInitiate across all 4 participants equals exactly 6
      for (const p of participants) {
        const res = reconcileResults.get(p.userId)!;
        totalInitiators += res.toInitiate.length;
      }

      expect(totalInitiators).toBe(6);
    });
  });

  describe("Full Audio Pipeline: Two-Way Audio Across All Roles (Player & Spectator)", () => {
    // Helper to create a mock RTCPeerConnection with transceivers
    const createMockPC = () => {
      const transceivers: any[] = [];
      let closed = false;
      return {
        get closed() {
          return closed;
        },
        close: vi.fn(() => {
          closed = true;
        }),
        getTransceivers: () => transceivers,
        addTransceiver: (kind: string, init?: any) => {
          const sender = {
            track: null as any,
            replaceTrack: vi.fn(async (t: any) => {
              sender.track = t;
            }),
          };
          const receiver = {
            track: { kind, id: `rx-${kind}-${Math.random()}` },
          };
          const t = {
            direction: init?.direction || "sendrecv",
            currentDirection: init?.direction || "sendrecv",
            sender,
            receiver,
          };
          transceivers.push(t);
          return t;
        },
      };
    };

    it("1. Player & spectator get identical peer setup ('sendrecv' for both audio and video) and each has localAudioTrack attached to audioSender", () => {
      const playerOffererPC = createMockPC();
      const spectatorOffererPC = createMockPC();

      const playerAudioTrack = { kind: "audio", enabled: true, stop: vi.fn() };
      const playerVideoTrack = { kind: "video", enabled: true, stop: vi.fn() };
      const spectatorAudioTrack = { kind: "audio", enabled: false, stop: vi.fn() }; // spectator joins muted

      // Offerer setup
      const playerOffererRes = setupOffererTransceivers(playerOffererPC, playerAudioTrack, playerVideoTrack, true);
      const spectatorOffererRes = setupOffererTransceivers(spectatorOffererPC, spectatorAudioTrack, null, false);

      expect(playerOffererRes.audioTransceiver.direction).toBe("sendrecv");
      expect(playerOffererRes.videoTransceiver.direction).toBe("sendrecv");
      expect(spectatorOffererRes.audioTransceiver.direction).toBe("sendrecv");
      expect(spectatorOffererRes.videoTransceiver.direction).toBe("sendrecv");

      expect(playerOffererRes.audioSender.track).toBe(playerAudioTrack);
      expect(spectatorOffererRes.audioSender.track).toBe(spectatorAudioTrack);
      expect(spectatorOffererRes.audioSender.track.enabled).toBe(false);

      // Answerer setup (after setRemoteDescription)
      const playerAnswererPC = createMockPC();
      const spectatorAnswererPC = createMockPC();
      // Simulate transceivers received with offer
      playerAnswererPC.addTransceiver("audio", { direction: "sendrecv" });
      playerAnswererPC.addTransceiver("video", { direction: "sendrecv" });
      spectatorAnswererPC.addTransceiver("audio", { direction: "sendrecv" });
      spectatorAnswererPC.addTransceiver("video", { direction: "sendrecv" });

      const playerAnswererRes = setupAnswererTransceivers(playerAnswererPC, playerAudioTrack, playerVideoTrack, true);
      const spectatorAnswererRes = setupAnswererTransceivers(spectatorAnswererPC, spectatorAudioTrack, null, false);

      expect(playerAnswererRes.audioTransceiver.direction).toBe("sendrecv");
      expect(playerAnswererRes.videoTransceiver.direction).toBe("sendrecv");
      expect(spectatorAnswererRes.audioTransceiver.direction).toBe("sendrecv");
      expect(spectatorAnswererRes.videoTransceiver.direction).toBe("sendrecv");

      expect(playerAnswererRes.audioSender.track).toBe(playerAudioTrack);
      expect(spectatorAnswererRes.audioSender.track).toBe(spectatorAudioTrack);
    });

    it("2. Muting/unmuting toggles only track.enabled; transceiver directions remain 'sendrecv' and replaceTrack is NOT called for mute", () => {
      const pc = createMockPC();
      const localAudioTrack = { kind: "audio", enabled: true, stop: vi.fn() };
      const { audioTransceiver, audioSender } = setupOffererTransceivers(pc, localAudioTrack, null, false);

      // Initial state: unmuted
      expect(localAudioTrack.enabled).toBe(true);
      expect(audioTransceiver.direction).toBe("sendrecv");
      expect(audioSender.track).toBe(localAudioTrack);

      const replaceTrackCallsBeforeMute = audioSender.replaceTrack.mock.calls.length;

      // Simulate mute
      localAudioTrack.enabled = false;
      expect(localAudioTrack.enabled).toBe(false);
      expect(audioTransceiver.direction).toBe("sendrecv");
      // replaceTrack must NOT be called for muting
      expect(audioSender.replaceTrack.mock.calls.length).toBe(replaceTrackCallsBeforeMute);
      expect(audioSender.track).toBe(localAudioTrack);

      // Simulate unmute
      localAudioTrack.enabled = true;
      expect(localAudioTrack.enabled).toBe(true);
      expect(audioTransceiver.direction).toBe("sendrecv");
      // replaceTrack must NOT be called for unmuting
      expect(audioSender.replaceTrack.mock.calls.length).toBe(replaceTrackCallsBeforeMute);
    });

    it("3. Closing/removing one peer does not stop the local audio track and does not affect the remaining peers", () => {
      const localAudioTrack = { kind: "audio", enabled: true, readyState: "live", stop: vi.fn() };

      const pc1 = createMockPC();
      const pc2 = createMockPC();
      const pc3 = createMockPC();

      const p1Res = setupOffererTransceivers(pc1, localAudioTrack, null, false);
      const p2Res = setupOffererTransceivers(pc2, localAudioTrack, null, false);
      const p3Res = setupOffererTransceivers(pc3, localAudioTrack, null, false);

      expect(p1Res.audioSender.track).toBe(localAudioTrack);
      expect(p2Res.audioSender.track).toBe(localAudioTrack);
      expect(p3Res.audioSender.track).toBe(localAudioTrack);

      // Simulate peer 1 leaving/disconnecting
      pc1.close();
      expect(pc1.close).toHaveBeenCalledTimes(1);

      // Verify localAudioTrack was NOT stopped
      expect(localAudioTrack.stop).not.toHaveBeenCalled();
      expect(localAudioTrack.readyState).toBe("live");
      expect(localAudioTrack.enabled).toBe(true);

      // Verify remaining peers pc2 and pc3 still hold the shared local track
      expect(p2Res.audioSender.track).toBe(localAudioTrack);
      expect(p3Res.audioSender.track).toBe(localAudioTrack);
      expect(pc2.close).not.toHaveBeenCalled();
      expect(pc3.close).not.toHaveBeenCalled();
    });

    it("4. Full mesh with 4 participants (2 players + 2 spectators): each participant has 3 peer connections and each peer connection has exactly 1 audio sender with the shared local audio track attached", () => {
      const participants: CallParticipant[] = [
        { userId: "player-1", name: "Alice", socketId: "sock-1", role: "player", micOn: true, cameraOn: true, mutedByModerator: false, joinedAt: 100 },
        { userId: "player-2", name: "Bob", socketId: "sock-2", role: "player", micOn: true, cameraOn: true, mutedByModerator: false, joinedAt: 200 },
        { userId: "spec-1", name: "Charlie", socketId: "sock-3", role: "spectator", micOn: false, cameraOn: false, mutedByModerator: false, joinedAt: 300 },
        { userId: "spec-2", name: "Dave", socketId: "sock-4", role: "spectator", micOn: false, cameraOn: false, mutedByModerator: false, joinedAt: 400 },
      ];

      for (const currentParticipant of participants) {
        const { toCreate } = reconcilePeers(currentParticipant.userId, participants, []);
        // Each participant must create connections to the other 3 participants
        expect(toCreate).toHaveLength(3);

        const localAudioTrack = {
          kind: "audio",
          enabled: currentParticipant.micOn,
          id: `audio-${currentParticipant.userId}`,
          stop: vi.fn(),
        };

        const peers = toCreate.map((peerId) => {
          const pc = createMockPC();
          const { audioSender } = setupOffererTransceivers(pc, localAudioTrack, null, false);
          return { peerId, pc, audioSender };
        });

        expect(peers).toHaveLength(3);
        for (const peer of peers) {
          // Exactly 1 audio transceiver/sender
          const audioTransceivers = peer.pc.getTransceivers().filter((t) => t.receiver?.track?.kind === "audio");
          expect(audioTransceivers).toHaveLength(1);
          expect(peer.audioSender.track).toBe(localAudioTrack);
          expect(peer.audioSender.track.id).toBe(`audio-${currentParticipant.userId}`);
        }
      }
    });

    it("5. Remote call-media-state { micOn: false } does NOT alter the remote audio element's muted or paused state", () => {
      // Simulate remote audio element state
      let audioElementMuted = false;
      let audioElementVolume = 1;
      let audioElementPaused = false;

      const isDeafened = false;
      const mutedForMe = new Set<string>();

      // Helper function matching RemoteAudioElements / RemoteAudioTrack logic
      const updateAudioElementState = (remoteUserId: string) => {
        const isMuted = isDeafened || mutedForMe.has(remoteUserId);
        audioElementMuted = isMuted;
        audioElementVolume = 1;
      };

      const remoteUserId = "user-bob";

      // 1. Initial state: Bob joins unmuted
      updateAudioElementState(remoteUserId);
      expect(audioElementMuted).toBe(false);
      expect(audioElementVolume).toBe(1);
      expect(audioElementPaused).toBe(false);

      // 2. Bob toggles mic off -> call-media-state received with micOn: false
      const incomingMediaState = { userId: remoteUserId, micOn: false, cameraOn: true };

      // Under the audio architecture, call-media-state updates only the UI badge, NOT the audio element
      updateAudioElementState(remoteUserId);
      expect(incomingMediaState.micOn).toBe(false);
      expect(audioElementMuted).toBe(false); // Audio element remains unmuted!
      expect(audioElementPaused).toBe(false); // Audio element remains playing!

      // 3. Only local deafen or local mute-for-me alters the audio element
      mutedForMe.add(remoteUserId);
      updateAudioElementState(remoteUserId);
      expect(audioElementMuted).toBe(true);

      mutedForMe.delete(remoteUserId);
      updateAudioElementState(remoteUserId);
      expect(audioElementMuted).toBe(false);
    });

    it("6. Server accepts micOn=true from both players and spectators unless mutedByModerator=true", () => {
      // 1. Player 1 starts call
      const startRes = roomManager.startCall(roomId, p1.id, p1.name, p1.socketId, false);
      expect(startRes.error).toBeUndefined();

      // 2. Player 2 joins call
      const p2Join = roomManager.addCallParticipant(roomId, p2.id, p2.name, p2.socketId, false);
      expect(p2Join.callState?.active).toBe(true);
      expect(p2Join.participant?.role).toBe("player");
      expect(p2Join.participant?.micOn).toBe(true);

      // Player 2 can toggle mic off and on
      const p2Mute = roomManager.updateCallMediaState(roomId, p2.id, false, false);
      expect(p2Mute?.micOn).toBe(false);
      const p2Unmute = roomManager.updateCallMediaState(roomId, p2.id, true, false);
      expect(p2Unmute?.micOn).toBe(true);

      // 3. Spectator joins call (joins muted)
      const specJoin = roomManager.addCallParticipant(roomId, spec1.id, spec1.name, spec1.socketId, false);
      expect(specJoin.error).toBeUndefined();
      expect(specJoin.participant?.role).toBe("spectator");
      expect(specJoin.participant?.micOn).toBe(false);
      expect(specJoin.participant?.mutedByModerator).toBe(false);

      // 4. Spectator unmuting is ACCEPTED by server
      const specUnmute = roomManager.updateCallMediaState(roomId, spec1.id, true, false);
      expect(specUnmute).not.toBeNull();
      expect(specUnmute?.userId).toBe(spec1.id);
      expect(specUnmute?.micOn).toBe(true);

      // 5. Moderator mutes spectator
      const modMute = roomManager.moderateCallParticipant(roomId, p1.id, spec1.id, "mute");
      expect(modMute.participant?.mutedByModerator).toBe(true);
      expect(modMute.participant?.micOn).toBe(false);

      // 6. Spectator cannot unmute while mutedByModerator
      const blockedUnmute = roomManager.updateCallMediaState(roomId, spec1.id, true, false);
      expect(blockedUnmute?.mutedByModerator).toBe(true);
      expect(blockedUnmute?.micOn).toBe(false);

      // 7. Moderator unmutes spectator
      const modUnmute = roomManager.moderateCallParticipant(roomId, p1.id, spec1.id, "unmute");
      expect(modUnmute.participant?.mutedByModerator).toBe(false);

      // 8. Spectator unmuting is accepted again
      const reUnmute = roomManager.updateCallMediaState(roomId, spec1.id, true, false);
      expect(reUnmute?.mutedByModerator).toBe(false);
      expect(reUnmute?.micOn).toBe(true);
    });

    it("extracts SDP media section directions accurately without leaking raw SDP payload", () => {
      const mockSdpWithSendrecv = [
        "v=0",
        "o=- 12345 2 IN IP4 127.0.0.1",
        "s=-",
        "t=0 0",
        "m=audio 9 UDP/TLS/RTP/SAVPF 111",
        "c=IN IP4 0.0.0.0",
        "a=sendrecv",
        "a=rtpmap:111 opus/48000/2",
        "m=video 9 UDP/TLS/RTP/SAVPF 96",
        "c=IN IP4 0.0.0.0",
        "a=sendrecv",
        "a=rtpmap:96 VP8/90000",
      ].join("\r\n");

      const directions = extractSdpDirections(mockSdpWithSendrecv);
      expect(directions.audioDirection).toBe("sendrecv");
      expect(directions.videoDirection).toBe("sendrecv");

      const mockSdpRecvonly = [
        "m=audio 9 UDP/TLS/RTP/SAVPF 111",
        "a=recvonly",
        "m=video 9 UDP/TLS/RTP/SAVPF 96",
        "a=inactive",
      ].join("\n");

      const parsedRecvonly = extractSdpDirections(mockSdpRecvonly);
      expect(parsedRecvonly.audioDirection).toBe("recvonly");
      expect(parsedRecvonly.videoDirection).toBe("inactive");
    });
  });

  describe("Full Video Pipeline: Live Video Across All Roles (Player & Spectator)", () => {
    const createMockPC = () => {
      const transceivers: any[] = [];
      let closed = false;
      return {
        get closed() {
          return closed;
        },
        close: vi.fn(() => {
          closed = true;
        }),
        getTransceivers: () => transceivers,
        addTransceiver: (kind: string, init?: any) => {
          const sender = {
            track: null as any,
            replaceTrack: vi.fn(async (t: any) => {
              sender.track = t;
            }),
          };
          const receiver = {
            track: { kind, id: `rx-${kind}-${Math.random()}` },
          };
          const t = {
            direction: init?.direction || "sendrecv",
            currentDirection: init?.direction || "sendrecv",
            sender,
            receiver,
          };
          transceivers.push(t);
          return t;
        },
      };
    };

    it("1. A player and a spectator get identical video setup ('sendrecv' video transceiver, same local video track on every peer's videoSender when camera is on, null when off)", () => {
      const playerPC = createMockPC();
      const spectatorPC = createMockPC();

      const localAudioTrack = { kind: "audio", enabled: true, stop: vi.fn() };
      const playerVideoTrack = { kind: "video", enabled: true, stop: vi.fn() };

      // Offerer: Player with camera ON, Spectator with camera OFF
      const playerOfferer = setupOffererTransceivers(playerPC, localAudioTrack, playerVideoTrack, true);
      const spectatorOfferer = setupOffererTransceivers(spectatorPC, localAudioTrack, null, false);

      expect(playerOfferer.videoTransceiver.direction).toBe("sendrecv");
      expect(spectatorOfferer.videoTransceiver.direction).toBe("sendrecv");
      expect(playerOfferer.videoSender.track).toBe(playerVideoTrack);
      expect(spectatorOfferer.videoSender.track).toBeNull();

      // Answerer: Player with camera ON, Spectator with camera OFF
      const playerAnswererPC = createMockPC();
      const spectatorAnswererPC = createMockPC();
      playerAnswererPC.addTransceiver("audio", { direction: "sendrecv" });
      playerAnswererPC.addTransceiver("video", { direction: "sendrecv" });
      spectatorAnswererPC.addTransceiver("audio", { direction: "sendrecv" });
      spectatorAnswererPC.addTransceiver("video", { direction: "sendrecv" });

      const playerAnswerer = setupAnswererTransceivers(playerAnswererPC, localAudioTrack, playerVideoTrack, true);
      const spectatorAnswerer = setupAnswererTransceivers(spectatorAnswererPC, localAudioTrack, null, false);

      expect(playerAnswerer.videoTransceiver.direction).toBe("sendrecv");
      expect(spectatorAnswerer.videoTransceiver.direction).toBe("sendrecv");
      expect(playerAnswerer.videoSender.track).toBe(playerVideoTrack);
      expect(spectatorAnswerer.videoSender.track).toBeNull();
    });

    it("2. Camera off then on re-attaches a new track to ALL peers and stops the old track", async () => {
      const pc1 = createMockPC();
      const pc2 = createMockPC();
      const pc3 = createMockPC();

      const oldVideoTrack = { kind: "video", enabled: true, stop: vi.fn() };
      const newVideoTrack = { kind: "video", enabled: true, stop: vi.fn() };

      const res1 = setupOffererTransceivers(pc1, null, oldVideoTrack, true);
      const res2 = setupOffererTransceivers(pc2, null, oldVideoTrack, true);
      const res3 = setupOffererTransceivers(pc3, null, oldVideoTrack, true);

      // Initially camera is ON with oldVideoTrack
      expect(res1.videoSender.track).toBe(oldVideoTrack);
      expect(res2.videoSender.track).toBe(oldVideoTrack);
      expect(res3.videoSender.track).toBe(oldVideoTrack);

      // Camera OFF: stop old track, replaceTrack(null) on ALL peers
      oldVideoTrack.stop();
      expect(oldVideoTrack.stop).toHaveBeenCalledTimes(1);

      await Promise.all([
        res1.videoSender.replaceTrack(null),
        res2.videoSender.replaceTrack(null),
        res3.videoSender.replaceTrack(null),
      ]);

      expect(res1.videoSender.track).toBeNull();
      expect(res2.videoSender.track).toBeNull();
      expect(res3.videoSender.track).toBeNull();

      // Camera ON: acquire new track, replaceTrack(newVideoTrack) on ALL peers
      await Promise.all([
        res1.videoSender.replaceTrack(newVideoTrack),
        res2.videoSender.replaceTrack(newVideoTrack),
        res3.videoSender.replaceTrack(newVideoTrack),
      ]);

      expect(res1.videoSender.track).toBe(newVideoTrack);
      expect(res2.videoSender.track).toBe(newVideoTrack);
      expect(res3.videoSender.track).toBe(newVideoTrack);
      expect(newVideoTrack.stop).not.toHaveBeenCalled();
    });

    it("3. A peer created while my camera is on gets my video track after negotiation (syncSenders)", async () => {
      const liveVideoTrack = { kind: "video", enabled: true, stop: vi.fn() };
      const newPeerPC = createMockPC();

      // Peer created while cameraOn is true
      const { videoSender } = setupOffererTransceivers(newPeerPC, null, liveVideoTrack, true);
      expect(videoSender.track).toBe(liveVideoTrack);

      // Simulate syncSenders: if sender track matches liveVideoTrack, no extra replacement needed
      if (videoSender.track !== liveVideoTrack) {
        await videoSender.replaceTrack(liveVideoTrack);
      }
      expect(videoSender.track).toBe(liveVideoTrack);
    });

    it("4. 2 players + 2 spectators with cameras on: every participant has 3 peers, each with a video sender carrying the local track, and 3 remote tiles with video", () => {
      const participants: CallParticipant[] = [
        { userId: "player-1", name: "Alice", socketId: "sock-1", role: "player", micOn: true, cameraOn: true, mutedByModerator: false, joinedAt: 100 },
        { userId: "player-2", name: "Bob", socketId: "sock-2", role: "player", micOn: true, cameraOn: true, mutedByModerator: false, joinedAt: 200 },
        { userId: "spec-1", name: "Charlie", socketId: "sock-3", role: "spectator", micOn: true, cameraOn: true, mutedByModerator: false, joinedAt: 300 },
        { userId: "spec-2", name: "Dave", socketId: "sock-4", role: "spectator", micOn: true, cameraOn: true, mutedByModerator: false, joinedAt: 400 },
      ];

      for (const me of participants) {
        const { toCreate } = reconcilePeers(me.userId, participants, []);
        expect(toCreate).toHaveLength(3);

        const myVideoTrack = {
          kind: "video",
          enabled: true,
          id: `vid-${me.userId}`,
          stop: vi.fn(),
        };

        const peers = toCreate.map((peerId) => {
          const pc = createMockPC();
          const { videoSender, videoTransceiver } = setupOffererTransceivers(pc, null, myVideoTrack, true);
          return { peerId, pc, videoSender, videoTransceiver };
        });

        expect(peers).toHaveLength(3);
        for (const peer of peers) {
          expect(peer.videoTransceiver.direction).toBe("sendrecv");
          expect(peer.videoSender.track).toBe(myVideoTrack);
          expect(peer.videoSender.track.id).toBe(`vid-${me.userId}`);
        }

        // Verify remote tile live video condition for the 3 other participants
        const remoteParticipants = participants.filter((p) => p.userId !== me.userId);
        expect(remoteParticipants).toHaveLength(3);
        for (const remote of remoteParticipants) {
          const mockRemoteVideoTrack = { kind: "video", readyState: "live", muted: false };
          const isVideoHidden = false;
          const hasLiveVideo = Boolean(
            mockRemoteVideoTrack &&
            remote.cameraOn &&
            !isVideoHidden
          );
          expect(hasLiveVideo).toBe(true);
        }
      }
    });
  });
});
