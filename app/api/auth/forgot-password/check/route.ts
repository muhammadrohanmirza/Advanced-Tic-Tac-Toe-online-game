import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const checkSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "anonymous";

    // Rate limit: max 5 requests per minute per IP
    const rateCheck = checkRateLimit("forgot-password-check", ip, 5, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please wait a minute before trying again.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = checkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "No account found with this email" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email found",
    });
  } catch (error) {
    console.error("[API:forgot-password/check] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500 }
    );
  }
}

