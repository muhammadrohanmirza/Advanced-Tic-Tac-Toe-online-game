"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, AlertTriangle, Loader2, KeyRound } from "lucide-react";
import { NeonInput } from "@/components/ui/NeonInput";
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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { percent: 0, label: "", color: "transparent" };
    if (pwd.length < 8) return { percent: 30, label: "Too short (min 8)", color: "#FF3131" };
    const hasNum = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const variety = [hasNum, hasSpecial, hasUpper].filter(Boolean).length;
    if (variety === 0) return { percent: 55, label: "Fair", color: "#FFD700" };
    if (variety === 1) return { percent: 75, label: "Good", color: "#00FFFF" };
    return { level: 100, percent: 100, label: "Strong", color: "#00FF41" };
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: "16px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "440px",
              backgroundColor: "var(--bg-card, #0d0d0d)",
              border: "1px solid var(--accent-x, #00FFFF)",
              boxShadow: "0 0 30px rgba(0, 255, 255, 0.25)",
              borderRadius: "18px",
              padding: "28px 24px",
              color: "var(--text-primary, #ffffff)",
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                borderRadius: "8px",
                color: "var(--text-muted, #9ca3af)",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#FF3131";
                e.currentTarget.style.borderColor = "#FF3131";
                e.currentTarget.style.boxShadow = "0 0 10px rgba(255,49,49,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted, #9ca3af)";
                e.currentTarget.style.borderColor = "var(--border-color, rgba(255, 255, 255, 0.1))";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <X size={18} />
            </button>

            {/* Header Icon */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "rgba(0, 255, 255, 0.1)",
                  border: "2px solid #00FFFF",
                  boxShadow: "0 0 18px rgba(0, 255, 255, 0.4)",
                  marginBottom: "12px",
                }}
              >
                <KeyRound size={26} style={{ color: "#00FFFF" }} />
              </div>
              <h2
                className="neon-text-cyan"
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  margin: "0 0 6px 0",
                  letterSpacing: "0.5px",
                }}
              >
                {step === 1 ? "Forgot Password" : "Create New Password"}
              </h2>
              <p
                style={{
                  color: "var(--text-muted, #9ca3af)",
                  fontSize: "13px",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {step === 1
                  ? "Enter your account email to proceed with reset"
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
                      backgroundColor: "rgba(255, 49, 49, 0.12)",
                      border: "1px solid #FF3131",
                      borderRadius: "10px",
                      color: "#FF3131",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,255,255,0.7)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%",
                    minHeight: "46px",
                    border: "2px solid #00FFFF",
                    borderRadius: "12px",
                    background: "rgba(0, 255, 255, 0.08)",
                    color: "#00FFFF",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "6px",
                    boxShadow: "0 0 12px rgba(0,255,255,0.3)",
                    transition: "all 0.2s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </motion.button>
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
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(0, 255, 255, 0.06)",
                    border: "1px solid rgba(0, 255, 255, 0.2)",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "var(--text-muted, #9ca3af)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Account: <strong style={{ color: "#00FFFF" }}>{email}</strong>
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
                      color: "var(--text-muted, #9ca3af)",
                      fontSize: "12px",
                      textDecoration: "underline",
                      cursor: "pointer",
                      marginLeft: "8px",
                      whiteSpace: "nowrap",
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
                          fontSize: "11px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: "var(--text-muted, #9ca3af)" }}>Strength</span>
                        <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                      </div>
                      <div
                        style={{
                          height: "5px",
                          backgroundColor: "var(--border-color, #222)",
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
                      backgroundColor: "rgba(255, 49, 49, 0.12)",
                      border: "1px solid #FF3131",
                      borderRadius: "10px",
                      color: "#FF3131",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,255,255,0.7)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%",
                    minHeight: "46px",
                    border: "2px solid #00FFFF",
                    borderRadius: "12px",
                    background: "rgba(0, 255, 255, 0.08)",
                    color: "#00FFFF",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "6px",
                    boxShadow: "0 0 12px rgba(0,255,255,0.3)",
                    transition: "all 0.2s ease",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

