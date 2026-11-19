export type CellValue = "X" | "O" | null;
export type Difficulty = "easy" | "medium" | "hard";
export type PlayerSymbol = "X" | "O";

export const WINNING_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Check if there is a winner on the board.
 */
export function checkWinner(board: CellValue[]): {
  winner: CellValue;
  line: number[] | null;
} {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

/**
 * Check if the board is completely full.
 */
export function isBoardFull(board: CellValue[]): boolean {
  return board.every((cell) => cell !== null && cell !== (undefined as unknown as null) && cell !== ("" as unknown as null));
}

/**
 * Get all available cell indices (0-8) on the board.
 */
export function getEmptyCells(board: CellValue[]): number[] {
  const empty: number[] = [];
  for (let i = 0; i < 9; i++) {
    const val = board[i];
    if (val === null || val === undefined || (val as unknown as string) === "") {
      empty.push(i);
    }
  }
  return empty;
}

/**
 * Check if the current board is a draw.
 */
export function checkDraw(board: CellValue[]): boolean {
  return isBoardFull(board) && checkWinner(board).winner === null;
}

/**
 * Checks if a player has an immediate winning move.
 */
function findWinningMove(
  board: CellValue[],
  player: PlayerSymbol,
  emptyCells: number[]
): number {
  for (const idx of emptyCells) {
    board[idx] = player;
    const { winner } = checkWinner(board);
    board[idx] = null;
    if (winner === player) {
      return idx;
    }
  }
  return -1;
}

/**
 * Easy AI: Mostly random moves, occasionally blocks or wins.
 */
function getEasyMove(
  board: CellValue[],
  aiPlayer: PlayerSymbol,
  humanPlayer: PlayerSymbol,
  emptyCells: number[]
): number {
  // 35% chance to take an immediate winning move if available
  const winMove = findWinningMove(board, aiPlayer, emptyCells);
  if (winMove !== -1 && Math.random() < 0.35) {
    return winMove;
  }

  // 30% chance to block an opponent's winning move if threatened
  const blockMove = findWinningMove(board, humanPlayer, emptyCells);
  if (blockMove !== -1 && Math.random() < 0.30) {
    return blockMove;
  }

  // Otherwise, choose a random available cell
  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  return emptyCells[randomIndex];
}

/**
 * Medium AI: Wins if it can, blocks if it must, otherwise picks center, corners, then random.
 */
function getMediumMove(
  board: CellValue[],
  aiPlayer: PlayerSymbol,
  humanPlayer: PlayerSymbol,
  emptyCells: number[]
): number {
  // 1. Win if it can
  const winMove = findWinningMove(board, aiPlayer, emptyCells);
  if (winMove !== -1) return winMove;

  // 2. Block if it must
  const blockMove = findWinningMove(board, humanPlayer, emptyCells);
  if (blockMove !== -1) return blockMove;

  // 3. Pick center (cell index 4) if available
  if (emptyCells.includes(4)) {
    return 4;
  }

  // 4. Pick any available corner: 0, 2, 6, 8
  const corners = [0, 2, 6, 8].filter((i) => emptyCells.includes(i));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // 5. Otherwise, pick any random remaining cell (edges: 1, 3, 5, 7)
  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  return emptyCells[randomIndex];
}

/**
 * Minimax algorithm with alpha-beta pruning.
 */
function minimax(
  board: CellValue[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiPlayer: PlayerSymbol,
  humanPlayer: PlayerSymbol
): number {
  const { winner } = checkWinner(board);

  // Terminal states
  if (winner === aiPlayer) return 10 - depth;
  if (winner === humanPlayer) return depth - 10;
  if (isBoardFull(board)) return 0;

  const emptyCells = getEmptyCells(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const idx of emptyCells) {
      board[idx] = aiPlayer;
      const evaluation = minimax(
        board,
        depth + 1,
        false,
        alpha,
        beta,
        aiPlayer,
        humanPlayer
      );
      board[idx] = null;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const idx of emptyCells) {
      board[idx] = humanPlayer;
      const evaluation = minimax(
        board,
        depth + 1,
        true,
        alpha,
        beta,
        aiPlayer,
        humanPlayer
      );
      board[idx] = null;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Hard AI: Full minimax with alpha-beta pruning (mathematically unbeatable).
 */
function getHardMove(
  board: CellValue[],
  aiPlayer: PlayerSymbol,
  humanPlayer: PlayerSymbol,
  emptyCells: number[]
): number {
  // Optimization: If the board is completely empty, any corner or center is optimal
  if (emptyCells.length === 9) {
    const bestOpenings = [0, 2, 4, 6, 8];
    return bestOpenings[Math.floor(Math.random() * bestOpenings.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const idx of emptyCells) {
    board[idx] = aiPlayer;
    const score = minimax(
      board,
      0,
      false,
      -Infinity,
      Infinity,
      aiPlayer,
      humanPlayer
    );
    board[idx] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }

  // Pick randomly among moves tied for the best score
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/**
 * Pure, testable function to determine the best move for the AI.
 *
 * @param board Current board of 9 cells
 * @param aiPlayer The symbol the AI is playing as ("X" or "O")
 * @param difficulty "easy" | "medium" | "hard"
 * @returns Chosen cell index (0-8), or -1 if no move is available
 */
export function getBestMove(
  board: CellValue[],
  aiPlayer: PlayerSymbol,
  difficulty: Difficulty
): number {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return -1;

  const humanPlayer: PlayerSymbol = aiPlayer === "X" ? "O" : "X";

  // Make a shallow copy of the board to ensure purity
  const boardCopy: CellValue[] = [...board];

  switch (difficulty) {
    case "easy":
      return getEasyMove(boardCopy, aiPlayer, humanPlayer, emptyCells);
    case "medium":
      return getMediumMove(boardCopy, aiPlayer, humanPlayer, emptyCells);
    case "hard":
    default:
      return getHardMove(boardCopy, aiPlayer, humanPlayer, emptyCells);
  }
}

