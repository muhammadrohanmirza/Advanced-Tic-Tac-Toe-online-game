/**
 * Compatibility wrapper re-exporting from the pure lib/ai module.
 */
export * from "./ai";
import { getBestMove as getBestMovePure, CellValue, Difficulty, PlayerSymbol } from "./ai";

export function getBestMove(
  board: CellValue[],
  aiPlayerOrDifficulty: PlayerSymbol | Difficulty,
  maybeDifficulty?: Difficulty
): number {
  if (aiPlayerOrDifficulty === "easy" || aiPlayerOrDifficulty === "medium" || aiPlayerOrDifficulty === "hard") {
    // Legacy call: getBestMove(board, difficulty) - assumed AI is "O"
    return getBestMovePure(board, "O", aiPlayerOrDifficulty);
  }

  // Modern call: getBestMove(board, aiPlayer, difficulty)
  return getBestMovePure(board, aiPlayerOrDifficulty as PlayerSymbol, maybeDifficulty || "hard");
}
