"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonInput } from "@/components/ui/NeonInput";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { CrownBadge } from "@/components/ui/CrownBadge";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SoundControls } from "@/components/ui/SoundControls";
import Link from "next/link";
import { User, Mail, Lock, AlertTriangle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < 3) return { level: 10, label: "Weak", color: "#FF3B30" };
    if (pwd.length < 6) return { level: 40, label: "Fair", color: "#FFB703" };
    if (pwd.length < 9) return { level: 75, label: "Good", color: "#00A3FF" };
    return { level: 100, label: "Strong", color: "#00E676" };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to create account");
        toast.error(data.message || "Failed to create account");
        setIsLoading(false);
        return;
      }

      toast.success("Account created successfully!");
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/lobby");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Something went wrong");
      toast.error("Something went wrong");
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
              Create Account
            </h1>
            <p
              style={{
                color: "var(--text-secondary, #c2d6ff)",
                fontSize: "14px",
                margin: 0,
                fontFamily: "var(--font-body)",
              }}
            >
              Join the Tic Tac Toe arena
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <NeonInput
              label="Player Name"
              type="text"
              placeholder="Your name or gamer tag"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              variant="cyan"
              icon={<User className="w-5 h-5" />}
              autoFocus
            />

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
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="cyan"
                icon={<Lock className="w-5 h-5" />}
                showPasswordToggle
              />

              {password && (
                <div style={{ marginTop: "6px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      marginBottom: "4px",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted, #8aa0d4)" }}>Strength</span>
                    <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                  </div>
                  <div
                    style={{
                      height: "5px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      style={{
                        height: "100%",
                        backgroundColor: strength.color,
                        boxShadow: `0 0 8px ${strength.color}`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${strength.level}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            <NeonInput
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              variant="cyan"
              icon={<Lock className="w-5 h-5" />}
              showPasswordToggle
            />

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
              Create Account
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
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--accent-x, #00A3FF)",
                fontWeight: 700,
                textDecoration: "none",
                marginLeft: "4px",
              }}
            >
              Sign In
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
    </div>
  );
}
