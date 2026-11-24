"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonButton } from "@/components/ui/NeonButton";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { CrownBadge } from "@/components/ui/CrownBadge";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SoundControls } from "@/components/ui/SoundControls";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import Link from "next/link";
import { Mail, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
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
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(12px, 3vw, 24px)",
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        position: "relative",
        zIndex: 1,
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <RoundIconButton
          variant="blue"
          size={44}
          ariaLabel="Go to home"
          onClick={() => router.push("/")}
        >
          <ArrowLeft style={{ width: "22px", height: "22px" }} />
        </RoundIconButton>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SoundControls align="right" />
          <ThemeSwitcher align="right" />
        </div>
      </header>

      {/* Main Form Center */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          flex: 1,
          width: "100%",
          padding: "clamp(12px, 2vh, 24px) 0",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="game-card-glass"
          style={{
            width: "100%",
            maxWidth: "440px",
            margin: "auto 0",
            padding: "clamp(16px, 4vw, 32px)",
            borderRadius: "clamp(22px, 5vw, 30px)",
            boxShadow: "0 20px 48px rgba(0, 15, 50, 0.45)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "clamp(20px, 4vw, 28px)" }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 350 }}
              style={{ marginBottom: "4px" }}
            >
              <CrownBadge size={34} />
            </motion.div>
            <h1
              className="game-title-3d"
              style={{
                fontSize: "clamp(26px, 5vw, 32px)",
                margin: "0 0 6px",
              }}
            >
              Welcome Back
            </h1>
            <p
              style={{
                color: "var(--text-secondary, #c2d6ff)",
                fontSize: "14px",
                margin: 0,
                fontFamily: "var(--font-body)",
              }}
            >
              Sign in to play with friends or AI
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <NeonInput
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              variant="cyan"
              icon={<Mail className="w-5 h-5" />}
              autoFocus
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "6px",
                }}
              >
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
                    padding: "2px 0",
                    fontFamily: "var(--font-display)",
                    transition: "opacity 0.2s ease",
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
                  fontFamily: "var(--font-body)",
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <NeonButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              style={{ marginTop: "8px", minHeight: "52px" }}
            >
              Sign In
            </NeonButton>
          </form>

          {/* Footer Link */}
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
        </motion.div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--text-muted, #8aa0d4)",
          fontFamily: "var(--font-display)",
          padding: "8px 0",
        }}
      >
        © 2026 Tic Tac Toe Online • Think • Play • Win
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
        onSuccess={(confirmedEmail) => {
          setEmail(confirmedEmail);
        }}
      />
    </div>
  );
}
