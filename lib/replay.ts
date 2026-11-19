import { GameMove, CellValue } from "@/types/game";

/**
 * Reconstructs the 3x3 board state up to a given step in the move history.
 */
export function reconstructBoard(moves: GameMove[], step: number): CellValue[] {
  const board: CellValue[] = Array(9).fill(null);
  const clampedStep = Math.max(0, Math.min(step, moves.length));

  for (let i = 0; i < clampedStep; i++) {
    const move = moves[i];
    if (move && typeof move.cellIndex === "number" && move.cellIndex >= 0 && move.cellIndex <= 8) {
      board[move.cellIndex] = move.player;
    }
  }

  return board;
}

/**
 * Parses the winning line whether it was stored as JSON string, array, or null.
 */
export function parseWinningLine(raw: string | number[] | null | undefined): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // In case it's comma-separated: "0,1,2"
      const parts = raw.split(",").map((s) => parseInt(s.trim(), 10));
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) return parts;
    }
  }
  return null;
}

/**
 * Checks whether a given user is allowed to view the replay.
 */
export function isGameParticipant(
  game: {
    userId?: string | null;
    playerXId?: string | null;
    playerOId?: string | null;
  },
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  return (
    game.userId === userId ||
    game.playerXId === userId ||
    game.playerOId === userId
  );
}

