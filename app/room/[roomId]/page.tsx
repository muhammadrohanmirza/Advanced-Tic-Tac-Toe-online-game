"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChatBox } from "@/components/game/ChatBox";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Confetti from "react-confetti";
import { LogOut, Trophy, Timer, AlertTriangle, Eye, Play } from "lucide-react";
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
import { VideoPanel } from "@/components/game/VideoPanel";
import { CallModals } from "@/components/game/CallModals";

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
  const canonicalRoomIdRef = useRef<string | null>(null);
  const joinedRef = useRef<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
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
      return Math.min(width - 40, 320);
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
      setRematchRequested(true);
      toast("Opponent wants a rematch!");
    });

    socket.on("rematch-rejected", (data: any) => {
      console.log("[Room] rematch-rejected:", data);
      setRematchRequested(false);
      toast.error("Opponent declined rematch");
      setTimeout(() => router.push("/lobby"), 1500);
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

  const handleRematch = () => {
    playSfx("click");
    if (roomId && session?.user && !isSpectator) {
      socket?.emit("request-rematch", { roomId, playerId: session.user.id });
      setRematchAccepted(true);
      toast("Rematch requested! Waiting for opponent...");
    }
  };

  const handleAcceptRematch = () => {
    playSfx("click");
    if (roomId && session?.user && !isSpectator) {
      socket?.emit("accept-rematch", { roomId, playerId: session.user.id });
      setRematchRequested(false);
      setRematchAccepted(false);
    }
  };

  const handleRejectRematch = () => {
    playSfx("click");
    if (roomId && !isSpectator) {
      socket?.emit("reject-rematch", { roomId });
      setRematchRequested(false);
      setTimeout(() => router.push("/lobby"), 500);
    }
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#050505" }}>
        <LoadingSpinner variant="cyan" size="xl" text="Loading game..." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary, #050505)", position: "relative", overflowX: "hidden" }}>
      <Toaster position="top-center" />
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={200} colors={["#00FFFF", "#FF00FF", "#00FF41", "#FFD700"]} gravity={0.3} />}

      {/* Header - Responsive */}
      <header style={{
        padding: isMobile ? "10px 16px" : "16px",
        borderBottom: "1px solid var(--border-color, #1a1a1a)",
        backgroundColor: "var(--theme-header-bg, rgba(13,13,13,0.8))",
      }}>
        <div style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Trophy style={{
              width: isMobile ? "18px" : "24px",
              height: isMobile ? "18px" : "24px",
              color: "var(--accent-x, #00FFFF)",
            }} />
            <h1 className="neon-text-cyan" style={{
              fontSize: isMobile ? "16px" : "20px",
              fontWeight: "bold",
              margin: 0,
            }}>Game Room</h1>
            {isSpectator && (
              <span
                style={{
                  fontSize: isMobile ? "10px" : "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(0, 255, 255, 0.15)",
                  color: "var(--accent-x, #00FFFF)",
                  border: "1px solid var(--accent-x, #00FFFF)",
                  letterSpacing: "0.5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Eye style={{ width: "12px", height: "12px" }} />
                SPECTATING
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "12px" }}>
            <ThemeSwitcher compact={isMobile} align="right" />
            <SoundControls compact={isMobile} align="right" />
            <motion.button
              type="button"
              onClick={handleLeaveRoom}
              whileHover={{
                scale: 1.05,
                y: -2,
                boxShadow: "0 0 20px rgba(255,49,49,0.6)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                minHeight: isMobile ? "40px" : "44px",
                padding: isMobile ? "6px 12px" : "8px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                border: "2px solid #FF3131",
                borderRadius: "12px",
                background: "rgba(255,49,49,0.03)",
                color: "#FF3131",
                fontSize: isMobile ? "12px" : "14px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(255,49,49,0.35)",
                textShadow: "0 0 8px #FF3131",
                transition: "all .3s ease",
              }}
            >
              <LogOut
                style={{
                  width: isMobile ? "14px" : "16px",
                  height: isMobile ? "14px" : "16px",
                }}
              />
              {!isMobile && <span>Leave</span>}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: isMobile ? "16px" : "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isMobile ? "18px" : "24px",
        overflowX: "hidden",
      }}>

        {/* Players - Responsive: Side by side on all screens */}
        <div style={{
          display: "flex",
          gap: isMobile ? "12px" : "24px",
          width: "100%",
          justifyContent: "center",
          flexWrap: isMobile ? "wrap" : "nowrap",
        }}>
          {isSpectator ? (
            <>
              <PlayerCard
                name={player1Name}
                symbol="X"
                isActive={currentTurn === "X" && gameStatus === "playing"}
                isYou={false}
                isMobile={isMobile}
                timeLeft={currentTurn === "X" ? timeLeft : null}
                turnDuration={turnDuration}
                timeoutCount={timeoutCountX}
              />
              <PlayerCard
                name={player2Name}
                symbol="O"
                isActive={currentTurn === "O" && gameStatus === "playing"}
                isYou={false}
                isMobile={isMobile}
                timeLeft={currentTurn === "O" ? timeLeft : null}
                turnDuration={turnDuration}
                timeoutCount={timeoutCountO}
              />
            </>
          ) : (
            <>
              <PlayerCard
                name={session?.user?.name || "You"}
                symbol={playerSymbol || "X"}
                isActive={currentTurn === (playerSymbol || "X") && gameStatus === "playing"}
                isYou
                isMobile={isMobile}
                timeLeft={currentTurn === (playerSymbol || "X") ? timeLeft : null}
                turnDuration={turnDuration}
                timeoutCount={playerSymbol === "X" ? timeoutCountX : timeoutCountO}
              />
              <PlayerCard
                name={opponentName}
                symbol={(playerSymbol || "X") === "X" ? "O" : "X"}
                isActive={currentTurn !== (playerSymbol || "X") && gameStatus === "playing"}
                isMobile={isMobile}
                timeLeft={currentTurn !== (playerSymbol || "X") ? timeLeft : null}
                turnDuration={turnDuration}
                timeoutCount={playerSymbol === "X" ? timeoutCountO : timeoutCountX}
              />
            </>
          )}
        </div>

        {/* Dedicated Spectators Row - Below Player Cards */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          position: "relative",
          zIndex: 30,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}>
            {/* First 3 spectator avatars stacked */}
            {spectators.length > 0 && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {spectators.slice(0, 3).map((spec, idx) => (
                    <div
                      key={spec.id || idx}
                      title={spec.name}
                      style={{
                        width: isMobile ? "24px" : "28px",
                        height: isMobile ? "24px" : "28px",
                        borderRadius: "50%",
                        backgroundColor: "var(--bg-card, #12121c)",
                        border: "2px solid var(--border-color, rgba(168,85,247,0.4))",
                        color: "var(--text-main, #ffffff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? "10px" : "12px",
                        fontWeight: 700,
                        marginLeft: idx === 0 ? "0px" : "-8px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                        textTransform: "uppercase",
                      }}
                    >
                      {spec.name?.charAt(0) || "S"}
                    </div>
                  ))}
                </div>
                {spectatorCount > 3 && (
                  <span style={{
                    marginLeft: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted, #94a3b8)",
                  }}>
                    +{spectatorCount - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Watching (N) Pill */}
            <motion.button
              type="button"
              onClick={() => setShowSpectatorList((prev) => !prev)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: isMobile ? "5px 14px" : "6px 18px",
                borderRadius: "9999px",
                backgroundColor: "var(--bg-card, rgba(13, 13, 13, 0.85))",
                border: `1.5px solid ${isSpectator ? "var(--accent-x, #00FFFF)" : "var(--border-color, rgba(255, 255, 255, 0.15))"}`,
                color: isSpectator ? "var(--accent-x, #00FFFF)" : "var(--text-main, #e5e7eb)",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: isSpectator
                  ? "0 0 12px rgba(0, 255, 255, 0.25)"
                  : "0 2px 8px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
              }}
              title="Click to view watching spectators"
              aria-label="Toggle spectator list"
            >
              <Eye style={{ width: "14px", height: "14px" }} />
              <span>Watching ({spectatorCount})</span>
              <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "2px" }}>
                {showSpectatorList ? "▲" : "▼"}
              </span>
            </motion.button>
          </div>

          {/* Searchable, scrollable list of spectator names */}
          <AnimatePresence>
            {showSpectatorList && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{
                  width: "100%",
                  maxWidth: isMobile ? "92vw" : "380px",
                  padding: "12px",
                  borderRadius: "14px",
                  backgroundColor: "var(--bg-card, #12121c)",
                  border: "1.5px solid var(--border-color, rgba(168,85,247,0.3))",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Eye style={{ width: "14px", height: "14px", color: "var(--accent-x, #00FFFF)" }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main, #ffffff)" }}>
                      Spectators ({spectatorCount})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSpectatorList(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted, #9ca3af)",
                      cursor: "pointer",
                      padding: "2px 6px",
                      fontSize: "14px",
                    }}
                    aria-label="Close spectators list"
                  >
                    ✕
                  </button>
                </div>

                {/* Search input */}
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
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                    color: "var(--text-main, #ffffff)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />

                {/* Scrollable list */}
                <div style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  paddingRight: "4px",
                }}>
                  {spectators.filter((s) =>
                    !spectatorSearchQuery.trim() ||
                    s.name.toLowerCase().includes(spectatorSearchQuery.toLowerCase().trim())
                  ).length === 0 ? (
                    <p style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "var(--text-muted, #6b7280)",
                      fontStyle: "italic",
                      textAlign: "center",
                      padding: "12px 0",
                    }}>
                      {spectatorSearchQuery ? "No matching spectators found" : "No spectators currently watching"}
                    </p>
                  ) : (
                    spectators
                      .filter((s) =>
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
                              padding: "6px 10px",
                              borderRadius: "8px",
                              backgroundColor: isSelf ? "rgba(0, 255, 255, 0.08)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isSelf ? "var(--accent-x, #00FFFF)" : "rgba(255,255,255,0.06)"}`,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                backgroundColor: "var(--bg-card, #1a1a24)",
                                border: "1px solid var(--border-color, rgba(255,255,255,0.2))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: 700,
                                color: isSelf ? "var(--accent-x, #00FFFF)" : "var(--text-main, #ffffff)",
                                textTransform: "uppercase",
                              }}>
                                {s.name?.charAt(0) || "S"}
                              </div>
                              <span style={{
                                fontSize: "12px",
                                fontWeight: isSelf ? 700 : 500,
                                color: isSelf ? "var(--accent-x, #00FFFF)" : "var(--text-main, #e5e7eb)",
                              }}>
                                {s.name}
                              </span>
                            </div>
                            {isSelf && (
                              <span style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "var(--accent-x, #00FFFF)",
                                backgroundColor: "rgba(0, 255, 255, 0.15)",
                                padding: "1px 6px",
                                borderRadius: "999px",
                              }}>
                                You
                              </span>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Load More button */}
                {spectators.length < spectatorCount && spectatorsPage < spectatorsTotalPages && (
                  <button
                    type="button"
                    disabled={isLoadingSpectators}
                    onClick={handleLoadMoreSpectators}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid var(--border-color, rgba(255, 255, 255, 0.2))",
                      color: "var(--text-main, #ffffff)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: isLoadingSpectators ? "not-allowed" : "pointer",
                      opacity: isLoadingSpectators ? 0.6 : 1,
                    }}
                  >
                    {isLoadingSpectators ? "Loading..." : `Load More (${spectators.length} of ${spectatorCount})`}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Voice & Video Call Bar */}
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

        {/* Game Status - Responsive */}
        {gameStatus === "waiting" && (
          <div style={{ textAlign: "center" }}>
            <LoadingSpinner variant="yellow" size="md" />
            <p className="neon-text-yellow" style={{
              marginTop: isMobile ? "12px" : "16px",
              fontSize: isMobile ? "16px" : "18px",
            }}>Waiting for opponent...</p>
          </div>
        )}

        {gameStatus === "playing" && (
          <motion.div
            style={{
              padding: isMobile ? "12px 16px" : "16px 24px",
              backgroundColor: timeLeft !== null && timeLeft <= 5
                ? "rgba(255, 49, 49, 0.12)"
                : isMyTurn
                ? "rgba(0, 255, 255, 0.08)"
                : "rgba(13, 13, 13, 0.6)",
              borderRadius: "14px",
              border: `2px solid ${
                timeLeft !== null && timeLeft <= 5
                  ? "#FF3131"
                  : isMyTurn
                  ? "#00FFFF"
                  : "var(--border-color, #1a1a1a)"
              }`,
              width: "100%",
              maxWidth: isMobile ? "100%" : "420px",
              boxShadow: timeLeft !== null && timeLeft <= 5
                ? "0 0 22px rgba(255, 49, 49, 0.55)"
                : isMyTurn
                ? "0 0 16px rgba(0, 255, 255, 0.25)"
                : "none",
              transition: "all 0.3s ease",
            }}
            animate={
              timeLeft !== null && timeLeft <= 5
                ? { scale: [1, 1.02, 1] }
                : {}
            }
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: turnDuration > 0 && typeof timeLeft === "number" ? "10px" : "0",
            }}>
              <p className={!isSpectator && isMyTurn ? "neon-text-cyan" : ""} style={{
                fontSize: isMobile ? "15px" : "18px",
                fontWeight: "bold",
                margin: 0,
                color: timeLeft !== null && timeLeft <= 5 ? "#FF3131" : (!isSpectator && isMyTurn) ? "#00FFFF" : "var(--text-main, #e5e7eb)",
                textShadow: timeLeft !== null && timeLeft <= 5 ? "0 0 8px #FF3131" : undefined,
              }}>
                {isSpectator
                  ? `⚡ ${currentTurn === "X" ? player1Name : player2Name}'s Turn (${currentTurn})`
                  : isMyTurn
                  ? "⚡ Your Turn!"
                  : "Opponent's Turn..."}
              </p>

              {turnDuration > 0 && typeof timeLeft === "number" && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  backgroundColor: timeLeft <= 5 ? "rgba(255, 49, 49, 0.2)" : "rgba(255, 255, 255, 0.06)",
                  border: `1px solid ${timeLeft <= 5 ? "#FF3131" : "rgba(255, 255, 255, 0.15)"}`,
                  color: timeLeft <= 5 ? "#FF3131" : "var(--text-main, #e5e7eb)",
                  fontWeight: 700,
                  fontSize: isMobile ? "12px" : "13px",
                  boxShadow: timeLeft <= 5 ? "0 0 10px rgba(255, 49, 49, 0.5)" : "none",
                }}>
                  {timeLeft <= 5 ? (
                    <AlertTriangle style={{ width: "14px", height: "14px", color: "#FF3131" }} />
                  ) : (
                    <Timer style={{ width: "14px", height: "14px", color: isMyTurn ? "#00FFFF" : "#9ca3af" }} />
                  )}
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>

            {/* Synchronized Countdown Bar */}
            {turnDuration > 0 && typeof timeLeft === "number" && (
              <div style={{
                width: "100%",
                height: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "3px",
                overflow: "hidden",
                position: "relative",
              }}>
                <motion.div
                  style={{
                    height: "100%",
                    borderRadius: "3px",
                    backgroundColor: timeLeft <= 5 ? "#FF3131" : isMyTurn ? "#00FFFF" : "var(--accent-o, #FF00FF)",
                    boxShadow: timeLeft <= 5 ? "0 0 12px rgba(255, 49, 49, 0.9)" : "0 0 8px rgba(0, 255, 255, 0.4)",
                  }}
                  initial={false}
                  animate={{
                    width: `${Math.min(100, Math.max(0, (timeLeft / turnDuration) * 100))}%`,
                  }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>
            )}
          </motion.div>
        )}

        {gameStatus === "finished" && winner && (
          <div style={{
            textAlign: "center",
            padding: isMobile ? "16px 20px" : "24px",
            backgroundColor: isSpectator
              ? (winner === "draw" ? "rgba(255,215,0,0.1)" : "rgba(0,255,65,0.1)")
              : (winner === playerSymbol ? "rgba(0,255,65,0.1)" : winner === "draw" ? "rgba(255,215,0,0.1)" : "rgba(255,49,49,0.1)"),
            borderRadius: "16px",
            border: `2px solid ${
              isSpectator
                ? (winner === "draw" ? "#FFD700" : "#00FF41")
                : (winner === playerSymbol ? "#00FF41" : winner === "draw" ? "#FFD700" : "#FF3131")
            }`,
            width: "100%",
          }}>
            <p className={
              isSpectator
                ? (winner === "draw" ? "neon-text-yellow" : "neon-text-green")
                : (winner === playerSymbol ? "neon-text-green" : winner === "draw" ? "neon-text-yellow" : "neon-text-red")
            }
              style={{
                fontSize: isMobile ? "clamp(20px, 6vw, 28px)" : "32px",
                fontWeight: "bold",
                margin: 0,
              }}>
              {isSpectator
                ? (winner === "draw" ? "🤝 Game Ended in a Draw!" : `🏆 ${winner === "X" ? player1Name : player2Name} (${winner}) Won!`)
                : (winner === playerSymbol ? "🎉 You Won!" : winner === "draw" ? "🤝 Draw!" : "😔 You Lost")}
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? "16px" : "24px", width: "100%", alignItems: isMobile ? "center" : "flex-start", justifyContent: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: cellGap,
              padding: boardPadding,
              backgroundColor: "var(--bg-card, rgba(13,13,13,0.8))",
              borderRadius: isMobile ? "16px" : "24px",
              border: "1px solid var(--border-color, #1a1a1a)",
              width: boardSize,
              maxWidth: "100%",
              boxSizing: "border-box",
            }}>
              {/* Floating Reactions Overlay over the game board */}
              <FloatingReactionsOverlay
                reactions={floatingReactions}
                currentUserId={session?.user?.id}
              />

              {board.map((cell, index) => (
                <motion.button
                  key={index}
                  onClick={() => {
                    if (!isSpectator && isMyTurn && cell === null && socket) {
                      socket.emit("make-move", {
                        roomId,
                        cellIndex: index,
                        playerId: session?.user?.id,
                      });
                    }
                  }}
                  disabled={cell !== null || isSpectator || !isMyTurn || gameStatus !== "playing"}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell ? "var(--bg-card-solid, #111)" : "var(--bg-card, rgba(17,17,17,0.8))",
                    border: winningLine?.includes(index) ? "2px solid #FFD700" : "2px solid var(--border-color, #1a1a1a)",
                    borderRadius: isMobile ? "8px" : "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: cell || isSpectator || !isMyTurn || gameStatus !== "playing" ? "default" : "pointer",
                    transition: "all 0.3s",
                    boxShadow: winningLine?.includes(index) ? "0 0 20px #FFD700" : "none",
                    overflow: "hidden",
                  }}
                  whileHover={!isSpectator && isMyTurn && !cell && gameStatus === "playing" ? { scale: 1.05, borderColor: "var(--accent-x, #00FFFF44)" } : {}}
                  whileTap={!isSpectator && isMyTurn && !cell && gameStatus === "playing" ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  {cell && (
                    <div style={{ width: cellSize * 0.65, height: cellSize * 0.65 }}>
                      <GameSkinIcon symbol={cell} size={cellSize * 0.65} />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div style={{ width: isMobile ? "100%" : "340px", maxWidth: "100%" }}>
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

        {/* Rematch Section - Responsive */}
        {gameStatus === "finished" && (
          <div style={{
            display: "flex",
            gap: isMobile ? "12px" : "16px",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}>
            {isSpectator ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <p style={{ color: "var(--text-muted, #9ca3af)", fontSize: isMobile ? "13px" : "14px", margin: 0, textAlign: "center" }}>
                  👁️ Spectating • Waiting for players to start rematch or leave
                </p>
                <motion.button
                  onClick={handleLeaveRoom}
                  whileHover={{
                    scale: 1.05,
                    y: -2,
                    boxShadow: "0 0 25px rgba(255,255,255,.5)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={gameButtonStyle(
                    "#ffffff",
                    "0 0 15px rgba(255,255,255,.25)",
                    "rgba(255,255,255,0.03)",
                    isMobile
                  )}
                >
                  Back to Lobby
                </motion.button>
              </div>
            ) : !rematchRequested ? (
              <>
                <motion.button
                  onClick={handleRematch}
                  disabled={rematchAccepted}
                  whileHover={{
                    scale: 1.05,
                    y: -2,
                    boxShadow: "0 0 25px rgba(255,215,0,.7)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={gameButtonStyle(
                    "#FFD700",
                    "0 0 15px rgba(255,215,0,.45)",
                    "rgba(255,255,255,0.03)",
                    isMobile
                  )}
                >
                  {rematchAccepted ? "Waiting for Opponent..." : "Play Again"}
                </motion.button>
                {gameId && (
                  <motion.button
                    onClick={() => {
                      playSfx("click");
                      router.push(`/replay/${gameId}`);
                    }}
                    whileHover={{
                      scale: 1.05,
                      y: -2,
                      boxShadow: "0 0 25px rgba(0,255,255,.7)",
                    }}
                    whileTap={{ scale: 0.97 }}
                    style={gameButtonStyle(
                      "#00FFFF",
                      "0 0 15px rgba(0,255,255,.45)",
                      "rgba(0,255,255,0.08)",
                      isMobile
                    )}
                  >
                    <Play size={18} style={{ marginRight: "8px" }} fill="#00FFFF" />
                    Watch Replay
                  </motion.button>
                )}
                <motion.button
                  onClick={handleLeaveRoom}
                  whileHover={{
                    scale: 1.05,
                    y: -2,
                    boxShadow: "0 0 25px rgba(255,255,255,.5)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={gameButtonStyle(
                    "#ffffff",
                    "0 0 15px rgba(255,255,255,.25)",
                    "rgba(255,255,255,0.03)",
                    isMobile
                  )}
                >
                  Back to Lobby
                </motion.button>
              </>
            ) : (
              <>
                <p className="neon-text-yellow" style={{
                  fontSize: isMobile ? "16px" : "18px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  textAlign: "center",
                }}>
                  Opponent wants a rematch!
                </p>
                <div style={{ display: "flex", gap: isMobile ? "12px" : "16px" }}>
                  <motion.button
                    onClick={handleAcceptRematch}
                    whileHover={{
                      scale: 1.05,
                      y: -2,
                      boxShadow: "0 0 25px rgba(0,255,65,.6)",
                    }}
                    whileTap={{ scale: 0.97 }}
                    style={gameButtonStyle(
                      "#00FF41",
                      "0 0 15px rgba(0,255,65,.45)",
                      "rgba(255,255,255,0.03)",
                      isMobile
                    )}
                  >
                    Accept
                  </motion.button>
                  <motion.button
                    onClick={handleRejectRematch}
                    whileHover={{
                      scale: 1.05,
                      y: -2,
                      boxShadow: "0 0 25px rgba(255,49,49,.6)",
                    }}
                    whileTap={{ scale: 0.97 }}
                    style={gameButtonStyle(
                      "#FF3131",
                      "0 0 15px rgba(255,49,49,.45)",
                      "rgba(255,255,255,0.03)",
                      isMobile
                    )}
                  >
                    Reject
                  </motion.button>
                </div>
              </>
            )}
          </div>
        )}
        {/* Call Modals (Incoming call, spectator join requests) */}
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

// Player Card Component - Responsive
function PlayerCard({
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
        minWidth: isMobile ? "140px" : "200px",
        flex: isMobile ? 1 : "none",
        maxWidth: isMobile ? "180px" : "none",
        position: "relative",
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
      {isActive && typeof timeLeft === "number" && (
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
}
