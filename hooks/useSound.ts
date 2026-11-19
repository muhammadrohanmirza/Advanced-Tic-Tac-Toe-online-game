"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

export type SoundEffectType =
  | "placeX"
  | "placeO"
  | "win"
  | "lose"
  | "draw"
  | "chat"
  | "click"
  | "timerWarning";

export interface SoundContextType {
  playSfx: (type: SoundEffectType) => void;
  sfxVolume: number;
  musicVolume: number;
  isSfxMuted: boolean;
  isMusicMuted: boolean;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleSfxMute: () => void;
  toggleMusicMute: () => void;
}

const STORAGE_KEYS = {
  SFX_VOLUME: "ttt_sfx_volume",
  MUSIC_VOLUME: "ttt_music_volume",
  SFX_MUTED: "ttt_sfx_muted",
  MUSIC_MUTED: "ttt_music_muted",
};

/**
 * Web Audio API synthesizer engine.
 * Fully procedural: requires no external audio assets or downloads.
 */
class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isUnlocked = false;
  private musicInterval: NodeJS.Timeout | null = null;
  private activeMusicOscillators: OscillatorNode[] = [];
  private currentChordIndex = 0;

  // D minor cyberpunk ambient progression: Dm, Bb, Gm, A
  private readonly chordProgression = [
    [146.83, 220.0, 349.23], // D3, A3, F4 (Dm)
    [116.54, 174.61, 293.66], // Bb2, F3, D4 (Bb)
    [98.0, 146.83, 233.08], // G2, D3, Bb3 (Gm)
    [110.0, 164.81, 277.18], // A2, E3, C#4 (A)
  ];

  private readonly leadNotes = [587.33, 698.46, 880.0, 1046.5]; // D5, F5, A5, C6

  public init() {
    if (typeof window === "undefined" || this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.sfxGain.connect(this.ctx.destination);
    this.musicGain.connect(this.ctx.destination);
  }

  public unlock() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this.isUnlocked = true;
  }

  public updateSfxGain(volume: number, isMuted: boolean) {
    if (!this.sfxGain || !this.ctx) return;
    const target = isMuted ? 0 : Math.max(0, Math.min(1, volume));
    this.sfxGain.gain.setValueAtTime(target, this.ctx.currentTime);
  }

  public updateMusicGain(volume: number, isMuted: boolean) {
    if (!this.musicGain || !this.ctx) return;
    const target = isMuted ? 0 : Math.max(0, Math.min(1, volume * 0.25));
    this.musicGain.gain.setValueAtTime(target, this.ctx.currentTime);
  }

  public playSfx(type: SoundEffectType) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (type) {
      case "click": {
        // High-tech subtle tactile UI pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case "placeX": {
        // Energetic neon slice / zap for X
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.11);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2400, now);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case "placeO": {
        // Resonant harmonic warm bubble chime for O
        const fundamental = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();

        fundamental.type = "sine";
        fundamental.frequency.setValueAtTime(440, now);
        fundamental.frequency.exponentialRampToValueAtTime(587.33, now + 0.16);

        overtone.type = "sine";
        overtone.frequency.setValueAtTime(880, now);
        overtone.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        fundamental.connect(gain);
        overtone.connect(gain);
        gain.connect(this.sfxGain);

        fundamental.start(now);
        overtone.start(now);
        fundamental.stop(now + 0.19);
        overtone.stop(now + 0.19);
        break;
      }

      case "win": {
        // Triumphant 4-note ascending neon arpeggio: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const noteTime = now + i * 0.11;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = i === notes.length - 1 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(freq, noteTime);

          const duration = i === notes.length - 1 ? 0.6 : 0.18;
          gain.gain.setValueAtTime(0.3, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

          osc.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(noteTime);
          osc.stop(noteTime + duration + 0.05);
        });
        break;
      }

      case "lose": {
        // Minor descending defeat slide
        const notes = [392.0, 349.23, 311.13, 261.63];
        notes.forEach((freq, i) => {
          const noteTime = now + i * 0.12;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, noteTime);
          if (i === notes.length - 1) {
            osc.frequency.exponentialRampToValueAtTime(180, noteTime + 0.4);
          }

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(900, noteTime);

          const duration = i === notes.length - 1 ? 0.5 : 0.16;
          gain.gain.setValueAtTime(0.25, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(noteTime);
          osc.stop(noteTime + duration + 0.05);
        });
        break;
      }

      case "draw": {
        // Dual metallic chime
        [440.0, 415.3].forEach((freq, i) => {
          const noteTime = now + i * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.25, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

          osc.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(noteTime);
          osc.stop(noteTime + 0.3);
        });
        break;
      }

      case "chat": {
        // Crisp double ping for incoming chat messages
        [880.0, 1318.51].forEach((freq, i) => {
          const noteTime = now + i * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.22, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.1);

          osc.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(noteTime);
          osc.stop(noteTime + 0.11);
        });
        break;
      }

      case "timerWarning": {
        // Urgent warning beep for low timer (< 5s)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
    }
  }

  public startMusic() {
    this.unlock();
    if (!this.ctx || !this.musicGain || this.musicInterval) return;

    this.playNextChord();
    this.musicInterval = setInterval(() => {
      this.playNextChord();
    }, 3200);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.activeMusicOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // Ignore if already stopped
      }
    });
    this.activeMusicOscillators = [];
  }

  private playNextChord() {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chord = this.chordProgression[this.currentChordIndex];
    this.currentChordIndex =
      (this.currentChordIndex + 1) % this.chordProgression.length;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(1.5, now);

    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.001, now);
    chordGain.gain.linearRampToValueAtTime(0.12, now + 0.9);
    chordGain.gain.setValueAtTime(0.12, now + 2.0);
    chordGain.gain.exponentialRampToValueAtTime(0.001, now + 3.15);

    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 3.2);

      this.activeMusicOscillators.push(osc);
    });

    // Occasional gentle high sparkle note
    const sparkleNote =
      this.leadNotes[Math.floor(Math.random() * this.leadNotes.length)];
    const leadOsc = ctx.createOscillator();
    const leadGain = ctx.createGain();
    const leadTime = now + 1.2;

    leadOsc.type = "triangle";
    leadOsc.frequency.setValueAtTime(sparkleNote, leadTime);

    leadGain.gain.setValueAtTime(0.001, leadTime);
    leadGain.gain.linearRampToValueAtTime(0.04, leadTime + 0.2);
    leadGain.gain.exponentialRampToValueAtTime(0.001, leadTime + 1.4);

    leadOsc.connect(filter);
    filter.connect(chordGain);
    chordGain.connect(this.musicGain);

    leadOsc.start(leadTime);
    leadOsc.stop(leadTime + 1.5);
    this.activeMusicOscillators.push(leadOsc);

    // Prune stopped nodes
    setTimeout(() => {
      this.activeMusicOscillators = this.activeMusicOscillators.filter(
        (o) => o !== leadOsc
      );
    }, 3500);
  }
}

