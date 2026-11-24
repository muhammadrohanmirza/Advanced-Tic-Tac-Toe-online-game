"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonCard } from "@/components/ui/NeonCard";
import { CrownBadge } from "@/components/ui/CrownBadge";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import Link from "next/link";
import { Mail, Lock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
        setIsLoading(false);
        return;
      }

      toast.success("Welcome back!");
      router.push("/lobby");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <NeonCard variant="glass" className="w-full max-w-md mx-auto" glow>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <CrownBadge size={34} style={{ marginBottom: "6px" }} />
          <h1
            className="game-title-3d"
            style={{ fontSize: "28px", margin: "0 0 6px" }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              color: "var(--text-secondary, #c2d6ff)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Sign in to continue playing
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <NeonInput
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            variant="cyan"
            icon={<Mail className="w-5 h-5" />}
          />

          <div>
            <NeonInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="cyan"
              icon={<Lock className="w-5 h-5" />}
              showPasswordToggle
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-x, #00A3FF)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                }}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "rgba(255, 59, 48, 0.15)",
                border: "1px solid var(--accent-red, #FF3B30)",
                borderRadius: "14px",
                color: "var(--accent-red, #FF3B30)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <NeonButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            style={{ marginTop: "8px", minHeight: "50px" }}
          >
            Sign In
          </NeonButton>
        </form>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            color: "var(--text-secondary, #c2d6ff)",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            style={{
              color: "var(--accent-o, #FF7A00)",
              fontWeight: 700,
              textDecoration: "none",
              marginLeft: "4px",
            }}
          >
            Sign Up
          </Link>
        </div>
      </NeonCard>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
        onSuccess={(confirmedEmail) => setEmail(confirmedEmail)}
      />
    </>
  );
}
