import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createGameSchema = z.object({
  mode: z.string(),
  playerX: z.string(),
  playerO: z.string(),
  playerXId: z.string().nullable().optional(),
  playerOId: z.string().nullable().optional(),
  winner: z.string().nullable().optional(),
  winningLine: z.string().nullable().optional(),
  moves: z.array(
    z.object({
      step: z.number(),
      player: z.enum(["X", "O"]),
      cellIndex: z.number(),
      timestamp: z.number(),
    })
  ),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    const whereClause: any = {
      OR: [
        { userId: session.user.id },
        { playerXId: session.user.id },
        { playerOId: session.user.id },
      ],
    };

    if (mode && mode !== "all") {
      whereClause.mode = mode;
    }

    const games = await prisma.game.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, games });
  } catch (error) {
    console.error("[API:GET /api/games] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = createGameSchema.parse(body);

    const game = await prisma.game.create({
      data: {
        mode: data.mode,
        playerX: data.playerX,
        playerO: data.playerO,
        playerXId: data.playerXId || (data.playerX === session.user.name ? session.user.id : null),
        playerOId: data.playerOId || (data.playerO === session.user.name ? session.user.id : null),
        winner: data.winner,
        winningLine: data.winningLine,
        moves: data.moves as any,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, gameId: game.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("[API:POST /api/games] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create game record" },
      { status: 500 }
    );
  }
}
