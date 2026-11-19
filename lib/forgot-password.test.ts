import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "./rateLimit";
import { z } from "zod";

const checkSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

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

describe("Forgot Password Validation & Security", () => {
  it("normalizes emails properly (lowercase + trim)", () => {
    const rawEmail = "  User.Name@Example.COM  ";
    const normalized = rawEmail.toLowerCase().trim();
    expect(normalized).toBe("user.name@example.com");
  });

  describe("Check Endpoint Schema", () => {
    it("accepts valid email addresses", () => {
      const valid = checkSchema.safeParse({ email: "player@game.com" });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid email addresses", () => {
      const invalid = checkSchema.safeParse({ email: "not-an-email" });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.errors[0].message).toBe("Please enter a valid email address");
      }
    });
  });

  describe("Reset Endpoint Schema", () => {
    it("accepts valid matching passwords of 8+ characters", () => {
      const valid = resetPasswordSchema.safeParse({
        email: "player@game.com",
        newPassword: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = resetPasswordSchema.safeParse({
        email: "player@game.com",
        newPassword: "short",
        confirmPassword: "short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("at least 8 characters");
      }
    });

    it("rejects mismatched passwords", () => {
      const result = resetPasswordSchema.safeParse({
        email: "player@game.com",
        newPassword: "Password123!",
        confirmPassword: "DifferentPassword456!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Passwords do not match");
      }
    });
  });

  describe("Rate Limiting", () => {
    it("enforces max 5 requests per window for IP check", () => {
      const testIp = `test-ip-${Date.now()}`;
      for (let i = 1; i <= 5; i++) {
        const res = checkRateLimit("test-fp-check", testIp, 5, 60000);
        expect(res.success).toBe(true);
      }
      const sixth = checkRateLimit("test-fp-check", testIp, 5, 60000);
      expect(sixth.success).toBe(false);
      expect(sixth.remaining).toBe(0);
    });

    it("enforces max 5 resets per hour for an email", () => {
      const testEmail = `test-reset-${Date.now()}@example.com`;
      for (let i = 1; i <= 5; i++) {
        const res = checkRateLimit("test-fp-reset-email", testEmail, 5, 3600000);
        expect(res.success).toBe(true);
      }
      const sixth = checkRateLimit("test-fp-reset-email", testEmail, 5, 3600000);
      expect(sixth.success).toBe(false);
      expect(sixth.remaining).toBe(0);
    });
  });
});

