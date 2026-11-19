import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "anonymous";

    // Rate limit per IP: max 5 requests per minute
    const ipRateCheck = checkRateLimit("forgot-password-reset-ip", ip, 5, 60 * 1000);
    if (!ipRateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many reset attempts. Please wait a minute before trying again.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.errors[0]?.message || "Invalid input data",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    // Rate limit per email: max 5 resets per email per hour
    const emailRateCheck = checkRateLimit("forgot-password-reset-email", normalizedEmail, 5, 60 * 60 * 1000);
    if (!emailRateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many password resets for this account. Please try again after an hour.",
        },
        { status: 429 }
      );
    }

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

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please log in.",
    });
  } catch (error) {
    console.error("[API:forgot-password/reset] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset password" },
      { status: 500 }
    );
  }
}