const audioEngine = new WebAudioEngine();

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [sfxVolume, setSfxVolumeState] = useState<number>(0.7);
  const [musicVolume, setMusicVolumeState] = useState<number>(0.35);
  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(false);
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(true); // Music defaults to muted (optional)

  const isInitializedRef = useRef(false);

  // Load persisted settings from localStorage
  useEffect(() => {
    if (typeof window === "undefined" || isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const storedSfxVol = localStorage.getItem(STORAGE_KEYS.SFX_VOLUME);
      const storedMusicVol = localStorage.getItem(STORAGE_KEYS.MUSIC_VOLUME);
      const storedSfxMute = localStorage.getItem(STORAGE_KEYS.SFX_MUTED);
      const storedMusicMute = localStorage.getItem(STORAGE_KEYS.MUSIC_MUTED);

      if (storedSfxVol !== null) {
        const val = parseFloat(storedSfxVol);
        if (!isNaN(val)) setSfxVolumeState(val);
      }
      if (storedMusicVol !== null) {
        const val = parseFloat(storedMusicVol);
        if (!isNaN(val)) setMusicVolumeState(val);
      }
      if (storedSfxMute !== null) {
        setIsSfxMuted(storedSfxMute === "true");
      }
      if (storedMusicMute !== null) {
        setIsMusicMuted(storedMusicMute === "true");
      }
    } catch (e) {
      console.warn("[SoundProvider] Could not load audio preferences:", e);
    }
  }, []);

  // Update engine gain on state changes
  useEffect(() => {
    audioEngine.updateSfxGain(sfxVolume, isSfxMuted);
  }, [sfxVolume, isSfxMuted]);

  useEffect(() => {
    audioEngine.updateMusicGain(musicVolume, isMusicMuted);
    if (!isMusicMuted && musicVolume > 0) {
      audioEngine.startMusic();
    } else {
      audioEngine.stopMusic();
    }
  }, [musicVolume, isMusicMuted]);

  // Autoplay compliance: unlock AudioContext only on first user gesture
  useEffect(() => {
    const handleFirstGesture = () => {
      audioEngine.unlock();
      if (!isMusicMuted && musicVolume > 0) {
        audioEngine.startMusic();
      }
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
    };

    window.addEventListener("pointerdown", handleFirstGesture, { once: true });
    window.addEventListener("keydown", handleFirstGesture, { once: true });
    window.addEventListener("click", handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
      audioEngine.stopMusic();
    };
  }, [isMusicMuted, musicVolume]);

  const setSfxVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setSfxVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.SFX_VOLUME, clamped.toString());
    } catch {}
  }, []);

  const setMusicVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setMusicVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, clamped.toString());
    } catch {}
  }, []);

  const toggleSfxMute = useCallback(() => {
    setIsSfxMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.SFX_MUTED, next.toString());
      } catch {}
      return next;
    });
  }, []);

  const toggleMusicMute = useCallback(() => {
    setIsMusicMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.MUSIC_MUTED, next.toString());
      } catch {}
      return next;
    });
  }, []);

  const playSfx = useCallback(
    (type: SoundEffectType) => {
      if (isSfxMuted) return;
      audioEngine.playSfx(type);
    },
    [isSfxMuted]
  );

  return React.createElement(
    SoundContext.Provider,
    {
      value: {
        playSfx,
        sfxVolume,
        musicVolume,
        isSfxMuted,
        isMusicMuted,
        setSfxVolume,
        setMusicVolume,
        toggleSfxMute,
        toggleMusicMute,
      },
    },
    children
  );
}

export function useSound(): SoundContextType {
  const context = useContext(SoundContext);
  if (!context) {
    // Graceful fallback so components can render safely even outside Provider
    return {
      playSfx: () => {},
      sfxVolume: 0.7,
      musicVolume: 0.35,
      isSfxMuted: false,
      isMusicMuted: true,
      setSfxVolume: () => {},
      setMusicVolume: () => {},
      toggleSfxMute: () => {},
      toggleMusicMute: () => {},
    };
  }
  return context;
}
