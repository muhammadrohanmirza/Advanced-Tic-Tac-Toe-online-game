"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, AlertTriangle, KeyRound } from "lucide-react";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonButton } from "@/components/ui/NeonButton";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import toast from "react-hot-toast";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(defaultEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync defaultEmail when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setStep(1);
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setIsLoading(false);
    }
  }, [isOpen, defaultEmail]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflowY;
      document.body.style.overflowY = "hidden";
      return () => {
        document.body.style.overflowY = prev || "auto";
      };
    }
  }, [isOpen]);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { percent: 0, label: "", color: "transparent" };
    if (pwd.length < 8) return { percent: 30, label: "Too short (min 8)", color: "#FF3B30" };
    const hasNum = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const variety = [hasNum, hasSpecial, hasUpper].filter(Boolean).length;
    if (variety === 0) return { percent: 55, label: "Fair", color: "#FFB703" };
    if (variety === 1) return { percent: 75, label: "Good", color: "#00A3FF" };
    return { level: 100, percent: 100, label: "Strong", color: "#00E676" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No account found with this email");
        setIsLoading(false);
        return;
      }

      // Email verified exists -> Advance to step 2
      setError("");
      setStep(2);
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update password");
        setIsLoading(false);
        return;
      }

      toast.success("Password updated. Please log in");
      onSuccess(trimmedEmail);
      onClose();
    } catch {
      setError("Unable to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(5, 12, 35, 0.75)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="game-card-glass"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "min(440px, calc(100vw - 24px))",
              padding: "clamp(16px, 4vw, 28px)",
              borderRadius: "clamp(22px, 5vw, 30px)",
              boxShadow: "0 24px 50px rgba(0, 15, 50, 0.5)",
              maxHeight: "calc(100dvh - 24px)",
              overflowY: "auto",
              scrollbarWidth: "thin",
              color: "var(--text-primary, #ffffff)",
              boxSizing: "border-box",
            }}
          >
            {/* Close Button */}
            <div style={{ position: "absolute", top: "16px", right: "16px" }}>
              <RoundIconButton
                variant="dark"
                size={36}
                ariaLabel="Close modal"
                onClick={onClose}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </RoundIconButton>
            </div>

            {/* Header Icon */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(180deg, rgba(0, 163, 255, 0.2) 0%, rgba(0, 119, 254, 0.3) 100%)",
                  border: "2px solid var(--accent-x, #00A3FF)",
                  boxShadow: "0 0 20px rgba(0, 163, 255, 0.35)",
                  marginBottom: "12px",
                }}
              >
                <KeyRound size={28} style={{ color: "var(--accent-x, #00A3FF)" }} />
              </div>
              <h2
                className="game-title-3d"
                style={{
                  fontSize: "clamp(22px, 4vw, 26px)",
                  margin: "0 0 6px 0",
                }}
              >
                {step === 1 ? "Forgot Password" : "Create New Password"}
              </h2>
              <p
                style={{
                  color: "var(--text-secondary, #c2d6ff)",
                  fontSize: "13px",
                  margin: 0,
                  fontFamily: "var(--font-body)",
                }}
              >
                {step === 1
                  ? "Enter your account email to continue with reset"
                  : "Set a strong new password for your account"}
              </p>
            </div>

            {/* Step 1: Email Lookup */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <NeonInput
                  label="Account Email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  required
                  variant="cyan"
                  icon={<Mail className="w-5 h-5" />}
                  autoFocus
                />

                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
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
                  style={{ marginTop: "6px" }}
                >
                  Continue
                </NeonButton>
              </form>
            )}

            {/* Step 2: Set New Password */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Email Chip */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    borderRadius: "14px",
                    background: "rgba(0, 163, 255, 0.1)",
                    border: "1px solid rgba(0, 163, 255, 0.25)",
                    fontSize: "13px",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <span style={{ color: "var(--text-secondary, #c2d6ff)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Account: <strong style={{ color: "var(--accent-x, #00A3FF)" }}>{email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--accent-x, #00A3FF)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      marginLeft: "8px",
                      textDecoration: "underline",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    Change
                  </button>
                </div>

                <div>
                  <NeonInput
                    label="Create New Password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError("");
                    }}
                    required
                    variant="cyan"
                    icon={<Lock className="w-5 h-5" />}
                    showPasswordToggle
                    autoFocus
                  />

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div style={{ marginTop: "8px" }}>
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
                          height: "6px",
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
                          animate={{ width: `${strength.percent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <NeonInput
                  label="Confirm Password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  required
                  variant="cyan"
                  icon={<Lock className="w-5 h-5" />}
                  showPasswordToggle
                />

                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
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
                  style={{ marginTop: "6px" }}
                >
                  Reset Password
                </NeonButton>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
