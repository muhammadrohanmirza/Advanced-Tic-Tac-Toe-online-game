import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGameParticipant } from "@/lib/replay";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { gameId } = params;

    if (!gameId) {
      return NextResponse.json(
        { success: false, message: "Game ID is required" },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return NextResponse.json(
        { success: false, message: "Game not found" },
        { status: 404 }
      );
    }

    if (!isGameParticipant(game, session.user.id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You can only view replays of games you participated in",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error("[API:GET /api/games/[gameId]] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch game" },
      { status: 500 }
    );
  }
}
