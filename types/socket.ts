import {
  Room,
  CellValue,
  TurnPlayer,
  ChatMessage,
  AllowedReaction,
  ReactionPayload,
  Spectator,
  CallParticipant,
  CallState,
  SpectatorCallPermission
} from "./game";

// Client to Server Events
export interface ClientToServerEvents {
  "create-room": (data: CreateRoomData) => void;
  "join-room": (data: JoinRoomData) => void;
  "spectate-room": (data: SpectateRoomData) => void;
  "make-move": (data: MakeMoveData) => void;
  "send-message": (data: SendMessageData) => void;
  "typing": (data: TypingData) => void;
  "send-reaction": (data: SendReactionData) => void;
  "request-rematch": (data: RematchData) => void;
  "accept-rematch": (data: RematchData) => void;
  "reject-rematch": (data: RejectRematchData) => void;
  "leave-room": (data: LeaveRoomData) => void;
  "get-public-rooms": () => void;
  "get-spectators": (data: GetSpectatorsData) => void;
  "call-start": (data: { roomId: string; withVideo?: boolean; userId?: string }) => void;
  "call-cancel": (data: { roomId: string; userId?: string }) => void;
  "call-join-request": (data: { roomId: string; withVideo?: boolean; userId?: string }) => void;
  "call-join-response": (data: { roomId: string; requesterId: string; accepted: boolean; withVideo?: boolean; userId?: string }) => void;
  "webrtc-offer": (data: { roomId: string; targetUserId: string; sdp: any }) => void;
  "webrtc-answer": (data: { roomId: string; targetUserId: string; sdp: any }) => void;
  "webrtc-ice-candidate": (data: { roomId: string; targetUserId: string; candidate: any }) => void;
  "webrtc-request-offer": (data: { roomId: string; targetUserId: string }) => void;
  "call-leave": (data: { roomId: string }) => void;
  "call-end": (data: { roomId: string; userId?: string }) => void;
  "call-moderate": (data: { roomId: string; targetUserId: string; action: "mute" | "unmute" | "remove" }) => void;
  "call-media-state": (data: { roomId: string; micOn: boolean; cameraOn: boolean }) => void;
  "call-setting-change": (data: { roomId: string; setting?: SpectatorCallPermission; spectatorsAllowed?: SpectatorCallPermission }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  "room-created": (room: Room) => void;
  "room-joined": (room: Room) => void;
  "player-joined": (data: PlayerJoinedData) => void;
  "spectator-joined": (data: SpectatorJoinedData) => void;
  "spectator-left": (data: SpectatorLeftData) => void;
  "spectator-count-updated": (data: SpectatorCountUpdatedData) => void;
  "spectators-list": (data: SpectatorsListData) => void;
  "board-updated": (data: BoardUpdatedData) => void;
  "game-over": (data: GameOverData) => void;
  "new-message": (message: ChatMessage) => void;
  "user-typing": (data: TypingData) => void;
  "new-reaction": (data: ReactionPayload) => void;
  "reaction-cooldown": (data: ReactionCooldownData) => void;
  "rematch-requested": (data: RematchRequestedData) => void;
  "rematch-started": (room: Room) => void;
  "rematch-rejected": (data: RematchRejectedData) => void;
  "opponent-left": (data: OpponentLeftData) => void;
  "public-rooms-list": (data: PublicRoomsListData) => void;
  "timer-update": (data: TimerUpdateData) => void;
  "turn-timeout": (data: TurnTimeoutData) => void;
  "call-state": (data: CallState) => void;
  "call-incoming": (data: { callerId: string; callerName: string; withVideo: boolean; roomId: string }) => void;
  "call-join-request": (data: { requesterId: string; requesterName: string; withVideo: boolean; roomId: string }) => void;
  "call-join-response": (data: { accepted: boolean; reason?: string }) => void;
  "call-participant-joined": (data: { participant: CallParticipant; participants: CallParticipant[]; roomId: string }) => void;
  "call-participant-left": (data: { userId: string; name?: string; reason?: string; participants: CallParticipant[]; roomId: string }) => void;
  "webrtc-offer": (data: { senderId: string; sdp: any }) => void;
  "webrtc-answer": (data: { senderId: string; sdp: any }) => void;
  "webrtc-ice-candidate": (data: { senderId: string; candidate: any }) => void;
  "webrtc-request-offer": (data: { senderId: string }) => void;
  "call-media-state": (data: { userId: string; micOn: boolean; cameraOn: boolean; mutedByModerator?: boolean }) => void;
  "call-moderated": (data: { action: "mute" | "unmute" | "remove"; moderatorName: string }) => void;
  "call-ended": (data: { roomId: string; reason?: string }) => void;
  error: (data: ErrorData) => void;
}

// Event Data Types
export interface CreateRoomData {
  userId: string;
  userName: string;
  isPublic: boolean;
  turnDuration?: number;
}

export interface JoinRoomData {
  roomId: string;
  userId: string;
  userName: string;
}

export interface SpectateRoomData {
  roomId: string;
  userId: string;
  userName: string;
}

export interface SpectatorJoinedData {
  spectator: Spectator;
  spectatorsCount: number;
  spectators?: Spectator[];
  roomId: string;
}

export interface SpectatorLeftData {
  spectatorId: string;
  spectatorName: string;
  spectatorsCount: number;
  spectators?: Spectator[];
  roomId: string;
}

export interface SpectatorCountUpdatedData {
  roomId: string;
  count: number;
}

export interface GetSpectatorsData {
  roomId: string;
  page?: number;
  pageSize?: number;
}

export interface SpectatorsListData {
  roomId: string;
  spectators: Spectator[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MakeMoveData {
  roomId: string;
  cellIndex: number;
  playerId: string;
}

export interface SendMessageData {
  roomId: string;
  message: string;
  senderName: string;
  senderId: string;
  id?: string;
}

export interface TypingData {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface SendReactionData {
  roomId: string;
  reaction: AllowedReaction;
  senderId: string;
  senderName: string;
}

export interface ReactionCooldownData {
  message: string;
  retryAfterMs: number;
}

export interface RematchData {
  roomId: string;
  playerId: string;
}

export interface RejectRematchData {
  roomId: string;
}

export interface LeaveRoomData {
  roomId: string;
}

export interface PlayerJoinedData {
  player: {
    id: string;
    name: string;
    symbol: TurnPlayer;
  };
  room: Room;
}

export interface BoardUpdatedData {
  board: CellValue[];
  currentTurn: TurnPlayer;
  lastMove: number | null;
  isAutoMove?: boolean;
  timedOutPlayerId?: string;
  consecutiveTimeouts?: number;
  turnDuration?: number;
  turnDeadline?: number | null;
  turnStartTime?: number | null;
  timeoutCountX?: number;
  timeoutCountO?: number;
}

export interface GameOverData {
  winner: TurnPlayer | "draw";
  winningLine: number[] | null;
  room?: Room;
  isDraw?: boolean;
  isForfeit?: boolean;
  forfeitedBy?: string;
}

export interface RematchRequestedData {
  requestedBy: string;
  roomId?: string;
}

export interface RematchRejectedData {
  message: string;
}

export interface OpponentLeftData {
  message: string;
}

export interface PublicRoomSummary {
  id: string;
  code: string;
  isPublic: boolean;
  status: "waiting" | "playing" | "finished";
  player1: { name: string; id: string } | null;
  player2: { name: string; id: string } | null;
  playerCount: number;
  spectatorCount: number;
  maxSpectators?: number;
  isSpectatorFull?: boolean;
  spectators?: Spectator[];
  turnDuration: number;
  createdAt: string | number | Date;
}

export interface PublicRoomsListData {
  rooms: (Room | PublicRoomSummary | any)[];
}

export interface TimerUpdateData {
  roomId: string;
  currentTurn: TurnPlayer;
  turnDuration: number;
  turnDeadline: number | null;
  turnStartTime: number | null;
  timeoutCountX: number;
  timeoutCountO: number;
  secondsLeft?: number;
}

export interface TurnTimeoutData {
  roomId: string;
  timedOutPlayerId: string;
  consecutiveTimeouts: number;
  isForfeit?: boolean;
}

export interface ErrorData {
  message: string;
}
