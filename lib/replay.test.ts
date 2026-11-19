import { describe, it, expect } from "vitest";
import { reconstructBoard, parseWinningLine, isGameParticipant } from "./replay";
import { GameMove } from "@/types/game";

describe("Replay Module - Board Reconstruction & Permissions", () => {
  const sampleMoves: GameMove[] = [
    { step: 1, player: "X", cellIndex: 0, timestamp: 1000 },
    { step: 2, player: "O", cellIndex: 4, timestamp: 2000 },
    { step: 3, player: "X", cellIndex: 1, timestamp: 3000 },
    { step: 4, player: "O", cellIndex: 8, timestamp: 4000 },
    { step: 5, player: "X", cellIndex: 2, timestamp: 5000 },
  ];

  it("reconstructs empty board at step 0", () => {
    const board = reconstructBoard(sampleMoves, 0);
    expect(board).toEqual(Array(9).fill(null));
  });

  it("reconstructs partial board at intermediate steps", () => {
    const step1 = reconstructBoard(sampleMoves, 1);
    expect(step1[0]).toBe("X");
    expect(step1[4]).toBeNull();

    const step2 = reconstructBoard(sampleMoves, 2);
    expect(step2[0]).toBe("X");
    expect(step2[4]).toBe("O");
    expect(step2[1]).toBeNull();
  });

  it("reconstructs full board at final step", () => {
    const finalBoard = reconstructBoard(sampleMoves, 5);
    expect(finalBoard[0]).toBe("X");
    expect(finalBoard[4]).toBe("O");
    expect(finalBoard[1]).toBe("X");
    expect(finalBoard[8]).toBe("O");
    expect(finalBoard[2]).toBe("X");
    expect(finalBoard[3]).toBeNull();
  });

  it("handles out-of-bounds step values safely", () => {
    const negative = reconstructBoard(sampleMoves, -5);
    expect(negative).toEqual(Array(9).fill(null));

    const overflow = reconstructBoard(sampleMoves, 999);
    expect(overflow).toEqual(reconstructBoard(sampleMoves, 5));
  });

  it("parses winning line formats accurately", () => {
    expect(parseWinningLine("[0, 1, 2]")).toEqual([0, 1, 2]);
    expect(parseWinningLine("[3,4,5]")).toEqual([3, 4, 5]);
    expect(parseWinningLine("6,7,8")).toEqual([6, 7, 8]);
    expect(parseWinningLine([0, 4, 8])).toEqual([0, 4, 8]);
    expect(parseWinningLine(null)).toBeNull();
    expect(parseWinningLine(undefined)).toBeNull();
    expect(parseWinningLine("invalid")).toBeNull();
  });

  it("correctly identifies game participants for auth check", () => {
    const game = {
      userId: "user-creator",
      playerXId: "user-1",
      playerOId: "user-2",
    };

    expect(isGameParticipant(game, "user-creator")).toBe(true);
    expect(isGameParticipant(game, "user-1")).toBe(true);
    expect(isGameParticipant(game, "user-2")).toBe(true);
    expect(isGameParticipant(game, "random-user")).toBe(false);
    expect(isGameParticipant(game, null)).toBe(false);
    expect(isGameParticipant(game, undefined)).toBe(false);
  });
});

