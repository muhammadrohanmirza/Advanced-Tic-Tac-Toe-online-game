"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChatBox } from "@/components/game/ChatBox";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Confetti from "react-confetti";
import {
  LogOut,
  Trophy,
  Timer,
  AlertTriangle,
  Eye,
  Play,
  ArrowLeft,
  Copy,
  Check,
  Users,
  Crown,
  Sparkles,
  Zap,
  RefreshCw,
  History,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket-client";
import { useWindowSize } from "@/hooks/useWindowSize";
import { ChatMessage, AllowedReaction, ReactionPayload, Spectator } from "@/types/game";
import { SoundControls } from "@/components/ui/SoundControls";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { GameSkinIcon } from "@/components/game/GameSkinIcon";
import { FloatingReactionsOverlay, ActiveReaction } from "@/components/game/FloatingReactionsOverlay";
import { useSound } from "@/hooks/useSound";
import { useWebRTC } from "@/hooks/useWebRTC";
import { CallBar } from "@/components/game/CallBar";
import { VideoPanel, RemoteAudioElements } from "@/components/game/VideoPanel";
import { CallModals } from "@/components/game/CallModals";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { CrownBadge } from "@/components/ui/CrownBadge";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";
import { WinLoseDrawOverlay } from "@/components/game/WinLoseDrawOverlay";
import { GameCell } from "@/components/game/GameCell";

type CellValue = "X" | "O" | null;
type TurnPlayer = "X" | "O";

const gameButtonStyle = (
  color: string,
  glow: string,
  bg: string = "rgba(255,255,255,0.03)",
  isMobile: boolean = false
) => ({
  width: isMobile ? "100%" : "300px",
  minHeight: "50px",
  border: `2px solid ${color}`,
  borderRadius: "14px",
  background: bg,
  color,
  fontSize: "16px",
  fontWeight: 700,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  cursor: "pointer",
  boxShadow: glow,
  textShadow: `0 0 8px ${color}`,
});

export default function GameRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.roomId as string;
  const isSpectateParam = searchParams?.get("spectate") === "true";
  const { isMobile, isTablet, isDesktop, width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<TurnPlayer>("X");
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "finished">("waiting");
  const [winner, setWinner] = useState<TurnPlayer | "draw" | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<TurnPlayer | null>("X");
  const [opponentName, setOpponentName] = useState("Waiting...");
  const [player1Name, setPlayer1Name] = useState("Player 1");
  const [player2Name, setPlayer2Name] = useState("Player 2");
  const [isSpectator, setIsSpectator] = useState<boolean>(isSpectateParam);
  const [spectators, setSpectators] = useState<Spectator[]>([]);
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  const [spectatorsPage, setSpectatorsPage] = useState<number>(1);
  const [spectatorsTotalPages, setSpectatorsTotalPages] = useState<number>(1);
  const [isLoadingSpectators, setIsLoadingSpectators] = useState(false);
  const [spectatorSearchQuery, setSpectatorSearchQuery] = useState("");
  const [showSpectatorList, setShowSpectatorList] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  const canonicalRoomIdRef = useRef<string | null>(null);
  const joinedRef = useRef<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchAccepted, setRematchAccepted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [floatingReactions, setFloatingReactions] = useState<ActiveReaction[]>([]);
  const [showReactionsInChat, setShowReactionsInChat] = useState<boolean>(false);
  const showReactionsInChatRef = useRef<boolean>(false);
  const [hideSpectatorReactions, setHideSpectatorReactions] = useState<boolean>(false);
  const hideSpectatorReactionsRef = useRef<boolean>(false);
  const [opponentOnline, setOpponentOnline] = useState(true);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const prevBoardRef = useRef<CellValue[]>(Array(9).fill(null));
  const [turnDuration, setTurnDuration] = useState<number>(0);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [turnStartTime, setTurnStartTime] = useState<number | null>(null);
  const [timeoutCountX, setTimeoutCountX] = useState<number>(0);
  const [timeoutCountO, setTimeoutCountO] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const lastWarningPlayedRef = useRef<number | null>(null);

  const { playSfx } = useSound();
  const socket = getSocket();

  // WebRTC Voice & Video Call Hook
  const [isCallPanelOpen, setIsCallPanelOpen] = useState(true);
  const {
    callState,
    isInCall,
    isRinging,
    localStream,
    remoteStreams,
    peerDiagnostics,
    micOn,
    cameraOn,
    isDeafened,
    mutedByModerator,
    mutedForMe,
    hiddenVideoForMe,
    speakingUsers,
    incomingCall,
    incomingJoinRequest,
    isPendingJoin,
    audioBlocked,
    setAudioBlocked,
    startCall,
    joinCall,
    leaveCall,
    endCall,
    respondIncomingCall,
    respondJoinRequest,
    toggleMic,
    toggleCamera,
    toggleDeafen,
    toggleMuteForMe,
    toggleHideVideoForMe,
    moderateParticipant,
    changeCallSetting,
    resumeAudio,
  } = useWebRTC({
    roomId: canonicalRoomIdRef.current || roomId,
    userId: session?.user?.id || "",
    userName: session?.user?.name || "Player",
    isPlayer: !isSpectator,
    isHost: Boolean(session?.user?.id && playerSymbol === "X"),
    socket,
  });

  // Calculate responsive board size - ensure it fits within container
  const getBoardSize = () => {
    if (isMobile) {
      const maxW = Math.min(width - 32, 340);
      const maxH = height < 500 ? height * 0.62 : 360;
      return Math.max(220, Math.floor(Math.min(maxW, maxH)));
    } else if (isTablet) {
      return Math.min(width * 0.45, 380);
    }
    return 360;
  };

  const boardSize = getBoardSize();
  const cellGap = isMobile ? 6 : 8;
  const boardPadding = isMobile ? 16 : 24;
  const cellSize = (boardSize - (boardPadding * 2) - (cellGap * 2)) / 3;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
    setFloatingReactions([]);
  }, [roomId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ttt_show_reactions_in_chat");
      if (saved !== null) {
        const val = saved === "true";
        setShowReactionsInChat(val);
        showReactionsInChatRef.current = val;
      } else {
        setShowReactionsInChat(false);
        showReactionsInChatRef.current = false;
      }

      const savedRx = localStorage.getItem("ttt_hide_spectator_reactions");
      if (savedRx !== null) {
        const valRx = savedRx === "true";
        setHideSpectatorReactions(valRx);
        hideSpectatorReactionsRef.current = valRx;
      } else {
        setHideSpectatorReactions(false);
        hideSpectatorReactionsRef.current = false;
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleShowInChat = (enabled: boolean) => {
    setShowReactionsInChat(enabled);
    showReactionsInChatRef.current = enabled;
    try {
      localStorage.setItem("ttt_show_reactions_in_chat", String(enabled));
    } catch {
      // ignore
    }
  };

  const handleToggleHideSpectatorReactions = (hide: boolean) => {
    setHideSpectatorReactions(hide);
    hideSpectatorReactionsRef.current = hide;
    try {
      localStorage.setItem("ttt_hide_spectator_reactions", String(hide));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!roomId || roomId === "undefined") {
      console.error("[Room] Invalid roomId:", roomId);
      toast.error("Invalid room");
      router.push("/lobby");
      return;
    }

    if (!session?.user?.id) return;
    if (!socket) return;

    const currentUserId = session.user.id;
    const currentUserName = session.user.name || (isSpectateParam ? "Spectator" : "Player");
    const joinKey = `${roomId}:${isSpectateParam ? "spectate" : "player"}:${currentUserId}`;

    const emitJoin = () => {
      if (isSpectateParam) {
        console.log("[Room] Emitting spectate-room:", roomId);
        socket.emit("spectate-room", {
          roomId,
          userId: currentUserId,
          userName: currentUserName,
        });
      } else {
        sessionStorage.setItem(`joined-room-${roomId}`, "true");
        console.log("[Room] Emitting get-room:", roomId);
        socket.emit("get-room", { roomId, userId: currentUserId });
      }
    };

    if (joinedRef.current !== joinKey) {
      joinedRef.current = joinKey;
      emitJoin();
    }

    // Re-emit on real socket reconnect
    const handleReconnect = () => {
      console.log("[Room] Socket reconnected, re-joining room:", roomId);
      emitJoin();
    };

    socket.on("connect", handleReconnect);
    return () => {
      socket.off("connect", handleReconnect);
    };
  }, [roomId, session?.user?.id, session?.user?.name, isSpectateParam, socket, router]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("room-joined", (data: any) => {
      console.log("[Room] room-joined:", data);
      const room = data?.room || data;
      if (room) {
        canonicalRoomIdRef.current = room.id;
        if (room.code) setRoomCode(room.code);
        const normalizedBoard = (room.board || []).map((cell: string) => cell === "" ? null : cell as CellValue);
        setBoard(normalizedBoard);
        setCurrentTurn(room.currentTurn || "X");
        setGameStatus(room.status || "playing");
        if (room.player1) setPlayer1Name(room.player1.name);
        if (room.player2) setPlayer2Name(room.player2.name);
        if (room.player1?.id === session?.user?.id) {
          setIsSpectator(false);
          setPlayerSymbol("X");
          setOpponentName(room.player2?.name || "Opponent");
        } else if (room.player2?.id === session?.user?.id) {
          setIsSpectator(false);
          setPlayerSymbol("O");
          setOpponentName(room.player1?.name || "Opponent");
        }
      }
    });

    socket.on("room-data", (data: any) => {
      console.log("[Room] room-data:", data);
      const room = data?.room;
      if (!room) {
        console.error("[Room] Room data is empty");
        sessionStorage.removeItem(`joined-room-${roomId}`);
        joinedRef.current = null;
        toast.error("Room not found");
        router.push("/lobby");
        return;
      }
      canonicalRoomIdRef.current = room.id;
      if (room.code) setRoomCode(room.code);
      const normalizedBoard = (room.board || []).map((cell: string) => cell === "" ? null : cell as CellValue);
      setBoard(normalizedBoard);
      setCurrentTurn(room.currentTurn || "X");
      setGameStatus(room.status || "playing");
      setOpponentOnline(Boolean(room.player2 && room.player2.id !== session?.user?.id) || Boolean(room.player1 && room.player1.id !== session?.user?.id));
      setOpponentTyping(false);

      if (typeof room.turnDuration === "number") setTurnDuration(room.turnDuration);
      setTurnDeadline(room.turnDeadline || null);
      setTurnStartTime(room.turnStartTime || null);
      if (typeof room.timeoutCountX === "number") setTimeoutCountX(room.timeoutCountX);
      if (typeof room.timeoutCountO === "number") setTimeoutCountO(room.timeoutCountO);

      if (typeof data.isSpectator === "boolean") {
        setIsSpectator(data.isSpectator);
      }
      if (typeof data.spectatorCount === "number") {
        setSpectatorCount(data.spectatorCount);
      } else if (Array.isArray(data.spectators)) {
        setSpectatorCount(data.spectators.length);
      }
      if (Array.isArray(data.spectators)) {
        setSpectators(data.spectators);
      }

      // Populate chat history sent by server
      if (Array.isArray(data.messages) || Array.isArray(room.messages)) {
        const history: ChatMessage[] = data.messages || room.messages || [];
        setChatMessages(history);
      }

      if (room.player1) setPlayer1Name(room.player1.name);
      if (room.player2) setPlayer2Name(room.player2.name);

      const isPlayer1 = room.player1?.id === session?.user?.id;
      const isPlayer2 = room.player2?.id === session?.user?.id;

      if (isPlayer1) {
        setIsSpectator(false);
        setPlayerSymbol("X");
        setOpponentName(room.player2?.name || "Waiting...");
      } else if (isPlayer2) {
        setIsSpectator(false);
        setPlayerSymbol("O");
        setOpponentName(room.player1?.name || "Waiting...");
      } else {
        setIsSpectator(true);
        setPlayerSymbol(null);
        setOpponentName(room.player2?.name || room.player1?.name || "Players");
      }
    });

    socket.on("spectator-joined", (data: any) => {
      console.log("[Room] spectator-joined:", data);
      if (typeof data?.spectatorsCount === "number") {
        setSpectatorCount(data.spectatorsCount);
      }
      if (data?.spectator) {
        setSpectators((prev) => {
          if (prev.some((s) => s.id === data.spectator.id)) return prev;
          return [...prev, data.spectator];
        });
      }
      if (data?.spectator && data.spectator.id !== session?.user?.id) {
        toast(`${data.spectator.name || "A spectator"} is now watching`, { icon: "👁️" });
      }
    });

    socket.on("spectator-left", (data: any) => {
      console.log("[Room] spectator-left:", data);
      if (typeof data?.spectatorsCount === "number") {
        setSpectatorCount(data.spectatorsCount);
      }
      if (data?.spectatorId) {
        setSpectators((prev) => prev.filter((s) => s.id !== data.spectatorId));
      }
    });

    socket.on("spectator-count-updated", (data: any) => {
      console.log("[Room] spectator-count-updated:", data);
      if (typeof data?.count === "number") {
        setSpectatorCount(data.count);
      }
    });

    socket.on("spectators-list", (data: any) => {
      console.log("[Room] spectators-list:", data);
      setIsLoadingSpectators(false);
      if (Array.isArray(data?.spectators)) {
        if (data.page === 1) {
          setSpectators(data.spectators);
        } else {
          setSpectators((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newSpecs = data.spectators.filter((s: Spectator) => !existingIds.has(s.id));
            return [...prev, ...newSpecs];
          });
        }
      }
      if (typeof data?.page === "number") setSpectatorsPage(data.page);
      if (typeof data?.totalPages === "number") setSpectatorsTotalPages(data.totalPages);
      if (typeof data?.total === "number") setSpectatorCount(data.total);
    });

    socket.on("player-joined", (data: any) => {
      console.log("[Room] player-joined:", data);
      toast.success("Opponent joined!");
      setGameStatus("playing");
      if (data.player) {
        setOpponentName(data.player.name);
        setPlayer2Name(data.player.name);
        setOpponentOnline(true);
      }
      const room = data?.room;
      if (room) {
        if (room.player1) setPlayer1Name(room.player1.name);
        if (room.player2) setPlayer2Name(room.player2.name);
        const normalizedBoard = (room.board || []).map((cell: string) => cell === "" ? null : cell as CellValue);
        setBoard(normalizedBoard);
        setCurrentTurn(room.currentTurn || "X");
        if (typeof room.turnDuration === "number") setTurnDuration(room.turnDuration);
        setTurnDeadline(room.turnDeadline || null);
        setTurnStartTime(room.turnStartTime || null);
        if (typeof room.timeoutCountX === "number") setTimeoutCountX(room.timeoutCountX);
        if (typeof room.timeoutCountO === "number") setTimeoutCountO(room.timeoutCountO);
      }
    });

    socket.on("board-updated", (data: any) => {
      console.log("[Room] board-updated:", data);
      const normalizedBoard = (data.board || []).map((cell: string) => cell === "" ? null : cell as CellValue);

      let movePlayed: CellValue = null;
      if (typeof data.lastMove === "number" && normalizedBoard[data.lastMove]) {
        movePlayed = normalizedBoard[data.lastMove];
      } else {
        for (let i = 0; i < 9; i++) {
          if (!prevBoardRef.current[i] && normalizedBoard[i]) {
            movePlayed = normalizedBoard[i];
            break;
          }
        }
      }

      if (movePlayed === "X") {
        playSfx("placeX");
      } else if (movePlayed === "O") {
        playSfx("placeO");
      }

      prevBoardRef.current = normalizedBoard;
      setBoard(normalizedBoard);
      setCurrentTurn(data.currentTurn || "X");
      if (typeof data.turnDuration === "number") setTurnDuration(data.turnDuration);
      setTurnDeadline(data.turnDeadline || null);
      setTurnStartTime(data.turnStartTime || null);
      if (typeof data.timeoutCountX === "number") setTimeoutCountX(data.timeoutCountX);
      if (typeof data.timeoutCountO === "number") setTimeoutCountO(data.timeoutCountO);

      if (data.winner) {
        setWinner(data.winner);
        setGameStatus("finished");
        setShowGameOverOverlay(true);
        setTurnDeadline(null);
        setTimeLeft(null);
      }
      if (data.winningLine) {
        setWinningLine(data.winningLine);
      }
    });

    socket.on("game-over", (data: any) => {
      console.log("[Room] game-over:", data);
      setWinner(data.winner);
      setWinningLine(data.winningLine);
      setGameStatus("finished");
      setShowGameOverOverlay(true);
      setTurnDeadline(null);
      setTimeLeft(null);
      if (data?.gameId) {
        setGameId(data.gameId);
      }

      if (isSpectator) {
        if (data.isForfeit) {
          playSfx("win");
          toast.error(`Opponent forfeited after 3 timeouts! Player ${data.winner} won!`);
        } else if (data.winner === "draw") {
          playSfx("draw");
          toast("Game ended in a draw!", { icon: "🤝" });
        } else {
          playSfx("win");
          toast.success(`🎉 Player ${data.winner} Won!`);
        }
        return;
      }

      if (data.isForfeit) {
        const didIWin = data.winner === playerSymbol;
        if (didIWin) {
          playSfx("win");
          setShowConfetti(true);
          toast.success("🎉 Opponent forfeited (3 timeouts)! You Won!");
          setTimeout(() => setShowConfetti(false), 5000);
        } else {
          playSfx("lose");
          toast.error("You forfeited the game after 3 timeouts!");
        }
        return;
      }

      if (data.winner === playerSymbol) {
        playSfx("win");
        setShowConfetti(true);
        toast.success("🎉 You Won!");
        setTimeout(() => setShowConfetti(false), 5000);
        if (session?.user) {
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result: "win", opponent: opponentName }),
          }).catch(console.error);
        }
      } else if (data.winner === "draw") {
        playSfx("draw");
        toast("Draw!");
      } else {
        playSfx("lose");
        toast.error("You Lost");
        if (session?.user) {
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result: "loss", opponent: opponentName }),
          }).catch(console.error);
        }
      }
    });

    socket.on("opponent-left", (data: any) => {
      console.log("[Room] opponent-left:", data);
      if (isSpectator) {
        toast.error("A player left the game!");
      } else {
        toast.error("Opponent left!");
      }
      setGameStatus("finished");
      setOpponentOnline(false);
      setOpponentTyping(false);
    });

    socket.on("user-typing", (data: any) => {
      if (data?.userId === session?.user?.id) return;
      setOpponentTyping(Boolean(data?.isTyping));
    });

    socket.on("new-message", (message: any) => {
      const normalizedMessage: ChatMessage = {
        id: message?.id || `${message?.senderId || "system"}-${message?.timestamp || Date.now()}`,
        roomId: message?.roomId || roomId,
        message: message?.message || "",
        senderName: message?.senderName || "System",
        senderId: message?.senderId || "system",
        timestamp: typeof message?.timestamp === "number" ? message.timestamp : Date.now(),
        isSystem: Boolean(message?.isSystem),
        role: message?.role,
      };

      if (normalizedMessage.senderId !== session?.user?.id) {
        playSfx("chat");
      }
      setChatMessages((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === normalizedMessage.id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = normalizedMessage;
          return updated;
        }
        return [...prev.slice(-99), normalizedMessage];
      });
    });

    socket.on("new-reaction", (data: ReactionPayload) => {
      console.log("[Room] new-reaction:", data);

      // If player chooses to hide spectator reactions, ignore reactions from spectators
      if (hideSpectatorReactionsRef.current && data?.role === "spectator") {
        return;
      }

      if (data?.senderId !== session?.user?.id) {
        playSfx("chat");
      }

      setFloatingReactions((prev) => {
        // Limit to at most 8 floating emojis on screen at the same time: drop extras
        if (prev.length >= 8) {
          return prev;
        }

        const randomOffset = Math.floor(Math.random() * 61) - 30;
        const newFloating: ActiveReaction = {
          id: data.id || `float-${Date.now()}-${Math.random()}`,
          reaction: data.reaction,
          senderId: data.senderId,
          senderName: data.senderName,
          xOffset: randomOffset,
          createdAt: data.timestamp || Date.now(),
          role: data.role,
        };

        setTimeout(() => {
          setFloatingReactions((p) => p.filter((r) => r.id !== newFloating.id));
        }, 2500);

        return [...prev, newFloating];
      });

      if (showReactionsInChatRef.current) {
        const isMine = data.senderId === session?.user?.id;
        const now = data.timestamp || Date.now();
        const displayName = isMine ? "You" : data.senderName;
        const COLLAPSE_WINDOW_MS = 6000;

        setChatMessages((prev) => {
          if (prev.some((item) => item.id === `rx-chat-${data.id}`)) {
            return prev;
          }

          const lastMsg = prev[prev.length - 1];

          if (
            lastMsg &&
            lastMsg.isSystem &&
            lastMsg.senderId === `rx-sender-${data.senderId}` &&
            now - lastMsg.timestamp < COLLAPSE_WINDOW_MS
          ) {
            const updatedLastMsg: ChatMessage = {
              ...lastMsg,
              message: `${lastMsg.message} ${data.reaction}`,
              timestamp: now,
            };
            return [...prev.slice(0, -1), updatedLastMsg];
          }

          const systemMessage: ChatMessage = {
            id: `rx-chat-${data.id}`,
            roomId: data.roomId,
            message: `${displayName} reacted with ${data.reaction}`,
            senderName: "System",
            senderId: `rx-sender-${data.senderId}`,
            timestamp: now,
            isSystem: true,
            role: data.role,
          };

          return [...prev.slice(-49), systemMessage];
        });
      }
    });

    socket.on("reaction-cooldown", (data: any) => {
      toast(data?.message || "Please wait before reacting again", { icon: "⏳" });
    });

    socket.on("rematch-started", (data: any) => {
      console.log("[Room] rematch-started:", data);
      const room = data?.room;
      if (room) {
        prevBoardRef.current = Array(9).fill(null);
        setBoard(Array(9).fill(null));
        setCurrentTurn("X");
        setGameStatus("playing");
        setWinner(null);
        setWinningLine(null);
        setShowGameOverOverlay(false);
        setRematchRequested(false);
        setRematchAccepted(false);
        setGameId(null);
        if (typeof room.turnDuration === "number") setTurnDuration(room.turnDuration);
        setTurnDeadline(room.turnDeadline || null);
        setTurnStartTime(room.turnStartTime || null);
        setTimeoutCountX(0);
        setTimeoutCountO(0);
        setTimeLeft(null);
        playSfx("click");
        toast("Rematch started!");
      }
    });

    socket.on("timer-update", (data: any) => {
      console.log("[Room] timer-update:", data);
      if (typeof data.turnDuration === "number") setTurnDuration(data.turnDuration);
      setTurnDeadline(data.turnDeadline || null);
      setTurnStartTime(data.turnStartTime || null);
      if (typeof data.timeoutCountX === "number") setTimeoutCountX(data.timeoutCountX);
      if (typeof data.timeoutCountO === "number") setTimeoutCountO(data.timeoutCountO);
      if (data.currentTurn) setCurrentTurn(data.currentTurn);
    });

    socket.on("turn-timeout", (data: any) => {
      console.log("[Room] turn-timeout:", data);
      if (!data.isForfeit) {
        if (isSpectator) {
          toast(`⏳ Turn timed out! Auto-move made (${data.consecutiveTimeouts}/3 timeouts)`, { icon: "⚠️" });
        } else {
          const isSelf = data.timedOutPlayerId === session?.user?.id;
          toast(
            isSelf
              ? `⏳ Turn timed out! Auto-move made (${data.consecutiveTimeouts}/3 timeouts)`
              : `⏳ Opponent timed out! Auto-move made (${data.consecutiveTimeouts}/3 timeouts)`,
            { icon: "⚠️" }
          );
        }
      }
    });

    socket.on("rematch-requested", (data: any) => {
      console.log("[Room] rematch-requested:", data);
      setShowGameOverOverlay(false);
      setRematchRequested(true);
      toast(`${opponentName || "Opponent"} wants a rematch!`, { icon: "⚔️" });
    });

    socket.on("rematch-rejected", (data: any) => {
      console.log("[Room] rematch-rejected:", data);
      setRematchRequested(false);
      setRematchAccepted(false);
      toast.error(`${opponentName || "Opponent"} declined the rematch`);
    });

    socket.on("error", (data: any) => {
      console.error("[Room] error:", data);
      const msg = data?.message || "An error occurred";
      toast.error(msg);
      if (msg.includes("Room not found") || msg.includes("not found")) {
        sessionStorage.removeItem(`joined-room-${roomId}`);
        joinedRef.current = null;
        router.push("/lobby");
      }
    });

    return () => {
      socket.off("room-joined");
      socket.off("room-data");
      socket.off("player-joined");
      socket.off("spectator-joined");
      socket.off("spectator-left");
      socket.off("spectator-count-updated");
      socket.off("spectators-list");
      socket.off("board-updated");
      socket.off("game-over");
      socket.off("new-message");
      socket.off("user-typing");
      socket.off("new-reaction");
      socket.off("reaction-cooldown");
      socket.off("opponent-left");
      socket.off("rematch-started");
      socket.off("rematch-requested");
      socket.off("rematch-rejected");
      socket.off("timer-update");
      socket.off("turn-timeout");
      socket.off("error");
    };
  }, [socket, playerSymbol, opponentName, session?.user, router, isSpectator]);

  useEffect(() => {
    if (isSpectator) {
      setIsMyTurn(false);
    } else {
      setIsMyTurn(currentTurn === playerSymbol && gameStatus === "playing");
    }
  }, [currentTurn, playerSymbol, gameStatus, isSpectator]);

  // Authoritative countdown timer ticker
  useEffect(() => {
    if (!turnDeadline || !turnDuration || turnDuration <= 0 || gameStatus !== "playing") {
      setTimeLeft(null);
      lastWarningPlayedRef.current = null;
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const msLeft = turnDeadline - now;
      const secondsLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setTimeLeft(secondsLeft);

      if (isMyTurn && secondsLeft <= 5 && secondsLeft > 0) {
        if (lastWarningPlayedRef.current !== secondsLeft) {
          lastWarningPlayedRef.current = secondsLeft;
          playSfx("timerWarning");
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [turnDeadline, turnDuration, gameStatus, isMyTurn, playSfx]);

  const handleSendReaction = useCallback((reaction: AllowedReaction) => {
    if (!socket || !roomId || !session?.user) return;
    playSfx("click");
    socket.emit("send-reaction", {
      roomId: canonicalRoomIdRef.current || roomId,
      reaction,
      senderId: session.user.id,
      senderName: session.user.name || (isSpectator ? "Spectator" : "Player"),
    });
  }, [socket, roomId, session, playSfx, isSpectator]);

  const handleLoadMoreSpectators = useCallback(() => {
    if (!socket || isLoadingSpectators) return;
    setIsLoadingSpectators(true);
    socket.emit("get-spectators", {
      roomId: canonicalRoomIdRef.current || roomId,
      page: spectatorsPage + 1,
      pageSize: 50,
    });
  }, [socket, isLoadingSpectators, roomId, spectatorsPage]);

  const handleLeaveRoom = () => {
    playSfx("click");
    leaveCall();
    if (roomId) {
      socket?.emit("leave-room", { roomId: canonicalRoomIdRef.current || roomId });
      sessionStorage.removeItem(`joined-room-${roomId}`);
    }
    setChatMessages([]);
    setChatInput("");
    router.push("/lobby");
  };

  const emitTypingStatus = useCallback((isTyping: boolean) => {
    if (!socket || !roomId || !session?.user) return;
    socket.emit("typing", {
      roomId,
      userId: session.user.id,
      userName: session.user.name || (isSpectator ? "Spectator" : "You"),
      isTyping,
    });
  }, [roomId, session?.user, socket, isSpectator]);

  const handleChatInputChange = useCallback((value: string) => {
    setChatInput(value);
    const isTyping = value.trim().length > 0;
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    emitTypingStatus(isTyping);
    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        emitTypingStatus(false);
      }, 1400);
    }
  }, [emitTypingStatus]);

  const handleSendChatMessage = useCallback(() => {
    if (!socket || !roomId || !session?.user) return;

    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage) return;

    const targetRoomId = canonicalRoomIdRef.current || roomId;
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const messagePayload: ChatMessage = {
      id: messageId,
      roomId: targetRoomId,
      message: trimmedMessage,
      senderName: session.user.name || (isSpectator ? "Spectator" : "You"),
      senderId: session.user.id,
      timestamp: Date.now(),
      role: isSpectator ? "spectator" : "player",
    };

    setChatMessages((prev) => {
      if (prev.some((item) => item.id === messageId)) {
        return prev;
      }
      return [...prev.slice(-99), messagePayload];
    });

    socket.emit("send-message", {
      roomId: targetRoomId,
      message: trimmedMessage,
      senderName: session.user.name || (isSpectator ? "Spectator" : "You"),
      senderId: session.user.id,
      id: messageId,
    });
    emitTypingStatus(false);
    setChatInput("");
  }, [chatInput, emitTypingStatus, roomId, session?.user, socket, isSpectator]);

  const handleChatKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendChatMessage();
    }
  }, [handleSendChatMessage]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (!isSpectator && isMyTurn && board[index] === null && socket) {
        socket.emit("make-move", {
          roomId,
          cellIndex: index,
          playerId: session?.user?.id,
        });
      }
    },
    [isSpectator, isMyTurn, board, socket, roomId, session?.user?.id]
  );

  const handleRematch = () => {
    playSfx("click");
    if (roomId && session?.user && !isSpectator) {
      socket?.emit("request-rematch", {
        roomId: canonicalRoomIdRef.current || roomId,
        playerId: session.user.id,
      });
      setRematchAccepted(true);
      setShowGameOverOverlay(false);
      toast(`Rematch requested! Waiting for ${opponentName}...`);
    }
  };

  const handleAcceptRematch = () => {
    playSfx("click");
    if (roomId && session?.user && !isSpectator) {
      socket?.emit("accept-rematch", {
        roomId: canonicalRoomIdRef.current || roomId,
        playerId: session.user.id,
      });
      setShowGameOverOverlay(false);
      setRematchRequested(false);
      setRematchAccepted(false);
    }
  };

  const handleRejectRematch = () => {
    playSfx("click");
    if (roomId && !isSpectator) {
      if (session?.user?.id) {
        socket?.emit("reject-rematch", {
          roomId: canonicalRoomIdRef.current || roomId,
          playerId: session.user.id,
        });
      }
      setRematchRequested(false);
    }
  };

  const displayRoomCode = roomCode || (roomId && roomId.length > 8 ? roomId.slice(0, 4).toUpperCase() : roomId?.toUpperCase() || "");

  const handleCopyRoomCode = () => {
    if (displayRoomCode) {
      navigator.clipboard.writeText(displayRoomCode);
      setCopiedCode(true);
      playSfx("click");
      toast.success(`Room code #${displayRoomCode} copied!`);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary, #0a0e1a)" }}>
        <LoadingSpinner variant="yellow" size="xl" text="Loading game..." />
      </div>
    );
  }

  const isPlayer1 = Boolean(session?.user?.id && playerSymbol === "X");
  const isPlayer2 = Boolean(session?.user?.id && playerSymbol === "O");

  return (
    <div style={{ minHeight: "100dvh", position: "relative", overflowX: "hidden", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <Toaster position="top-center" />
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={200} colors={["#38bdf8", "#ec4899", "#22c55e", "#f59e0b"]} gravity={0.3} />}

      {/* Header - Matching Reference Image 2 */}
      <header
        style={{
          padding: isMobile ? "10px 14px" : "14px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(10, 14, 26, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          {/* Left: Back/Exit round button */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <RoundIconButton
              onClick={handleLeaveRoom}
              ariaLabel="Leave Room"
              variant="dark"
              size={isMobile ? 38 : 42}
            >
              <ArrowLeft size={isMobile ? 18 : 20} />
            </RoundIconButton>

            {/* Room #CODE with copy button */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: isMobile ? "clamp(13px, 3.8vw, 17px)" : "20px",
                  fontWeight: 800,
                  color: "#ffffff",
                  fontFamily: "var(--font-display, inherit)",
                  letterSpacing: "0.2px",
                  whiteSpace: "nowrap",
                }}
              >
                <Users size={isMobile ? 15 : 20} color="#38bdf8" />
                <span>Room #{displayRoomCode}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                title="Copy room code"
                style={{
                  background: copiedCode ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  border: `1px solid ${copiedCode ? "#22c55e" : "rgba(255, 255, 255, 0.15)"}`,
                  borderRadius: "8px",
                  padding: "5px",
                  cursor: "pointer",
                  color: copiedCode ? "#22c55e" : "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Right: Player count chip, Theme, Sound */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: isMobile ? "4px 8px" : "6px 12px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                fontSize: isMobile ? "11px" : "13px",
                fontWeight: 700,
              }}
            >
              <Users size={isMobile ? 12 : 14} color="#38bdf8" />
              <span>{opponentOnline ? "2/2" : "1/2"}</span>
              {spectatorCount > 0 && (
                <>
                  <span style={{ opacity: 0.35 }}>•</span>
                  <Eye size={isMobile ? 12 : 14} color="#a855f7" />
                  <span>{spectatorCount}</span>
                </>
              )}
            </div>

            {isSpectator && (
              <span
                style={{
                  fontSize: isMobile ? "10px" : "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(56, 189, 248, 0.2)",
                  color: "#38bdf8",
                  border: "1px solid #38bdf8",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Eye size={12} />
                {!isMobile && "SPECTATING"}
              </span>
            )}

            <ThemeSwitcher compact={isMobile} align="right" />
            <SoundControls compact={isMobile} align="right" />
          </div>
        </div>
      </header>

      {/* Main Content - Responsive Grid */}
      <main
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: isMobile ? "12px 12px 48px 12px" : "24px 20px 48px 20px",
          position: "relative",
          zIndex: 10,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "minmax(0, 1fr)"
              : isTablet
              ? "minmax(0, 1fr) 340px"
              : "280px minmax(0, 1fr) 340px",
            gap: isMobile ? "16px" : "24px",
            alignItems: "start",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* LEFT PANEL: Players & Spectators (On tablet, merged with center; on mobile, below board or in tabs) */}
          {(!isTablet || isMobile) && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                width: "100%",
                order: isMobile ? 3 : 1,
              }}
            >
              <NeonCard
                variant="glass"
                style={{
                  padding: isMobile ? "14px" : "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    paddingBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={16} color="#38bdf8" />
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#fff",
                        fontFamily: "var(--font-display, inherit)",
                      }}
                    >
                      Players
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-muted, #94a3b8)",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {opponentOnline ? "2/2" : "1/2"}
                  </span>
                </div>

                {/* Player 1 Row (Host / X) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "14px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border:
                      currentTurn === "X" && gameStatus === "playing"
                        ? "1.5px solid #38bdf8"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow:
                      currentTurn === "X" && gameStatus === "playing"
                        ? "0 0 14px rgba(56, 189, 248, 0.25)"
                        : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div style={{ position: "relative" }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #38bdf8, #0284c7)",
                          border: "2px solid #7dd3fc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: "14px",
                        }}
                      >
                        {player1Name?.charAt(0).toUpperCase() || "1"}
                      </div>
                      <div style={{ position: "absolute", top: -8, left: -6 }}>
                        <CrownBadge size={20} />
                      </div>
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#fff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {player1Name}
                        </span>
                        {!isSpectator && playerSymbol === "X" && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "999px",
                              backgroundColor: "rgba(168, 85, 247, 0.25)",
                              color: "#c084fc",
                              border: "1px solid rgba(168, 85, 247, 0.4)",
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                        <span style={{ fontSize: "10px", color: "var(--text-muted, #94a3b8)" }}>Online</span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #38bdf8, #0284c7)",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(56, 189, 248, 0.4)",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </div>
                </div>

                {/* Player 2 Row (O) or Waiting */}
                {player2Name && player2Name !== "Waiting..." ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "14px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border:
                        currentTurn === "O" && gameStatus === "playing"
                          ? "1.5px solid #fb923c"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow:
                        currentTurn === "O" && gameStatus === "playing"
                          ? "0 0 14px rgba(251, 146, 60, 0.25)"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #fb923c, #ea580c)",
                          border: "2px solid #fdba74",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: "14px",
                        }}
                      >
                        {player2Name?.charAt(0).toUpperCase() || "2"}
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#fff",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {player2Name}
                          </span>
                          {!isSpectator && playerSymbol === "O" && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "999px",
                                backgroundColor: "rgba(168, 85, 247, 0.25)",
                                color: "#c084fc",
                                border: "1px solid rgba(168, 85, 247, 0.4)",
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: opponentOnline ? "#22c55e" : "#ef4444",
                            }}
                          />
                          <span style={{ fontSize: "10px", color: "var(--text-muted, #94a3b8)" }}>
                            {opponentOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, #fb923c, #ea580c)",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: "15px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(251, 146, 60, 0.4)",
                        flexShrink: 0,
                      }}
                    >
                      ○
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1.5px dashed rgba(255, 255, 255, 0.18)",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      color: "var(--text-muted, #94a3b8)",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ fontStyle: "italic" }}>Waiting for players...</span>
                    <span style={{ fontSize: "16px", color: "#38bdf8" }}>➕</span>
                  </div>
                )}

                {/* Spectator Watching Dropdown */}
                <div style={{ marginTop: "4px" }}>
                  <motion.button
                    type="button"
                    onClick={() => setShowSpectatorList((prev) => !prev)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "var(--text-muted, #94a3b8)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Eye size={14} color="#a855f7" />
                      <span>Spectators ({spectatorCount})</span>
                    </div>
                    <span>{showSpectatorList ? "▲" : "▼"}</span>
                  </motion.button>

                  <AnimatePresence>
                    {showSpectatorList && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          overflow: "hidden",
                          marginTop: "8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <input
                          type="text"
                          value={spectatorSearchQuery}
                          onChange={(e) => setSpectatorSearchQuery(e.target.value)}
                          placeholder="Search spectators..."
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        />
                        <div
                          style={{
                            maxHeight: "140px",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {spectators.filter(
                            (s) =>
                              !spectatorSearchQuery.trim() ||
                              s.name.toLowerCase().includes(spectatorSearchQuery.toLowerCase().trim())
                          ).length === 0 ? (
                            <p
                              style={{
                                margin: 0,
                                fontSize: "11px",
                                color: "var(--text-muted, #64748b)",
                                fontStyle: "italic",
                                textAlign: "center",
                                padding: "8px 0",
                              }}
                            >
                              No spectators watching
                            </p>
                          ) : (
                            spectators
                              .filter(
                                (s) =>
                                  !spectatorSearchQuery.trim() ||
                                  s.name.toLowerCase().includes(spectatorSearchQuery.toLowerCase().trim())
                              )
                              .map((s) => {
                                const isSelf = s.id === session?.user?.id;
                                return (
                                  <div
                                    key={s.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "5px 8px",
                                      borderRadius: "6px",
                                      backgroundColor: isSelf
                                        ? "rgba(56, 189, 248, 0.15)"
                                        : "rgba(255, 255, 255, 0.03)",
                                      fontSize: "11px",
                                      color: isSelf ? "#38bdf8" : "#cbd5e1",
                                    }}
                                  >
                                    <span>{s.name}</span>
                                    {isSelf && (
                                      <span
                                        style={{
                                          fontSize: "9px",
                                          fontWeight: 700,
                                          padding: "1px 5px",
                                          borderRadius: "999px",
                                          backgroundColor: "rgba(56, 189, 248, 0.25)",
                                        }}
                                      >
                                        You
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </NeonCard>
            </div>
          )}

          {/* CENTER PANEL: Score Pill, Turn Timer, CallBar, VideoPanel, Board, Status, Rematch */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: isMobile ? "14px" : "18px",
              width: "100%",
              order: isMobile ? 1 : 2,
            }}
          >
            {/* Top Score / Matchup Bar - Matching Reference Image 1 & 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                alignItems: "center",
                padding: isMobile ? "8px 10px" : "10px 20px",
                borderRadius: "9999px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1.5px solid rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                width: "100%",
                maxWidth: isMobile ? "100%" : "440px",
                boxSizing: "border-box",
                gap: isMobile ? "4px" : "8px",
              }}
            >
              {/* Player X */}
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "8px", minWidth: 0, overflow: "hidden" }}>
                <div
                  style={{
                    width: isMobile ? "30px" : "36px",
                    height: isMobile ? "30px" : "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #38bdf8, #0284c7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: isMobile ? "15px" : "18px",
                    boxShadow:
                      currentTurn === "X" && gameStatus === "playing"
                        ? "0 0 14px #38bdf8"
                        : "none",
                    border:
                      currentTurn === "X" && gameStatus === "playing"
                        ? "2px solid #ffffff"
                        : "2px solid transparent",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </div>
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: isMobile ? "12px" : "13px",
                      fontWeight: 700,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {player1Name}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color:
                        currentTurn === "X" && gameStatus === "playing"
                          ? "#38bdf8"
                          : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentTurn === "X" && gameStatus === "playing" ? "⚡ TURN" : "PLAYER X"}
                  </div>
                </div>
              </div>

              {/* Center Golden VS Badge */}
              <div
                style={{
                  width: isMobile ? "30px" : "42px",
                  height: isMobile ? "30px" : "42px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "2px solid #fef3c7",
                  boxShadow:
                    "0 4px 12px rgba(245, 158, 11, 0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontFamily: "var(--font-display, inherit)",
                  fontWeight: 900,
                  fontSize: isMobile ? "11px" : "14px",
                  letterSpacing: "0.5px",
                  flexShrink: 0,
                  margin: isMobile ? "0 2px" : "0 8px",
                }}
              >
                VS
              </div>

              {/* Player O */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? "6px" : "8px",
                  justifyContent: "flex-end",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <div style={{ minWidth: 0, overflow: "hidden", textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: isMobile ? "12px" : "13px",
                      fontWeight: 700,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {player2Name}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color:
                        currentTurn === "O" && gameStatus === "playing"
                          ? "#fb923c"
                          : "rgba(255,255,255,0.6)",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentTurn === "O" && gameStatus === "playing" ? "⚡ TURN" : "PLAYER O"}
                  </div>
                </div>
                <div
                  style={{
                    width: isMobile ? "30px" : "36px",
                    height: isMobile ? "30px" : "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #fb923c, #ea580c)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: isMobile ? "15px" : "18px",
                    boxShadow:
                      currentTurn === "O" && gameStatus === "playing"
                        ? "0 0 14px #fb923c"
                        : "none",
                    border:
                      currentTurn === "O" && gameStatus === "playing"
                        ? "2px solid #ffffff"
                        : "2px solid transparent",
                    flexShrink: 0,
                  }}
                >
                  ○
                </div>
              </div>
            </div>

            {/* Turn Timer Countdown Bar (if turnDuration > 0) */}
            {turnDuration > 0 && typeof timeLeft === "number" && gameStatus === "playing" && (
              <div
                style={{
                  width: "100%",
                  maxWidth: isMobile ? "100%" : "440px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: timeLeft <= 5 ? "#ef4444" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {timeLeft <= 5 ? <AlertTriangle size={13} /> : <Timer size={13} />}
                    <span>{timeLeft <= 5 ? "Hurry up!" : "Turn timer"}</span>
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      color: timeLeft <= 5 ? "#ef4444" : "#ffffff",
                    }}
                  >
                    {timeLeft}s
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    style={{
                      height: "100%",
                      borderRadius: "3px",
                      backgroundColor:
                        timeLeft <= 5 ? "#ef4444" : isMyTurn ? "#38bdf8" : "#fb923c",
                      boxShadow:
                        timeLeft <= 5
                          ? "0 0 12px rgba(239, 68, 68, 0.8)"
                          : "0 0 8px rgba(56, 189, 248, 0.4)",
                    }}
                    initial={false}
                    animate={{
                      width: `${Math.min(100, Math.max(0, (timeLeft / turnDuration) * 100))}%`,
                    }}
                    transition={{ ease: "linear", duration: 0.1 }}
                  />
                </div>
              </div>
            )}

            {/* WebRTC Voice & Video Call Bar */}
            <CallBar
              isPlayer={!isSpectator}
              isHost={Boolean(session?.user?.id && playerSymbol === "X")}
              isInCall={isInCall}
              isRinging={isRinging}
              myUserId={session?.user?.id || ""}
              callState={callState}
              micOn={micOn}
              cameraOn={cameraOn}
              isDeafened={isDeafened}
              mutedByModerator={mutedByModerator}
              isPendingJoin={isPendingJoin}
              audioBlocked={audioBlocked}
              onStartCall={startCall}
              onJoinCall={joinCall}
              onLeaveCall={leaveCall}
              onEndCall={endCall}
              onToggleMic={toggleMic}
              onToggleCamera={toggleCamera}
              onToggleDeafen={toggleDeafen}
              onChangeCallSetting={changeCallSetting}
              onResumeAudio={resumeAudio}
              isPanelOpen={isCallPanelOpen}
              onTogglePanel={() => setIsCallPanelOpen((prev) => !prev)}
              isMobile={isMobile}
            />

            {/* Video Panel */}
            <VideoPanel
              isOpen={isCallPanelOpen && (isInCall || callState.participants.length > 0)}
              onClose={() => setIsCallPanelOpen(false)}
              myUserId={session?.user?.id || ""}
              isPlayer={!isSpectator}
              participants={callState.participants}
              localStream={localStream}
              remoteStreams={remoteStreams}
              peerDiagnostics={peerDiagnostics}
              speakingUsers={speakingUsers}
              mutedForMe={mutedForMe}
              hiddenVideoForMe={hiddenVideoForMe}
              isDeafened={isDeafened}
              onToggleMuteForMe={toggleMuteForMe}
              onToggleHideVideoForMe={toggleHideVideoForMe}
              onModerateParticipant={moderateParticipant}
              onAudioBlocked={() => setAudioBlocked(true)}
              isMobile={isMobile}
            />

            {/* 3x3 Game Board */}
            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <GameBoard
                board={board}
                winningLine={winningLine}
                isSpectator={isSpectator}
                isMyTurn={isMyTurn}
                gameStatus={gameStatus}
                cellSize={cellSize}
                cellGap={cellGap}
                boardPadding={boardPadding}
                boardSize={boardSize}
                isMobile={isMobile}
                floatingReactions={floatingReactions}
                currentUserId={session?.user?.id}
                onCellClick={handleCellClick}
              />
            </div>

            {/* Status Hint Pill below board */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "9999px",
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor:
                    gameStatus === "playing"
                      ? isMyTurn
                        ? "#22c55e"
                        : "#f59e0b"
                      : gameStatus === "waiting"
                      ? "#38bdf8"
                      : "#a855f7",
                }}
              />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>
                {gameStatus === "waiting"
                  ? "Room is ready! Waiting for opponent..."
                  : gameStatus === "playing"
                  ? isSpectator
                    ? `${currentTurn === "X" ? player1Name : player2Name}'s Turn (${currentTurn})`
                    : isMyTurn
                    ? "Make your move..."
                    : "Opponent is thinking..."
                  : winner === "draw"
                  ? "Game ended in a draw!"
                  : isSpectator
                  ? `🏆 ${winner === "X" ? player1Name : player2Name} won!`
                  : winner === playerSymbol
                  ? "🎉 You Won!"
                  : "😔 You Lost"}
              </span>
            </div>

            {/* Rematch Waiting Banner (when requester is waiting for opponent) */}
            {rematchAccepted && !rematchRequested && !isSpectator && gameStatus === "finished" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  color: "#7dd3fc",
                  fontSize: "13px",
                  fontWeight: 600,
                  width: "100%",
                  maxWidth: "440px",
                  boxSizing: "border-box",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  marginBottom: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflow: "hidden" }}>
                  <LoadingSpinner size="sm" variant="yellow" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Rematch requested. Waiting for {opponentName}...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (roomId && session?.user?.id) {
                      socket?.emit("reject-rematch", {
                        roomId: canonicalRoomIdRef.current || roomId,
                        playerId: session.user.id,
                      });
                    }
                    setRematchAccepted(false);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Cancel
                </button>
              </motion.div>
            )}

            {/* Rematch & Finished Controls */}
            {gameStatus === "finished" && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                {!isSpectator && !rematchRequested && !rematchAccepted && (
                  <NeonButton
                    variant="primary"
                    size="md"
                    onClick={handleRematch}
                    style={{ flex: "1 1 140px", minWidth: 0, minHeight: "44px" }}
                  >
                    Play Again
                  </NeonButton>
                )}

                {gameId && (
                  <NeonButton
                    variant="blue"
                    size="md"
                    onClick={() => {
                      playSfx("click");
                      router.push(`/replay/${gameId}`);
                    }}
                    style={{ flex: "1 1 140px", minWidth: 0, minHeight: "44px" }}
                  >
                    <Play size={16} fill="#ffffff" style={{ marginRight: "6px" }} />
                    Watch Replay
                  </NeonButton>
                )}

                <NeonButton
                  variant="dark-blue"
                  size="md"
                  onClick={() => {
                    playSfx("click");
                    router.push("/history");
                  }}
                  style={{ flex: "1 1 140px", minWidth: 0, minHeight: "44px" }}
                >
                  <History size={16} style={{ marginRight: "6px" }} />
                  History
                </NeonButton>

                <NeonButton
                  variant="dark-blue"
                  size="md"
                  onClick={handleLeaveRoom}
                  style={{ flex: "1 1 140px", minWidth: 0, minHeight: "44px" }}
                >
                  Back to Lobby
                </NeonButton>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Live Chat */}
          <div
            style={{
              width: "100%",
              order: isMobile ? 2 : 3,
            }}
          >
            <ChatBox
              messages={chatMessages}
              newMessage={chatInput}
              onMessageChange={handleChatInputChange}
              onSendMessage={handleSendChatMessage}
              onKeyPress={handleChatKeyPress}
              disabled={!socket || !roomId || !session?.user}
              currentUserId={session?.user?.id}
              partnerName={isSpectator ? "Players" : opponentName}
              isPartnerOnline={opponentOnline}
              isPartnerTyping={opponentTyping}
              onSendReaction={handleSendReaction}
              showReactionsInChat={showReactionsInChat}
              onToggleShowReactionsInChat={handleToggleShowInChat}
              isMobile={isMobile}
              isSpectator={isSpectator}
              spectatorCount={spectatorCount}
              playerCount={opponentOnline ? 2 : 1}
              hideSpectatorReactions={hideSpectatorReactions}
              onToggleHideSpectatorReactions={handleToggleHideSpectatorReactions}
            />
          </div>
        </div>

        {/* End of game Win / Lose / Draw Overlay */}
        {gameStatus === "finished" && winner && (
          <WinLoseDrawOverlay
            isOpen={showGameOverOverlay}
            onClose={() => setShowGameOverOverlay(false)}
            isSpectator={isSpectator}
            winner={winner === "draw" ? "draw" : winner === playerSymbol ? "human" : "ai"}
            winnerName={
              isSpectator
                ? winner === "draw"
                  ? undefined
                  : winner === "X"
                  ? player1Name
                  : player2Name
                : winner === playerSymbol
                ? "You"
                : opponentName
            }
            onPlayAgain={!isSpectator ? handleRematch : undefined}
            onHome={handleLeaveRoom}
            onWatchReplay={gameId ? () => router.push(`/replay/${gameId}`) : undefined}
          />
        )}

        {/* Rematch Prompt Modal (zIndex: 10000 - Top of everything) */}
        {rematchRequested && !isSpectator && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              padding: isMobile ? 0 : "20px",
            }}
          >
            <motion.div
              initial={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
              animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                width: "100%",
                maxWidth: isMobile ? "100%" : "440px",
                backgroundColor: "var(--bg-card, #131b2e)",
                border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                borderRadius: isMobile ? "24px 24px 0 0" : "24px",
                padding: isMobile ? "24px 20px max(24px, env(safe-area-inset-bottom))" : "28px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)",
                textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FFB703 0%, #FB8500 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                  boxShadow: "0 6px 18px rgba(251, 133, 0, 0.45)",
                }}
              >
                <RefreshCw style={{ width: "26px", height: "26px", color: "#1a1000" }} />
              </div>

              <h3
                className="game-title-3d"
                style={{
                  fontSize: isMobile ? "22px" : "24px",
                  margin: "0 0 8px",
                  color: "#ffffff",
                }}
              >
                Rematch Request!
              </h3>

              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary, #c2d6ff)",
                  margin: "0 0 24px",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "#38bdf8" }}>{opponentName}</strong> wants a rematch. Do you accept the challenge?
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <NeonButton
                  variant="primary"
                  size="lg"
                  fullWidth={isMobile}
                  onClick={handleAcceptRematch}
                  style={{ minHeight: "48px", minWidth: isMobile ? "100%" : "150px" }}
                >
                  Accept
                </NeonButton>
                <NeonButton
                  variant="ghost"
                  size="lg"
                  fullWidth={isMobile}
                  onClick={handleRejectRematch}
                  style={{ minHeight: "48px", minWidth: isMobile ? "100%" : "130px" }}
                >
                  Reject
                </NeonButton>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dedicated persistent audio elements: OUTSIDE visual tiles/video panel, always mounted while in call */}
        {(isInCall || callState.active || callState.participants.length > 0) && (
          <RemoteAudioElements
            participants={callState.participants}
            myUserId={session?.user?.id || ""}
            remoteStreams={remoteStreams}
            isDeafened={isDeafened}
            mutedForMe={mutedForMe}
            onAudioBlocked={() => setAudioBlocked(true)}
          />
        )}

        {/* Call Modals */}
        <CallModals
          incomingCall={incomingCall}
          incomingJoinRequest={incomingJoinRequest}
          onRespondCall={respondIncomingCall}
          onRespondJoinRequest={respondJoinRequest}
        />
      </main>
    </div>
  );
}

