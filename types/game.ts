export type CellValue = "X" | "O" | null;

export type GameStatus =
  | "waiting"
  | "playing"
  | "won"
  | "lost"
  | "draw"
  | "opponent-won";

export type GameResult = "win" | "loss" | "draw" | null;

export type TurnPlayer = "X" | "O";

export interface Player {
  id: string;
  name: string;
  symbol: TurnPlayer;
  isOnline: boolean;
}

export interface Spectator {
  id: string;
  name: string;
  socketId?: string;
  socketIds?: string[];
  joinedAt: number;
}

export interface Room {
  id: string;
  code: string;
  creatorId?: string;
  creatorName?: string;
  player1?: { id: string; name: string; socketId?: string; symbol: TurnPlayer } | null;
  player2?: { id: string; name: string; socketId?: string; symbol: TurnPlayer } | null;
  playerX?: Player | null;
  playerO?: Player | null;
  spectators?: Spectator[];
  isPublic: boolean;
  board: CellValue[] | string[];
  currentTurn: TurnPlayer;
  gameStatus?: "waiting" | "playing" | "finished";
  status?: "waiting" | "playing" | "finished";
  winner: TurnPlayer | string | null;
  winningLine: number[] | null;
  rematchRequestedBy: string | null;
  createdAt: number | Date;
  turnDuration?: number;
  turnDeadline?: number | null;
  turnStartTime?: number | null;
  timeoutCountX?: number;
  timeoutCountO?: number;
  messages?: ChatMessage[];
  call?: CallState;
}

export interface MoveResult {
  success: boolean;
  board: CellValue[];
  currentTurn: TurnPlayer;
  winner: TurnPlayer | null;
  winningLine: number[] | null;
  isDraw: boolean;
  lastMove: number | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  message: string;
  senderName: string;
  senderId: string;
  timestamp: number;
  isSystem?: boolean;
  role?: "player" | "spectator";
}

export const ALLOWED_REACTIONS = ["👍", "😂", "😮", "😡", "❤️", "🔥", "GG"] as const;
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number];

export interface ReactionPayload {
  id: string;
  roomId: string;
  reaction: AllowedReaction;
  senderId: string;
  senderName: string;
  timestamp: number;
  role?: "player" | "spectator";
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  wins: number;
  totalGames: number;
  winRate: number;
}

export interface OnlineStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}

export type CallRole = "player" | "spectator";
export type CallStatus = "idle" | "ringing" | "active";
export type SpectatorCallSetting = "ask" | "allow" | "off";
export type SpectatorCallPermission = SpectatorCallSetting | "Ask" | "Allow" | "Off";

export interface CallParticipant {
  userId: string;
  socketId: string;
  name: string;
  role: CallRole;
  micOn: boolean;
  cameraOn: boolean;
  mutedByModerator: boolean;
  joinedAt: number;
}

export interface CallState {
  status: CallStatus;
  active: boolean;
  startedBy: string | null;
  callerName?: string | null;
  withVideo?: boolean;
  spectatorCallSetting: SpectatorCallSetting;
  spectatorsAllowed?: SpectatorCallPermission;
  participants: CallParticipant[];
}

export interface GameMove {
  step: number;
  player: "X" | "O";
  cellIndex: number;
  timestamp: number;
}

export interface GameRecord {
  id: string;
  mode: string;
  playerX: string;
  playerO: string;
  playerXId?: string | null;
  playerOId?: string | null;
  winner?: string | null;
  winningLine?: string | null;
  moves: GameMove[];
  createdAt: string | Date;
  userId?: string | null;
  scoreId?: string | null;
}
