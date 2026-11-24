"use client";

import React, { useState } from "react";
import { Palette, Settings } from "lucide-react";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { SettingsModal } from "@/components/ui/SettingsModal";

interface ThemeSwitcherProps {
  align?: "left" | "right";
  compact?: boolean;
}

export function ThemeSwitcher({
  align = "right",
  compact = false,
}: ThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <RoundIconButton
        variant="dark"
        size={compact ? 38 : 44}
        ariaLabel="Settings & Themes"
        onClick={() => setIsOpen(true)}
      >
        <Settings style={{ width: compact ? "18px" : "20px", height: compact ? "18px" : "20px" }} />
      </RoundIconButton>

      <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
