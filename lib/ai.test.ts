import { describe, it, expect } from "vitest";
import {
  getBestMove,
  checkWinner,
  checkDraw,
  isBoardFull,
  getEmptyCells,
  CellValue,
  PlayerSymbol,
} from "./ai";

describe("AI Module - Helper Functions", () => {
  it("detects horizontal, vertical, and diagonal wins", () => {
    // Horizontal row 0
    expect(
      checkWinner(["X", "X", "X", null, null, null, null, null, null]).winner
    ).toBe("X");

    // Vertical column 1
    expect(
      checkWinner([null, "O", null, null, "O", null, null, "O", null]).winner
    ).toBe("O");

    // Diagonal 0-4-8
    expect(
      checkWinner(["X", null, null, null, "X", null, null, null, "X"]).winner
    ).toBe("X");

    // Diagonal 2-4-6
    expect(
      checkWinner([null, null, "O", null, "O", null, "O", null, null]).winner
    ).toBe("O");

    // No winner
    expect(
      checkWinner(["X", "O", "X", "X", "O", "O", null, null, null]).winner
    ).toBe(null);
  });

  it("detects draw correctly", () => {
    const drawBoard: CellValue[] = [
      "X", "O", "X",
      "X", "O", "O",
      "O", "X", "X",
    ];
    expect(checkDraw(drawBoard)).toBe(true);
    expect(isBoardFull(drawBoard)).toBe(true);

    const nonDrawBoard: CellValue[] = [
      "X", "O", "X",
      "X", "O", "O",
      "O", "X", null,
    ];
    expect(checkDraw(nonDrawBoard)).toBe(false);
  });

  it("lists empty cells properly", () => {
    const board: CellValue[] = [
      "X", null, "O",
      null, "X", null,
      null, null, "O",
    ];
    expect(getEmptyCells(board)).toEqual([1, 3, 5, 6, 7]);
  });
});

describe("AI Module - Medium Difficulty", () => {
  it("takes immediate winning move if available", () => {
    // AI is 'O'. Has 0 and 1, cell 2 is empty.
    const board: CellValue[] = [
      "O", "O", null,
      "X", "X", null,
      null, null, null,
    ];
    const move = getBestMove(board, "O", "medium");
    expect(move).toBe(2);
  });

  it("blocks opponent immediate winning move if threatened", () => {
    // AI is 'O'. Human is 'X'. Human has 3 and 4, threatens 5.
    const board: CellValue[] = [
      "O", null, null,
      "X", "X", null,
      null, null, null,
    ];
    const move = getBestMove(board, "O", "medium");
    expect(move).toBe(5);
  });

  it("picks center (cell 4) if open and no win/block needed", () => {
    const board: CellValue[] = [
      "X", null, null,
      null, null, null,
      null, null, null,
    ];
    const move = getBestMove(board, "O", "medium");
    expect(move).toBe(4);
  });

  it("picks a corner if center is taken and no win/block needed", () => {
    const board: CellValue[] = [
      null, null, null,
      null, "X", null,
      null, null, null,
    ];
    const move = getBestMove(board, "O", "medium");
    expect([0, 2, 6, 8]).toContain(move);
  });
});

describe("AI Module - Easy Difficulty", () => {
  it("always returns a valid empty cell", () => {
    const board: CellValue[] = [
      "X", "O", "X",
      null, "X", "O",
      "O", null, null,
    ];
    const move = getBestMove(board, "O", "easy");
    expect([3, 7, 8]).toContain(move);
  });

  it("returns -1 when board is full", () => {
    const board: CellValue[] = [
      "X", "O", "X",
      "X", "O", "O",
      "O", "X", "X",
    ];
    expect(getBestMove(board, "O", "easy")).toBe(-1);
  });
});

describe("AI Module - Hard Difficulty (Unbeatable Minimax)", () => {
  it("takes an immediate win over a block", () => {
    // Both AI ('X') and Human ('O') have 2 in a row. AI should win immediately!
    const board: CellValue[] = [
      "X", "X", null, // move 2 wins for X
      "O", "O", null, // move 5 wins for O
      null, null, null,
    ];
    const move = getBestMove(board, "X", "hard");
    expect(move).toBe(2);
  });

  it("blocks opponent winning move", () => {
    const board: CellValue[] = [
      "O", "O", null, // Human 'O' threatens move 2
      "X", null, null,
      null, null, null,
    ];
    const move = getBestMove(board, "X", "hard");
    expect(move).toBe(2);
  });

  /**
   * Exhaustive Game-Tree Simulation:
   * Hard AI must NEVER lose against any sequence of opponent moves.
   */
  function simulateGameTree(
    board: CellValue[],
    currentTurn: PlayerSymbol,
    aiPlayer: PlayerSymbol
  ): { aiWins: number; draws: number; humanWins: number } {
    const humanPlayer: PlayerSymbol = aiPlayer === "X" ? "O" : "X";
    const { winner } = checkWinner(board);

    if (winner === aiPlayer) {
      return { aiWins: 1, draws: 0, humanWins: 0 };
    }
    if (winner === humanPlayer) {
      // Hard AI must never lose!
      return { aiWins: 0, draws: 0, humanWins: 1 };
    }
    if (isBoardFull(board)) {
      return { aiWins: 0, draws: 1, humanWins: 0 };
    }

    let totalAiWins = 0;
    let totalDraws = 0;
    let totalHumanWins = 0;

    if (currentTurn === aiPlayer) {
      // AI chooses its best move
      const move = getBestMove(board, aiPlayer, "hard");
      board[move] = aiPlayer;
      const res = simulateGameTree(board, humanPlayer, aiPlayer);
      board[move] = null;

      totalAiWins += res.aiWins;
      totalDraws += res.draws;
      totalHumanWins += res.humanWins;
    } else {
      // Human tries EVERY possible valid move
      const empty = getEmptyCells(board);
      for (const move of empty) {
        board[move] = humanPlayer;
        const res = simulateGameTree(board, aiPlayer, aiPlayer);
        board[move] = null;

        totalAiWins += res.aiWins;
        totalDraws += res.draws;
        totalHumanWins += res.humanWins;
      }
    }

    return {
      aiWins: totalAiWins,
      draws: totalDraws,
      humanWins: totalHumanWins,
    };
  }

  it("Hard AI as 'X' (goes first) NEVER loses across all possible opponent move sequences", () => {
    const board: CellValue[] = Array(9).fill(null);
    const stats = simulateGameTree(board, "X", "X");

    console.log(`AI as X: AI Wins=${stats.aiWins}, Draws=${stats.draws}, Human Wins=${stats.humanWins}`);
    expect(stats.humanWins).toBe(0);
    expect(stats.aiWins + stats.draws).toBeGreaterThan(0);
  });

  it("Hard AI as 'O' (goes second) NEVER loses across all possible opponent move sequences", () => {
    const board: CellValue[] = Array(9).fill(null);
    const stats = simulateGameTree(board, "X", "O");

    console.log(`AI as O: AI Wins=${stats.aiWins}, Draws=${stats.draws}, Human Wins=${stats.humanWins}`);
    expect(stats.humanWins).toBe(0);
    expect(stats.aiWins + stats.draws).toBeGreaterThan(0);
  });
});

