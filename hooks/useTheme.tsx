"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

export type ThemeId =
  | "neon-purple"
  | "neon-green"
  | "neon-blue"
  | "sunset"
  | "light";

export type SkinId = "classic" | "emoji" | "stars-hearts" | "fire-ice";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  accentX: string;
  accentO: string;
  bgPreview: string;
  isLight?: boolean;
}

export interface SkinConfig {
  id: SkinId;
  name: string;
  xLabel: string;
  oLabel: string;
  preview: string;
  description: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "neon-purple",
    name: "Neon Purple",
    tagline: "Cyberpunk Default",
    accentX: "#00FFFF",
    accentO: "#FF00FF",
    bgPreview: "#050505",
    isLight: false,
  },
  {
    id: "neon-green",
    name: "Neon Green",
    tagline: "Matrix Terminal",
    accentX: "#00FF41",
    accentO: "#00FFFF",
    bgPreview: "#030a05",
    isLight: false,
  },
  {
    id: "neon-blue",
    name: "Neon Blue",
    tagline: "Electric Deep Sky",
    accentX: "#00BFFF",
    accentO: "#BF00FF",
    bgPreview: "#020617",
    isLight: false,
  },
  {
    id: "sunset",
    name: "Sunset",
    tagline: "Outrun Synthwave",
    accentX: "#FF5722",
    accentO: "#FF007F",
    bgPreview: "#0c050a",
    isLight: false,
  },
  {
    id: "light",
    name: "Light Mode",
    tagline: "Crisp Cyber Light",
    accentX: "#0284c7",
    accentO: "#c026d3",
    bgPreview: "#f8fafc",
    isLight: true,
  },
];

export const SKINS: SkinConfig[] = [
  {
    id: "classic",
    name: "Classic",
    xLabel: "X",
    oLabel: "O",
    preview: "X / O",
    description: "Original neon icons",
  },
  {
    id: "emoji",
    name: "Emoji",
    xLabel: "❌",
    oLabel: "⭕",
    preview: "❌ / ⭕",
    description: "Cross and circle emojis",
  },
  {
    id: "stars-hearts",
    name: "Stars & Hearts",
    xLabel: "⭐",
    oLabel: "❤️",
    preview: "⭐ / ❤️",
    description: "Golden star & red heart",
  },
  {
    id: "fire-ice",
    name: "Fire & Ice",
    xLabel: "🔥",
    oLabel: "❄️",
    preview: "🔥 / ❄️",
    description: "Blazing flame & ice crystal",
  },
];

const STORAGE_KEYS = {
  THEME: "ttt_theme",
  SKIN: "ttt_skin",
};

export interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
  themes: ThemeConfig[];
  skins: SkinConfig[];
  currentThemeConfig: ThemeConfig;
  currentSkinConfig: SkinConfig;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("neon-purple");
  const [skin, setSkinState] = useState<SkinId>("classic");
  const isInitializedRef = useRef(false);

  // Load saved preferences on client mount
  useEffect(() => {
    if (typeof window === "undefined" || isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId | null;
      const savedSkin = localStorage.getItem(STORAGE_KEYS.SKIN) as SkinId | null;

      if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
        setThemeState(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        document.documentElement.setAttribute("data-theme", "neon-purple");
      }

      if (savedSkin && SKINS.some((s) => s.id === savedSkin)) {
        setSkinState(savedSkin);
      }
    } catch (e) {
      console.warn("[ThemeProvider] Could not read localStorage:", e);
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    } catch {}
  }, []);

  const setSkin = useCallback((newSkin: SkinId) => {
    setSkinState(newSkin);
    try {
      localStorage.setItem(STORAGE_KEYS.SKIN, newSkin);
    } catch {}
  }, []);

  const currentThemeConfig =
    THEMES.find((t) => t.id === theme) || THEMES[0];
  const currentSkinConfig =
    SKINS.find((s) => s.id === skin) || SKINS[0];

  const isLight = theme === "light";

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        skin,
        setSkin,
        themes: THEMES,
        skins: SKINS,
        currentThemeConfig,
        currentSkinConfig,
        isLight,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "neon-purple",
      setTheme: () => {},
      skin: "classic",
      setSkin: () => {},
      themes: THEMES,
      skins: SKINS,
      currentThemeConfig: THEMES[0],
      currentSkinConfig: SKINS[0],
      isLight: false,
    };
  }
  return context;
}