// Memoized Game Board Component
interface GameBoardProps {
  board: CellValue[];
  winningLine: number[] | null;
  isSpectator: boolean;
  isMyTurn: boolean;
  gameStatus: "waiting" | "playing" | "finished";
  cellSize: number;
  cellGap: number;
  boardPadding: number;
  boardSize: number;
  isMobile: boolean;
  floatingReactions: ActiveReaction[];
  currentUserId?: string;
  onCellClick: (index: number) => void;
}

const GameBoard = React.memo(function GameBoard({
  board,
  winningLine,
  isSpectator,
  isMyTurn,
  gameStatus,
  cellSize,
  cellGap,
  boardPadding,
  boardSize,
  isMobile,
  floatingReactions,
  currentUserId,
  onCellClick,
}: GameBoardProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: cellGap,
        padding: boardPadding,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        borderRadius: isMobile ? "20px" : "28px",
        border: "1.5px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        backdropFilter: "blur(14px)",
        width: "100%",
        maxWidth: "min(100%, calc(100vw - 32px), 520px)",
        aspectRatio: "1 / 1",
        boxSizing: "border-box",
      }}
    >
      {/* Floating Reactions Overlay over the game board */}
      <FloatingReactionsOverlay
        reactions={floatingReactions}
        currentUserId={currentUserId}
      />

      {board.map((cell, index) => (
        <GameCell
          key={index}
          value={cell}
          index={index}
          onClick={() => onCellClick(index)}
          disabled={cell !== null || isSpectator || !isMyTurn || gameStatus !== "playing"}
          isWinningCell={winningLine?.includes(index)}
          isLastMove={false}
          playerSymbol={null}
        />
      ))}
    </div>
  );
});

