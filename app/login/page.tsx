"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NeonInput } from "@/components/ui/NeonInput";
import { NeonCard } from "@/components/ui/NeonCard";
import Link from "next/link";
import { Mail, Lock, X, Circle, Loader2, AlertTriangle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useWindowSize } from "@/hooks/useWindowSize";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

export default function LoginPage() {
  const { isMobile, isTablet, isDesktop } = useWindowSize();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "var(--bg-primary, #050505)",
      }}
    >
      <Toaster position="top-right" />

      {/* Floating Theme Switcher */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 50 }}>
        <ThemeSwitcher compact={isMobile} align="right" />
      </div>

      {/* Left Side - Animated (Hidden on mobile) */}
      {!isMobile && (
        <div
          style={{
            width: isTablet ? "35%" : "50%",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-card, rgba(13,13,13,0.5))",
            display: isDesktop ? "flex" : isTablet ? "flex" : "none",
          }}
        >
          <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.2 }} />

          <motion.div
            style={{
              position: "absolute",
              top: isTablet ? "20%" : "25%",
              left: isTablet ? "20%" : "25%",
              color: "rgba(0,255,255,0.3)",
            }}
            animate={{ y: [0, -40, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <X style={{ width: isTablet ? 120 : 192, height: isTablet ? 120 : 192 }} strokeWidth={0.5} />
          </motion.div>

          <motion.div
            style={{
              position: "absolute",
              bottom: isTablet ? "20%" : "25%",
              right: isTablet ? "20%" : "25%",
              color: "rgba(255,0,255,0.3)",
            }}
            animate={{ y: [0, 40, 0], rotate: [0, -180, -360] }}
            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          >
            <Circle style={{ width: isTablet ? 120 : 192, height: isTablet ? 120 : 192 }} strokeWidth={0.5} />
          </motion.div>

          <motion.div
            style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "24px" }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1
              style={{
                fontSize: isTablet ? "32px" : "48px",
                fontWeight: "bold",
                fontFamily: "monospace",
                marginBottom: "16px",
                lineHeight: 1.2,
              }}
            >
              <span className="neon-text-cyan">WELCOME</span>
              <br />
              <span className="neon-text-pink">BACK</span>
            </h1>
            <p
              style={{
                color: "var(--text-muted, #9ca3af)",
                fontSize: isTablet ? "14px" : "18px",
                padding: isTablet ? "0 16px" : "0",
              }}
            >
              Ready for another round?
            </p>
          </motion.div>
        </div>
      )}

      {/* Right Side - Form */}
      <div
        style={{
          width: isMobile ? "100%" : isTablet ? "65%" : "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "20px 16px" : "24px",
        }}
      >
        <motion.div
          style={{ width: "100%", maxWidth: "448px" }}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <LoginForm isMobile={isMobile} />
        </motion.div>
      </div>
    </div>
  );
}

function LoginForm({ isMobile }: { isMobile: boolean }) {
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
  };

  return (
    <>
      <NeonCard variant="cyan" glow>
        <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "32px" }}>
          <h1
            className="neon-text-cyan"
            style={{
              fontSize: isMobile ? "24px" : "28px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            Sign In
          </h1>
          <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: isMobile ? "13px" : "14px" }}>
            Continue your gaming journey
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "14px" : "18px",
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
                className="neon-text-cyan"
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: isMobile ? "12px" : "14px",
                backgroundColor: "rgba(255,49,49,0.1)",
                border: "1px solid #FF3131",
                borderRadius: "12px",
                color: "#FF3131",
                fontSize: isMobile ? "13px" : "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{
              scale: 1.03,
              y: -2,
              boxShadow: "0 0 30px rgba(0,255,255,0.8)",
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            style={{
              width: "100%",
              minHeight: isMobile ? "48px" : "56px",
              border: "2px solid #00FFFF",
              borderRadius: "14px",
              background: "rgba(0,255,255,0.03)",
              color: "#00FFFF",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all .3s ease",
              boxShadow: "0 0 15px rgba(0,255,255,.35)",
              textShadow: "0 0 10px #00FFFF",
              backdropFilter: "blur(8px)",
              opacity: isLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,255,255,.08)";
              e.currentTarget.style.borderColor = "#66FFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,255,255,.03)";
              e.currentTarget.style.borderColor = "#00FFFF";
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                Loading...
              </>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        <div
          style={{
            marginTop: isMobile ? "24px" : "28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: isMobile ? "13px" : "14px", margin: 0 }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="neon-text-pink" style={{ fontWeight: 600 }}>
              Sign Up
            </Link>
          </p>
        </div>
      </NeonCard>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
        onSuccess={(updatedEmail) => {
          setEmail(updatedEmail);
          setPassword("");
        }}
      />
    </>
  );
}
