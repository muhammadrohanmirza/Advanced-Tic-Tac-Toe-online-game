"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonCard } from "@/components/ui/NeonCard";
import { CrownBadge } from "@/components/ui/CrownBadge";
import Link from "next/link";
import { User, Mail, Lock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
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
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign in failed. Please try logging in.");
        setIsLoading(false);
        return;
      }

      router.push("/lobby");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <NeonCard variant="glass" className="w-full max-w-md mx-auto" glow>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <CrownBadge size={34} style={{ marginBottom: "6px" }} />
        <h1
          className="game-title-3d"
          style={{ fontSize: "28px", margin: "0 0 6px" }}
        >
          Create Account
        </h1>
        <p style={{ color: "var(--text-secondary, #c2d6ff)", fontSize: "14px", margin: 0 }}>
          Join the Tic-Tac-Toe arena
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <NeonInput
          label="Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          variant="cyan"
          icon={<User className="w-5 h-5" />}
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

        <NeonInput
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
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
          Create Account
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
    </NeonCard>
  );
}