// Player Card Component - Responsive
const PlayerCard = React.memo(function PlayerCard({
  name,
  symbol,
  isActive,
  isYou,
  isMobile,
  timeLeft,
  turnDuration,
  timeoutCount,
}: {
  name: string;
  symbol: TurnPlayer;
  isActive: boolean;
  isYou?: boolean;
  isMobile: boolean;
  timeLeft?: number | null;
  turnDuration?: number;
  timeoutCount?: number;
}) {
  const isUrgent = isActive && typeof timeLeft === "number" && timeLeft <= 5;
  const color = isUrgent
    ? "#FF3131"
    : symbol === "X"
    ? "var(--accent-x, #00FFFF)"
    : "var(--accent-o, #FF00FF)";

  return (
    <motion.div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "8px" : "14px",
        padding: isMobile ? "10px 12px" : "14px 16px",
        borderRadius: "12px",
        border: `2px solid ${isActive ? color : "var(--border-color, #1a1a1a)"}`,
        backgroundColor: isUrgent ? "rgba(255, 49, 49, 0.08)" : "var(--bg-card, rgba(13,13,13,0.8))",
        boxShadow: isActive ? (isUrgent ? "0 0 24px rgba(255,49,49,0.55)" : `0 0 20px ${color}33`) : "none",
        minWidth: 0,
        flex: isMobile ? 1 : "none",
        maxWidth: isMobile ? "180px" : "none",
        position: "relative",
        boxSizing: "border-box",
      }}
      animate={
        isActive
          ? isUrgent
            ? { scale: [1, 1.03, 1], borderColor: ["#FF3131", "#FF6666", "#FF3131"] }
            : { scale: [1, 1.02, 1] }
          : {}
      }
      transition={{ duration: isUrgent ? 0.6 : 1.5, repeat: Infinity }}
    >
      <div style={{
        width: isMobile ? "38px" : "52px",
        height: isMobile ? "38px" : "52px",
        borderRadius: "50%",
        border: `2px solid ${color}`,
        backgroundColor: "rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: "6px",
      }}>
        <GameSkinIcon symbol={symbol} size={isMobile ? 20 : 26} animate={false} />
      </div>
      <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: "bold",
          color,
          margin: 0,
          fontSize: isMobile ? "12px" : "14px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {name}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
          {isYou && (
            <p style={{
              fontSize: isMobile ? "10px" : "11px",
              color: "var(--text-muted, #9ca3af)",
              margin: 0,
            }}>
              You ({symbol})
            </p>
          )}
          {typeof timeoutCount === "number" && timeoutCount > 0 && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#FF3131",
                backgroundColor: "rgba(255,49,49,0.15)",
                padding: "1px 5px",
                borderRadius: "4px",
                border: "1px solid rgba(255,49,49,0.4)",
              }}
              title={`${timeoutCount} of 3 timeouts (3 = forfeit)`}
            >
              ⚠️ {timeoutCount}/3
            </span>
          )}
        </div>
      </div>
      {isActive && (turnDuration ?? 0) > 0 && typeof timeLeft === "number" && (
        <motion.div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            padding: isMobile ? "2px 6px" : "3px 8px",
            borderRadius: "999px",
            backgroundColor: isUrgent ? "rgba(255,49,49,0.2)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${color}`,
            color: color,
            fontWeight: 800,
            fontSize: isMobile ? "11px" : "12px",
            flexShrink: 0,
            boxShadow: isUrgent ? "0 0 10px rgba(255,49,49,0.6)" : "none",
          }}
          animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <Timer style={{ width: isMobile ? "10px" : "12px", height: isMobile ? "10px" : "12px" }} />
          <span>{timeLeft}s</span>
        </motion.div>
      )}
      {isActive && typeof timeLeft !== "number" && (
        <motion.div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
});
