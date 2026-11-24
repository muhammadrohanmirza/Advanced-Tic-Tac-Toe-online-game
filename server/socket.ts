import { Server, Socket } from 'socket.io'
import { roomManager } from './roomManager'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import {
  callStartSchema,
  callCancelSchema,
  callJoinRequestSchema,
  callJoinResponseSchema,
  webrtcOfferSchema,
  webrtcAnswerSchema,
  webrtcCandidateSchema,
  webrtcRequestOfferSchema,
  callModerateSchema,
  callMediaStateSchema,
  callSettingChangeSchema,
} from '../lib/webrtc'

const ALLOWED_REACTIONS = ["👍", "😂", "😮", "😡", "❤️", "🔥", "GG"] as const
type AllowedReaction = typeof ALLOWED_REACTIONS[number]

// Reaction cooldowns: 1.0s for player, 1.5s for spectator
const reactionCooldowns = new Map<string, number>()
const PLAYER_REACTION_COOLDOWN_MS = 1000
const SPECTATOR_REACTION_COOLDOWN_MS = 1500

// Spectator chat spam protection: max 1 message per 2.0 seconds per user
const spectatorChatCooldowns = new Map<string, number>()
const SPECTATOR_CHAT_COOLDOWN_MS = 2000

// Per-room spectator message timestamps: max 20 spectator messages per 10 seconds in total
const roomSpectatorChatTimestamps = new Map<string, number[]>()
const ROOM_CHAT_WINDOW_MS = 10000
const MAX_ROOM_SPECTATOR_MESSAGES_PER_WINDOW = 20

// Debounced count broadcasts: at most once per 500ms when many people join/leave at once
const spectatorCountDebounceTimers = new Map<string, NodeJS.Timeout>()

// WebRTC Signaling & Media state rate limiters
const signalingRateLimits = new Map<string, { count: number; resetTime: number }>()
function checkSignalingRateLimit(socketId: string, limit = 35, windowMs = 1000): boolean {
  const now = Date.now()
  const rec = signalingRateLimits.get(socketId)
  if (!rec || now > rec.resetTime) {
    signalingRateLimits.set(socketId, { count: 1, resetTime: now + windowMs })
    return true
  }
  if (rec.count >= limit) return false
  rec.count += 1
  return true
}

const mediaStateRateLimits = new Map<string, { count: number; resetTime: number }>()
function checkMediaStateRateLimit(socketId: string, limit = 10, windowMs = 5000): boolean {
  const now = Date.now()
  const rec = mediaStateRateLimits.get(socketId)
  if (!rec || now > rec.resetTime) {
    mediaStateRateLimits.set(socketId, { count: 1, resetTime: now + windowMs })
    return true
  }
  if (rec.count >= limit) return false
  rec.count += 1
  return true
}


function getRoomMember(room: ReturnType<typeof roomManager.resolveRoom>, socket: Socket, userId?: string) {
  if (!room) return null
  let uid = userId
  let name = 'User'
  let isPlayer = false

  if (room.player1 && (room.player1.socketId === socket.id || (uid && room.player1.id === uid))) {
    uid = room.player1.id
    name = room.player1.name
    isPlayer = true
    room.player1.socketId = socket.id
  } else if (room.player2 && (room.player2.socketId === socket.id || (uid && room.player2.id === uid))) {
    uid = room.player2.id
    name = room.player2.name
    isPlayer = true
    room.player2.socketId = socket.id
  } else if (room.spectators) {
    for (const spec of Array.from(room.spectators.values())) {
      if (spec.socketIds.has(socket.id) || (uid && spec.id === uid)) {
        uid = spec.id
        name = spec.name
        isPlayer = false
        spec.socketIds.add(socket.id)
        break
      }
    }
  }

  if (!uid) return null
  return { userId: uid, name, role: isPlayer ? ('player' as const) : ('spectator' as const) }
}

function getParticipantSocketId(room: ReturnType<typeof roomManager.resolveRoom>, targetUserId: string): string | undefined {
  if (!room) return undefined
  const call = room.call
  const target = call?.participants.get(targetUserId)
  let targetSocketId = target?.socketId
  if (room.player1?.id === targetUserId && room.player1.socketId) targetSocketId = room.player1.socketId
  if (room.player2?.id === targetUserId && room.player2.socketId) targetSocketId = room.player2.socketId
  if (room.spectators) {
    for (const spec of Array.from(room.spectators.values())) {
      if (spec.id === targetUserId && spec.socketIds.size > 0) {
        if (!targetSocketId || !spec.socketIds.has(targetSocketId)) {
          targetSocketId = Array.from(spec.socketIds)[spec.socketIds.size - 1]
        }
      }
    }
  }
  return targetSocketId
}

function emitDebouncedSpectatorCount(io: Server, roomId: string) {
  const room = roomManager.resolveRoom(roomId)
  if (!room) return

  if (spectatorCountDebounceTimers.has(room.id)) {
    return
  }

  const timer = setTimeout(() => {
    spectatorCountDebounceTimers.delete(room.id)
    const currentRoom = roomManager.resolveRoom(room.id)
    if (currentRoom) {
      const count = currentRoom.spectators ? currentRoom.spectators.size : 0
      io.to(currentRoom.id).emit('spectator-count-updated', {
        roomId: currentRoom.id,
        count
      })
    }
  }, 500)

  spectatorCountDebounceTimers.set(room.id, timer)
}

async function saveMultiplayerGame(
  room: ReturnType<typeof roomManager.resolveRoom>,
  winner: string | null,
  winningLine: number[] | null,
  isDraw: boolean
): Promise<string | null> {
  if (!room) return null
  try {
    const saved = await prisma.game.create({
      data: {
        mode: 'multiplayer',
        playerX: room.player1?.name || 'Player X',
        playerO: room.player2?.name || 'Player O',
        playerXId: room.player1?.id || null,
        playerOId: room.player2?.id || null,
        winner: winner || (isDraw ? 'draw' : null),
        winningLine: winningLine ? JSON.stringify(winningLine) : null,
        moves: (room.moves || []) as any,
      }
    })
    room.savedGameId = saved.id
    console.log(`[Socket] Saved multiplayer game record ${saved.id} for room ${room.id}`)
    return saved.id
  } catch (err) {
    console.error(`[Socket] Failed to save multiplayer game record:`, err)
    return null
  }
}

function startRoomTurnTimer(io: Server, roomId: string) {
  const room = roomManager.resolveRoom(roomId)
  if (!room || room.status !== 'playing' || !room.turnDuration || room.turnDuration <= 0) {
    if (room) roomManager.clearRoomTimer(room.id)
    return
  }

  // Clear existing timer before starting a new one
  roomManager.clearRoomTimer(room.id)

  const now = Date.now()
  room.turnStartTime = now
  room.turnDeadline = now + (room.turnDuration * 1000)

  // Broadcast timer update to all players/spectators in room
  io.to(room.id).emit('timer-update', {
    roomId: room.id,
    currentTurn: room.currentTurn,
    turnDuration: room.turnDuration,
    turnDeadline: room.turnDeadline,
    turnStartTime: room.turnStartTime,
    timeoutCountX: room.timeoutCountX || 0,
    timeoutCountO: room.timeoutCountO || 0,
  })

  console.log(`[Socket] Timer started for room ${room.id} (Turn: ${room.currentTurn}, Duration: ${room.turnDuration}s)`)

  const timerHandle = setTimeout(() => {
    handleTurnTimeout(io, room.id)
  }, room.turnDuration * 1000)

  roomManager.setRoomTimer(room.id, timerHandle)
}

async function handleTurnTimeout(io: Server, roomId: string) {
  const room = roomManager.resolveRoom(roomId)
  if (!room || room.status !== 'playing') {
    if (room) roomManager.clearRoomTimer(room.id)
    return
  }

  const timedOutSymbol = room.currentTurn
  const timedOutPlayer = timedOutSymbol === 'X' ? room.player1 : room.player2
  const opponentPlayer = timedOutSymbol === 'X' ? room.player2 : room.player1
  const opponentSymbol = timedOutSymbol === 'X' ? 'O' : 'X'

  if (!timedOutPlayer) return

  // Increment consecutive timeouts for this player
  if (timedOutSymbol === 'X') {
    room.timeoutCountX = (room.timeoutCountX || 0) + 1
  } else {
    room.timeoutCountO = (room.timeoutCountO || 0) + 1
  }

  const consecutive = timedOutSymbol === 'X' ? room.timeoutCountX : room.timeoutCountO
  console.log(`[Socket] Timeout in room ${room.id}: Player ${timedOutSymbol} (${timedOutPlayer.name}) consecutive timeouts = ${consecutive}`)

  // 3 consecutive timeouts -> FORFEIT
  if (consecutive >= 3) {
    roomManager.clearRoomTimer(room.id)
    room.status = 'finished'
    room.winner = opponentSymbol
    room.winningLine = null
    room.turnDeadline = null
    room.turnStartTime = null

    console.log(`[Socket] Player ${timedOutSymbol} (${timedOutPlayer.name}) forfeited room ${room.id} due to 3 consecutive timeouts!`)

    // Emit turn timeout forfeit event
    io.to(room.id).emit('turn-timeout', {
      roomId: room.id,
      timedOutPlayerId: timedOutPlayer.id,
      consecutiveTimeouts: consecutive,
      isForfeit: true,
    })

    // Save forfeit game to Game model
    const savedGameId = await saveMultiplayerGame(room, opponentSymbol, null, false)

    // Emit game-over with forfeit details
    io.to(room.id).emit('game-over', {
      winner: opponentSymbol,
      winningLine: null,
      isDraw: false,
      isForfeit: true,
      forfeitedBy: timedOutPlayer.name,
      gameId: savedGameId,
    })

    // Persist forfeit win/loss to Database Score model
    try {
      if (opponentPlayer?.id) {
        await prisma.score.create({
          data: {
            userId: opponentPlayer.id,
            game: 'tictactoe',
            result: 'win',
            opponent: timedOutPlayer.name || null,
          },
        })
      }
      if (timedOutPlayer?.id) {
        await prisma.score.create({
          data: {
            userId: timedOutPlayer.id,
            game: 'tictactoe',
            result: 'loss',
            opponent: opponentPlayer?.name || null,
          },
        })
      }
      console.log(`[Socket] Saved forfeit scores to DB for room ${room.id}`)
    } catch (err) {
      console.error(`[Socket] Failed to save forfeit score:`, err)
    }
    return
  }

  // Under 3 timeouts -> Make random valid auto-move
  const emptyCells: number[] = []
  room.board.forEach((cell, idx) => {
    if (cell === '') emptyCells.push(idx)
  })

  if (emptyCells.length === 0) {
    roomManager.clearRoomTimer(room.id)
    return
  }

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  console.log(`[Socket] Auto-move for ${timedOutSymbol} at cell ${randomCell} in room ${room.id}`)

  const result = roomManager.makeMove(room.id, randomCell, timedOutPlayer.id, true)
  if (result.error) {
    console.error(`[Socket] Auto-move error: ${result.error}`)
    return
  }

  // Emit turn timeout notification
  io.to(room.id).emit('turn-timeout', {
    roomId: room.id,
    timedOutPlayerId: timedOutPlayer.id,
    consecutiveTimeouts: consecutive,
    isForfeit: false,
  })

  // Emit updated board
  io.to(room.id).emit('board-updated', {
    board: result.board,
    currentTurn: result.nextTurn,
    lastMove: randomCell,
    isAutoMove: true,
    timedOutPlayerId: timedOutPlayer.id,
    consecutiveTimeouts: consecutive,
    turnDuration: room.turnDuration,
    turnDeadline: room.turnDeadline,
    turnStartTime: room.turnStartTime,
    timeoutCountX: room.timeoutCountX,
    timeoutCountO: room.timeoutCountO,
  })

  if (result.gameOver) {
    roomManager.clearRoomTimer(room.id)
    const savedGameId = await saveMultiplayerGame(room, result.winner, result.winningLine, Boolean(result.isDraw))
    io.to(room.id).emit('game-over', {
      winner: result.winner,
      winningLine: result.winningLine,
      isDraw: result.isDraw,
      gameId: savedGameId,
    })
  } else {
    // Restart timer for next player's turn
    startRoomTurnTimer(io, room.id)
  }
}

export function setupSocketEvents(io: Server) {
  console.log('[Socket] Setting up socket event handlers...')

  const broadcastPublicRooms = () => {
    const rooms = roomManager.getPublicRooms()
    io.emit('public-rooms-list', { rooms })
  }

  io.on('connection', (socket: Socket) => {
    console.log('✅ Client connected:', socket.id)

    socket.on('create-room', (data) => {
      console.log('create-room received:', data)
      const { userId, userName, isPublic, turnDuration } = data || {}

      if (!userId || !userName) {
        socket.emit('error', { message: 'User info missing' })
        return
      }

      const player = {
        id: userId,
        name: userName,
        socketId: socket.id,
        symbol: 'X' as const
      }

      const safeTurnDuration = [15, 30, 45].includes(Number(turnDuration)) ? Number(turnDuration) : 0
      const room = roomManager.createRoom(player, isPublic, safeTurnDuration)
      socket.join(room.id)

      console.log('Room created:', room.id, room.code)

      socket.emit('room-created', {
        room: {
          id: room.id,
          code: room.code,
          board: room.board,
          currentTurn: room.currentTurn,
          status: room.status,
          winner: room.winner,
          winningLine: room.winningLine,
          isPublic: room.isPublic,
          player1: room.player1,
          player2: room.player2,
          turnDuration: room.turnDuration,
          turnDeadline: room.turnDeadline,
          turnStartTime: room.turnStartTime,
          timeoutCountX: room.timeoutCountX,
          timeoutCountO: room.timeoutCountO,
          messages: room.messages || []
        },
        roomId: room.id,
        roomCode: room.code
      })
      socket.emit('call-state', roomManager.getCallState(room.id))
      broadcastPublicRooms()
    })

    socket.on('join-room', (data) => {
      console.log('join-room received:', data)
      const { roomId, userId, userName } = data || {}

      if (!roomId || !userId) {
        socket.emit('error', { message: 'Missing room code or user info' })
        return
      }

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:join-room] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const player = {
        id: userId,
        name: userName || 'Player',
        socketId: socket.id,
        symbol: 'O' as const
      }

      const result = roomManager.joinRoom(room.id, player)

      if (result.error) {
        socket.emit('error', { message: result.error })
        return
      }

      const joinedRoom = result.room!
      socket.join(joinedRoom.id)

      console.log('Player joined:', joinedRoom.id, joinedRoom.code)

      const roomPayload = {
        id: joinedRoom.id,
        code: joinedRoom.code,
        board: joinedRoom.board,
        currentTurn: joinedRoom.currentTurn,
        status: joinedRoom.status,
        winner: joinedRoom.winner,
        winningLine: joinedRoom.winningLine,
        isPublic: joinedRoom.isPublic,
        player1: joinedRoom.player1,
        player2: joinedRoom.player2,
        turnDuration: joinedRoom.turnDuration,
        turnDeadline: joinedRoom.turnDeadline,
        turnStartTime: joinedRoom.turnStartTime,
        timeoutCountX: joinedRoom.timeoutCountX,
        timeoutCountO: joinedRoom.timeoutCountO,
        messages: joinedRoom.messages || []
      }

      socket.emit('room-joined', {
        room: roomPayload,
        roomId: joinedRoom.id,
        roomCode: joinedRoom.code
      })
      socket.emit('call-state', roomManager.getCallState(joinedRoom.id))

      socket.to(joinedRoom.id).emit('player-joined', {
        room: roomPayload,
        roomId: joinedRoom.id,
        player
      })

      // Start authoritative turn timer if room has turn timer enabled
      if (joinedRoom.turnDuration > 0 && joinedRoom.status === 'playing') {
        startRoomTurnTimer(io, joinedRoom.id)
      }
      broadcastPublicRooms()
    })

    socket.on('spectate-room', (data) => {
      console.log('spectate-room received:', data)
      const { roomId, userId, userName } = data || {}

      if (!roomId || !userId) {
        socket.emit('error', { message: 'Missing room code or user info' })
        return
      }

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:spectate-room] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const spectatorData = {
        id: userId,
        name: userName || 'Spectator',
        socketId: socket.id
      }

      const result = roomManager.addSpectator(room.id, spectatorData)

      if (result.error || !result.room) {
        socket.emit('error', { message: result.error || 'Failed to spectate room' })
        return
      }

      const canonicalRoom = result.room
      socket.join(canonicalRoom.id)

      const firstSpectators = roomManager.getFirstNSpectators(canonicalRoom.id, 50)
      const specCount = canonicalRoom.spectators ? canonicalRoom.spectators.size : 0

      console.log(`[Socket] Spectator ${spectatorData.name} (${spectatorData.id}) spectating room ${canonicalRoom.id} (${canonicalRoom.code})`)

      // Send room data to the spectator (board, first 50 spectators, count, chat history)
      socket.emit('room-data', {
        room: {
          id: canonicalRoom.id,
          code: canonicalRoom.code,
          board: canonicalRoom.board,
          currentTurn: canonicalRoom.currentTurn,
          status: canonicalRoom.status,
          winner: canonicalRoom.winner,
          winningLine: canonicalRoom.winningLine,
          isPublic: canonicalRoom.isPublic,
          player1: canonicalRoom.player1,
          player2: canonicalRoom.player2,
          turnDuration: canonicalRoom.turnDuration,
          turnDeadline: canonicalRoom.turnDeadline,
          turnStartTime: canonicalRoom.turnStartTime,
          timeoutCountX: canonicalRoom.timeoutCountX,
          timeoutCountO: canonicalRoom.timeoutCountO,
          messages: canonicalRoom.messages || []
        },
        isSpectator: true,
        spectators: firstSpectators,
        spectatorCount: specCount,
        messages: canonicalRoom.messages || []
      })
      socket.emit('call-state', roomManager.getCallState(canonicalRoom.id))

      // Broadcast only if brand-new spectator (not duplicate tab or reconnect)
      if (result.isNew) {
        io.to(canonicalRoom.id).emit('spectator-joined', {
          spectator: result.spectator,
          spectatorsCount: specCount,
          roomId: canonicalRoom.id
        })
        emitDebouncedSpectatorCount(io, canonicalRoom.id)
      }
    })

    socket.on('get-spectators', (data) => {
      const { roomId, page = 1, pageSize = 50 } = data || {}
      if (!roomId) return

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:get-spectators] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const paged = roomManager.getSpectatorsPaged(room.id, page, pageSize)
      if (paged) {
        socket.emit('spectators-list', {
          roomId: room.id,
          ...paged
        })
      }
    })

    socket.on('make-move', async (data) => {
      const { roomId, cellIndex, playerId } = data || {}
      console.log('make-move:', roomId, cellIndex)

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:make-move] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // Verify that sender is a player, not a spectator
      const isPlayer1 = room.player1?.id === playerId || room.player1?.socketId === socket.id
      const isPlayer2 = room.player2?.id === playerId || room.player2?.socketId === socket.id
      if (!isPlayer1 && !isPlayer2) {
        console.log(`[Socket:make-move] Rejected move from spectator/non-player ${playerId} in room ${room.id}`)
        socket.emit('error', { message: 'Spectators cannot make moves' })
        return
      }

      const result = roomManager.makeMove(room.id, cellIndex, playerId)
      if (result.error) {
        socket.emit('error', { message: result.error })
        return
      }

      const updatedRoom = roomManager.resolveRoom(room.id)

      io.to(room.id).emit('board-updated', {
        board: result.board,
        currentTurn: result.nextTurn,
        lastMove: cellIndex,
        turnDuration: updatedRoom?.turnDuration,
        turnDeadline: updatedRoom?.turnDeadline,
        turnStartTime: updatedRoom?.turnStartTime,
        timeoutCountX: updatedRoom?.timeoutCountX,
        timeoutCountO: updatedRoom?.timeoutCountO,
      })

      if (result.gameOver) {
        roomManager.clearRoomTimer(room.id)
        const savedGameId = await saveMultiplayerGame(room, result.winner, result.winningLine, Boolean(result.isDraw))
        io.to(room.id).emit('game-over', {
          winner: result.winner,
          winningLine: result.winningLine,
          isDraw: result.isDraw,
          gameId: savedGameId,
        })
      } else if (room && room.turnDuration > 0) {
        startRoomTurnTimer(io, room.id)
      }
    })

    socket.on('send-message', (data) => {
      const { roomId, message, senderName, senderId, id } = data || {}
      if (!roomId || !senderId) return

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:send-message] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // 1. Determine role on server (never trust client)
      const isPlayer1 = room.player1?.id === senderId || room.player1?.socketId === socket.id
      const isPlayer2 = room.player2?.id === senderId || room.player2?.socketId === socket.id
      const isPlayer = isPlayer1 || isPlayer2
      const isSpectator = !isPlayer && Boolean(room.spectators && room.spectators.has(senderId))

      if (!isPlayer && !isSpectator) {
        console.log(`[Socket:send-message] Unauthorized message: ${senderId} not in room ${room.id}`)
        socket.emit('error', { message: 'You are not in this room' })
        return
      }

      const role: 'player' | 'spectator' = isPlayer ? 'player' : 'spectator'

      // 2. Trim and ignore empty messages
      let cleanMessage = typeof message === 'string' ? message.trim() : ''
      if (!cleanMessage) {
        return
      }

      // 3. Spam protection for spectators
      if (role === 'spectator') {
        if (cleanMessage.length > 200) {
          cleanMessage = cleanMessage.slice(0, 200)
        }

        const now = Date.now()

        // Per-user cooldown: 2 seconds
        const lastChatTime = spectatorChatCooldowns.get(senderId) || 0
        const elapsed = now - lastChatTime
        if (elapsed < SPECTATOR_CHAT_COOLDOWN_MS) {
          socket.emit('error', { message: 'Please wait a moment before sending another message' })
          return
        }

        // Per-room limit: max 20 spectator messages per 10 seconds total
        const roomTimes = roomSpectatorChatTimestamps.get(room.id) || []
        const recentTimes = roomTimes.filter(ts => now - ts < ROOM_CHAT_WINDOW_MS)
        if (recentTimes.length >= MAX_ROOM_SPECTATOR_MESSAGES_PER_WINDOW) {
          socket.emit('error', { message: 'Chat is busy, slow down' })
          return
        }
        recentTimes.push(now)
        roomSpectatorChatTimestamps.set(room.id, recentTimes)
        spectatorChatCooldowns.set(senderId, now)

        if (spectatorChatCooldowns.size > 2000) {
          spectatorChatCooldowns.forEach((ts, key) => {
            if (now - ts > 10000) spectatorChatCooldowns.delete(key)
          })
        }
      }

      const chatMessage = {
        id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        roomId: room.id,
        message: cleanMessage,
        senderName: senderName || (isPlayer ? (isPlayer1 ? room.player1?.name : room.player2?.name) : 'Spectator') || 'User',
        senderId,
        timestamp: Date.now(),
        role,
      }

      // 4. Save to room state (last 50 messages)
      roomManager.addChatMessage(room.id, chatMessage)

      // 5. Broadcast to EVERYONE in the socket room (both players and spectators)
      io.to(room.id).emit('new-message', chatMessage)
    })

    socket.on('typing', (data) => {
      const { roomId, userId, userName, isTyping } = data || {}
      if (!roomId) return

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:typing] Room not found for id/code: "${roomId}"`)
        return
      }

      // Broadcast typing indicator to everyone else in the room (players and spectators)
      socket.to(room.id).emit('user-typing', {
        roomId: room.id,
        userId,
        userName,
        isTyping
      })
    })

    socket.on('send-reaction', (data) => {
      const { roomId, reaction, senderId, senderName } = data || {}

      if (!roomId || !reaction || !senderId) {
        socket.emit('error', { message: 'Missing reaction data' })
        return
      }

      // 1. Validate emoji is from allowed list
      if (!ALLOWED_REACTIONS.includes(reaction as AllowedReaction)) {
        console.log(`[Socket:send-reaction] Invalid reaction attempted: ${reaction}`)
        socket.emit('error', { message: 'Invalid reaction emoji' })
        return
      }

      // 2. Validate room exists via canonical helper
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:send-reaction] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      // 3. Validate sender is actually in the room (player OR spectator)
      const isPlayer1 = room.player1?.id === senderId || room.player1?.socketId === socket.id
      const isPlayer2 = room.player2?.id === senderId || room.player2?.socketId === socket.id
      const isPlayer = isPlayer1 || isPlayer2
      const isSpectator = !isPlayer && Boolean(room.spectators && room.spectators.has(senderId))

      if (!isPlayer && !isSpectator) {
        console.log(`[Socket:send-reaction] Unauthorized reaction: ${senderId} not in room ${room.id}`)
        socket.emit('error', { message: 'You are not in this room' })
        return
      }

      // 4. Rate limiting: 1.0s for player, 1.5s for spectator
      const now = Date.now()
      const cooldownMs = isSpectator ? SPECTATOR_REACTION_COOLDOWN_MS : PLAYER_REACTION_COOLDOWN_MS
      const lastReactionTime = reactionCooldowns.get(senderId) || 0
      const elapsed = now - lastReactionTime

      if (elapsed < cooldownMs) {
        const retryAfterMs = cooldownMs - elapsed
        socket.emit('reaction-cooldown', {
          message: 'Please wait before reacting again',
          retryAfterMs
        })
        return
      }

      reactionCooldowns.set(senderId, now)

      // Prune cooldown entries if map grows large
      if (reactionCooldowns.size > 2000) {
        reactionCooldowns.forEach((ts, key) => {
          if (now - ts > 10000) {
            reactionCooldowns.delete(key)
          }
        })
      }

      const role: 'player' | 'spectator' = isPlayer ? 'player' : 'spectator'

      const reactionPayload = {
        id: `rx-${now}-${Math.random().toString(36).slice(2, 8)}`,
        roomId: room.id,
        reaction: reaction as AllowedReaction,
        senderId,
        senderName: senderName || (isPlayer ? (isPlayer1 ? room.player1?.name : room.player2?.name) : 'Spectator') || 'User',
        timestamp: now,
        role,
      }

      console.log(`[Socket] Reaction broadcast in ${room.id}:`, reactionPayload.reaction, 'from', reactionPayload.senderName, `(${role})`)
      io.to(room.id).emit('new-reaction', reactionPayload)
    })

    socket.on('get-room', (data) => {
      const { roomId, userId } = data || {}
      const room = roomManager.resolveRoom(roomId)
      if (room) {
        // Update player's socket ID if they reconnected
        if (userId) {
          roomManager.updatePlayerSocket(room.id, userId, socket.id)
        }
        socket.join(room.id)
        const isPlayer1 = room.player1?.id === userId || room.player1?.socketId === socket.id
        const isPlayer2 = room.player2?.id === userId || room.player2?.socketId === socket.id
        const isSpectator = !isPlayer1 && !isPlayer2
        const firstSpectators = roomManager.getFirstNSpectators(room.id, 50)
        const specCount = room.spectators ? room.spectators.size : 0

        socket.emit('room-data', {
          room: {
            id: room.id,
            code: room.code,
            board: room.board,
            currentTurn: room.currentTurn,
            status: room.status,
            winner: room.winner,
            winningLine: room.winningLine,
            isPublic: room.isPublic,
            player1: room.player1,
            player2: room.player2,
            turnDuration: room.turnDuration,
            turnDeadline: room.turnDeadline,
            turnStartTime: room.turnStartTime,
            timeoutCountX: room.timeoutCountX,
            timeoutCountO: room.timeoutCountO,
            messages: room.messages || []
          },
          isSpectator,
          spectators: firstSpectators,
          spectatorCount: specCount,
          messages: room.messages || []
        })
      } else {
        console.log(`[Socket:get-room] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
      }
    })

    socket.on('get-public-rooms', () => {
      const rooms = roomManager.getPublicRooms()
      socket.emit('public-rooms-list', { rooms })
    })

    socket.on('request-rematch', (data) => {
      const { roomId, playerId } = data || {}
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:request-rematch] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      if (room.player1?.id !== playerId && room.player2?.id !== playerId) {
        socket.emit('error', { message: 'Spectators cannot request rematches' })
        return
      }

      const result = roomManager.requestRematch(room.id, playerId)
      if (result.error) {
        socket.emit('error', { message: result.error })
        return
      }
      // Notify the other player about the rematch request
      socket.to(room.id).emit('rematch-requested', {
        requestedBy: playerId,
        roomId: room.id
      })
    })

    socket.on('accept-rematch', (data) => {
      const { roomId, playerId } = data || {}
      const currentRoom = roomManager.resolveRoom(roomId)
      if (!currentRoom) {
        console.log(`[Socket:accept-rematch] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      if (currentRoom.player1?.id !== playerId && currentRoom.player2?.id !== playerId) {
        socket.emit('error', { message: 'Spectators cannot accept rematches' })
        return
      }

      const room = roomManager.resetRoom(currentRoom.id)
      if (room) {
        const roomPayload = {
          id: room.id,
          code: room.code,
          board: room.board,
          currentTurn: room.currentTurn,
          status: room.status,
          winner: room.winner,
          winningLine: room.winningLine,
          isPublic: room.isPublic,
          player1: room.player1,
          player2: room.player2,
          turnDuration: room.turnDuration,
          turnDeadline: room.turnDeadline,
          turnStartTime: room.turnStartTime,
          timeoutCountX: room.timeoutCountX,
          timeoutCountO: room.timeoutCountO,
          messages: room.messages || []
        }
        io.to(room.id).emit('rematch-started', { room: roomPayload })
        if (room.turnDuration > 0) {
          startRoomTurnTimer(io, room.id)
        }
      }
    })

    socket.on('reject-rematch', (data) => {
      const { roomId, playerId } = data || {}
      const currentRoom = roomManager.resolveRoom(roomId)
      if (!currentRoom) {
        console.log(`[Socket:reject-rematch] Room not found for id/code: "${roomId}"`)
        socket.emit('error', { message: 'Room not found' })
        return
      }

      if (playerId && currentRoom.player1?.id !== playerId && currentRoom.player2?.id !== playerId) {
        socket.emit('error', { message: 'Spectators cannot reject rematches' })
        return
      }

      roomManager.rejectRematch(currentRoom.id)
      // Notify the requester that rematch was rejected
      socket.to(currentRoom.id).emit('rematch-rejected', {
        message: 'Opponent declined rematch'
      })
    })

    const handleCallLeaveForSocket = (targetRoom: ReturnType<typeof roomManager.resolveRoom>, targetSocketId: string) => {
      if (!targetRoom) return
      const callRes = roomManager.removeCallParticipant(targetRoom.id, targetSocketId)
      if (callRes.removedUser) {
        io.to(targetRoom.id).emit('call-participant-left', {
          userId: callRes.removedUser.userId,
          name: callRes.removedUser.name,
          reason: 'left',
          participants: callRes.callState?.participants || [],
          roomId: targetRoom.id
        })
        if (callRes.callEnded) {
          io.to(targetRoom.id).emit('call-ended', { roomId: targetRoom.id, reason: 'Call ended, everyone left' })
        }
        if (callRes.callState) {
          io.to(targetRoom.id).emit('call-state', callRes.callState)
        }
      }
    }

    // ==========================================
    // WebRTC & Voice/Video Call Signaling Events
    // ==========================================

    socket.on('call-start', (data) => {
      const parsed = callStartSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Call:Server] Dropped call-start: invalid payload', parsed.error.issues)
        }
        socket.emit('error', { message: 'Invalid call-start payload' })
        return
      }

      const { roomId, withVideo, userId } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-start: room not found "${roomId}"`)
        }
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const member = getRoomMember(room, socket, userId)
      if (!member || member.role !== 'player') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-start: member not player or not found (${socket.id}, ${userId})`)
        }
        socket.emit('error', { message: 'Only players can start a call' })
        return
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Call:Server] call-start from ${member.name} (${member.userId}) in room ${room.id}, withVideo: ${!!withVideo}`)
      }

      const res = roomManager.startCall(room.id, member.userId, member.name, socket.id, !!withVideo, () => {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Call in room ${room.id} timed out after 30 seconds ringing`)
        }
        io.to(room.id).emit('call-ended', { roomId: room.id, reason: 'No answer (call timed out)' })
        const currState = roomManager.getCallState(room.id)
        if (currState) {
          io.to(room.id).emit('call-state', currState)
        }
      })

      if (res.error || !res.participant || !res.callState) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-start: startCall failed "${res.error}"`)
        }
        socket.emit('error', { message: res.error || 'Failed to start call' })
        return
      }

      // Notify the other player about incoming call prompt
      const otherPlayer = room.player1?.id === member.userId ? room.player2 : room.player1
      if (otherPlayer?.socketId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Sending call-incoming to opponent ${otherPlayer.name} (${otherPlayer.id}) on socket ${otherPlayer.socketId}`)
        }
        io.to(otherPlayer.socketId).emit('call-incoming', {
          callerId: member.userId,
          callerName: member.name,
          withVideo: !!withVideo,
          roomId: room.id
        })
      }

      io.to(room.id).emit('call-state', res.callState)
      io.to(room.id).emit('call-participant-joined', {
        participant: res.participant,
        participants: res.callState.participants,
        roomId: room.id
      })
    })

    socket.on('call-cancel', (data) => {
      const parsed = callCancelSchema.safeParse(data)
      if (!parsed.success) return

      const { roomId, userId } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) return

      const member = getRoomMember(room, socket, userId)
      if (!member || member.role !== 'player') return

      const res = roomManager.cancelCall(room.id, member.userId)
      if (res.cancelled && res.callState) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Call cancelled by caller ${member.name} in room ${room.id}`)
        }
        io.to(room.id).emit('call-ended', { roomId: room.id, reason: 'Call cancelled by caller' })
        io.to(room.id).emit('call-state', res.callState)
      }
    })

    socket.on('call-join-request', (data) => {
      const parsed = callJoinRequestSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Call:Server] Dropped call-join-request: invalid payload', parsed.error.issues)
        }
        socket.emit('error', { message: 'Invalid call-join-request payload' })
        return
      }

      const { roomId, withVideo, userId } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-join-request: room not found "${roomId}"`)
        }
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const member = getRoomMember(room, socket, userId)
      if (!member) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-join-request: member not in room (${socket.id}, ${userId})`)
        }
        socket.emit('error', { message: 'You are not in this room' })
        return
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Call:Server] call-join-request from ${member.name} (${member.userId}, ${member.role}) in room ${room.id}, withVideo: ${!!withVideo}`)
      }

      // 1. If player joins, they join directly
      if (member.role === 'player') {
        const res = roomManager.addCallParticipant(room.id, member.userId, member.name, socket.id, !!withVideo)
        if (res.error || !res.participant || !res.callState) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[Call:Server] Dropped call-join-request for player: ${res.error}`)
          }
          socket.emit('error', { message: res.error || 'Failed to join call' })
          return
        }

        io.to(room.id).emit('call-state', res.callState)
        io.to(room.id).emit('call-participant-joined', {
          participant: res.participant,
          participants: res.callState.participants,
          roomId: room.id
        })
        return
      }

      // 2. Spectator joins based on room setting: 'ask' | 'allow' | 'off'
      const call = roomManager.ensureCall(room)
      if (call.status !== 'active') {
        socket.emit('error', { message: 'No active call to join' })
        return
      }

      const setting = call.spectatorCallSetting

      if (setting === 'off') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Spectator join rejected: call setting is 'off'`)
        }
        socket.emit('error', { message: 'Spectators are not allowed in this call' })
        return
      }

      if (setting === 'allow') {
        // Spectator joins muted with camera off
        const res = roomManager.addCallParticipant(room.id, member.userId, member.name, socket.id, false)
        if (res.error || !res.participant || !res.callState) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[Call:Server] Dropped spectator direct join: ${res.error}`)
          }
          socket.emit('error', { message: res.error || 'Failed to join call' })
          return
        }

        socket.emit('call-join-response', { accepted: true })
        io.to(room.id).emit('call-state', res.callState)
        io.to(room.id).emit('call-participant-joined', {
          participant: res.participant,
          participants: res.callState.participants,
          roomId: room.id
        })
        return
      }

      // 'ask' mode: check call capacity and bans before asking
      const maxParticipants = parseInt(process.env.MAX_CALL_PARTICIPANTS || '6', 10)
      if (call.participants.size >= maxParticipants && !call.participants.has(member.userId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Spectator join rejected: call is full`)
        }
        socket.emit('error', { message: 'Call is full' })
        return
      }
      if (call.removedUsers.has(member.userId) || call.removedSpectatorIds.has(member.userId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Spectator join rejected: user was removed`)
        }
        socket.emit('error', { message: 'You have been removed from this call by a player' })
        return
      }

      // Store pending request
      call.pendingJoinRequests.set(member.userId, {
        userId: member.userId,
        name: member.name,
        socketId: socket.id,
        withVideo: false
      })

      // Send prompt to players in room
      const playerSockets: string[] = []
      if (room.player1?.socketId) playerSockets.push(room.player1.socketId)
      if (room.player2?.socketId) playerSockets.push(room.player2.socketId)

      for (const pSock of playerSockets) {
        io.to(pSock).emit('call-join-request', {
          requesterId: member.userId,
          requesterName: member.name,
          withVideo: false,
          roomId: room.id
        })
      }
    })

    socket.on('call-join-response', (data) => {
      const parsed = callJoinResponseSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Call:Server] Dropped call-join-response: invalid payload', parsed.error.issues)
        }
        socket.emit('error', { message: 'Invalid call-join-response payload' })
        return
      }

      const { roomId, requesterId, accepted, withVideo, userId } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-join-response: room not found "${roomId}"`)
        }
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const member = getRoomMember(room, socket, userId)
      if (!member || member.role !== 'player') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-join-response: responder not player in room ${room.id}`)
        }
        socket.emit('error', { message: 'Only players can respond to call requests' })
        return
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Call:Server] call-join-response from ${member.name} (${member.userId}) for requester ${requesterId}, accepted: ${accepted} in room ${room.id}`)
      }

      const call = roomManager.ensureCall(room)

      // 1. Is this a response to a player's call invite?
      const isOtherPlayer = (room.player1?.id === requesterId || room.player2?.id === requesterId) && requesterId !== member.userId
      if (isOtherPlayer) {
        if (!accepted) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[Call:Server] Player ${member.name} declined call invite from ${requesterId}`)
          }
          const endedState = roomManager.endCall(room.id)
          io.to(room.id).emit('call-ended', { roomId: room.id, reason: `${member.name} declined the call` })
          if (endedState) {
            io.to(room.id).emit('call-state', endedState)
          }
          return
        }

        // Accepted call invite
        const res = roomManager.addCallParticipant(room.id, member.userId, member.name, socket.id, !!withVideo)
        if (res.error || !res.participant || !res.callState) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[Call:Server] Dropped call invite accept: ${res.error}`)
          }
          socket.emit('error', { message: res.error || 'Failed to join call' })
          return
        }

        io.to(room.id).emit('call-state', res.callState)
        io.to(room.id).emit('call-participant-joined', {
          participant: res.participant,
          participants: res.callState.participants,
          roomId: room.id
        })
        return
      }

      // 2. Spectator join request (first answer wins)
      const pending = call.pendingJoinRequests.get(requesterId)
      if (!pending) {
        return // Already handled by the other player
      }
      call.pendingJoinRequests.delete(requesterId)

      if (!accepted) {
        io.to(pending.socketId).emit('call-join-response', { accepted: false, reason: 'Join request was declined' })
        return
      }

      // Spectators join muted with camera off
      const res = roomManager.addCallParticipant(room.id, pending.userId, pending.name, pending.socketId, false)
      if (res.error || !res.participant || !res.callState) {
        io.to(pending.socketId).emit('call-join-response', { accepted: false, reason: res.error || 'Failed to join' })
        return
      }

      io.to(pending.socketId).emit('call-join-response', { accepted: true })
      io.to(room.id).emit('call-state', res.callState)
      io.to(room.id).emit('call-participant-joined', {
        participant: res.participant,
        participants: res.callState.participants,
        roomId: room.id
      })
    })

    socket.on('webrtc-offer', (data) => {
      if (!checkSignalingRateLimit(socket.id)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-offer: signaling rate limit exceeded for ${socket.id}`)
        }
        return
      }
      const parsed = webrtcOfferSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-offer: schema validation failed`, parsed.error.issues)
        }
        return
      }

      const { roomId, targetUserId, sdp } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-offer: room not found "${roomId}"`)
        }
        return
      }

      const member = getRoomMember(room, socket)
      if (!member) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-offer: member not in room for socket ${socket.id}`)
        }
        return
      }

      const call = roomManager.ensureCall(room)
      if (!call.participants.has(member.userId) || !call.participants.has(targetUserId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-offer: sender (${member.userId}) or target (${targetUserId}) not in call`)
        }
        return
      }

      const targetSocketId = getParticipantSocketId(room, targetUserId)

      if (targetSocketId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Relay webrtc-offer from ${member.userId} to ${targetUserId} in room ${room.id} (type: ${sdp.type})`)
        }
        io.to(targetSocketId).emit('webrtc-offer', {
          senderId: member.userId,
          sdp
        })
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-offer: target socket not found for ${targetUserId}`)
        }
      }
    })

    socket.on('webrtc-answer', (data) => {
      if (!checkSignalingRateLimit(socket.id)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-answer: signaling rate limit exceeded for ${socket.id}`)
        }
        return
      }
      const parsed = webrtcAnswerSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-answer: schema validation failed`, parsed.error.issues)
        }
        return
      }

      const { roomId, targetUserId, sdp } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-answer: room not found "${roomId}"`)
        }
        return
      }

      const member = getRoomMember(room, socket)
      if (!member) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-answer: member not in room for socket ${socket.id}`)
        }
        return
      }

      const call = roomManager.ensureCall(room)
      if (!call.participants.has(member.userId) || !call.participants.has(targetUserId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-answer: sender (${member.userId}) or target (${targetUserId}) not in call`)
        }
        return
      }

      const targetSocketId = getParticipantSocketId(room, targetUserId)

      if (targetSocketId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Relay webrtc-answer from ${member.userId} to ${targetUserId} in room ${room.id} (type: ${sdp.type})`)
        }
        io.to(targetSocketId).emit('webrtc-answer', {
          senderId: member.userId,
          sdp
        })
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-answer: target socket not found for ${targetUserId}`)
        }
      }
    })

    socket.on('webrtc-ice-candidate', (data) => {
      if (!checkSignalingRateLimit(socket.id)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-ice-candidate: signaling rate limit exceeded for ${socket.id}`)
        }
        return
      }
      const parsed = webrtcCandidateSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-ice-candidate: schema validation failed`, parsed.error.issues)
        }
        return
      }

      const { roomId, targetUserId, candidate } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-ice-candidate: room not found "${roomId}"`)
        }
        return
      }

      const member = getRoomMember(room, socket)
      if (!member) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-ice-candidate: member not in room for socket ${socket.id}`)
        }
        return
      }

      const call = roomManager.ensureCall(room)
      if (!call.participants.has(member.userId) || !call.participants.has(targetUserId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-ice-candidate: sender (${member.userId}) or target (${targetUserId}) not in call`)
        }
        return
      }

      const targetSocketId = getParticipantSocketId(room, targetUserId)

      if (targetSocketId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Relay webrtc-ice-candidate from ${member.userId} to ${targetUserId} in room ${room.id} (mid: ${candidate.sdpMid}, mline: ${candidate.sdpMLineIndex})`)
        }
        io.to(targetSocketId).emit('webrtc-ice-candidate', {
          senderId: member.userId,
          candidate
        })
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-ice-candidate: target socket not found for ${targetUserId}`)
        }
      }
    })

    socket.on('webrtc-request-offer', (data) => {
      if (!checkSignalingRateLimit(socket.id)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-request-offer: signaling rate limit exceeded for ${socket.id}`)
        }
        return
      }
      const parsed = webrtcRequestOfferSchema.safeParse(data)
      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-request-offer: schema validation failed`, parsed.error.issues)
        }
        return
      }

      const { roomId, targetUserId } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-request-offer: room not found "${roomId}"`)
        }
        return
      }

      const member = getRoomMember(room, socket)
      if (!member) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-request-offer: member not in room for socket ${socket.id}`)
        }
        return
      }

      const call = roomManager.ensureCall(room)
      if (!call.participants.has(member.userId) || !call.participants.has(targetUserId)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-request-offer: sender (${member.userId}) or target (${targetUserId}) not in call`)
        }
        return
      }

      const targetSocketId = getParticipantSocketId(room, targetUserId)

      if (targetSocketId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Relay webrtc-request-offer from ${member.userId} to ${targetUserId} in room ${room.id}`)
        }
        io.to(targetSocketId).emit('webrtc-request-offer', {
          senderId: member.userId
        })
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped webrtc-request-offer: target socket not found for ${targetUserId}`)
        }
      }
    })

    socket.on('call-leave', (data) => {
      const { roomId } = data || {}
      if (!roomId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-leave: missing roomId`)
        }
        return
      }
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Call:Server] Dropped call-leave: room not found "${roomId}"`)
        }
        return
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Call:Server] call-leave from socket ${socket.id} in room ${room.id}`)
      }
      handleCallLeaveForSocket(room, socket.id)
    })

    socket.on('call-end', (data) => {
      // Server-initiated only. Client-triggered call-end acts as call-leave for the sender.
      const { roomId } = data || {}
      if (!roomId) return
      const room = roomManager.resolveRoom(roomId)
      if (!room) return
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Call:Server] call-end received from socket ${socket.id} - routing to handleCallLeaveForSocket`)
      }
      handleCallLeaveForSocket(room, socket.id)
    })

    socket.on('call-moderate', (data) => {
      const parsed = callModerateSchema.safeParse(data)
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid moderation payload' })
        return
      }

      const { roomId, targetUserId, action } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const member = getRoomMember(room, socket)
      if (!member || member.role !== 'player') {
        socket.emit('error', { message: 'Only players can moderate call participants' })
        return
      }

      const targetParticipant = room.call?.participants.get(targetUserId)
      const targetSocketId = targetParticipant?.socketId

      const res = roomManager.moderateCallParticipant(room.id, member.userId, targetUserId, action)
      if (!res.success) {
        socket.emit('error', { message: res.error || 'Failed to moderate participant' })
        return
      }

      if (targetSocketId) {
        io.to(targetSocketId).emit('call-moderated', { action, moderatorName: member.name })
      }

      if (action === 'mute' || action === 'unmute') {
        io.to(room.id).emit('call-media-state', {
          userId: targetUserId,
          micOn: res.participant!.micOn,
          cameraOn: res.participant!.cameraOn,
          mutedByModerator: res.participant!.mutedByModerator
        })
      } else if (action === 'remove') {
        io.to(room.id).emit('call-participant-left', {
          userId: targetUserId,
          reason: 'removed',
          participants: res.callState?.participants || [],
          roomId: room.id
        })
        if (res.callEnded) {
          io.to(room.id).emit('call-ended', { roomId: room.id, reason: 'Call ended, everyone left' })
        }
      }

      if (res.callState) {
        io.to(room.id).emit('call-state', res.callState)
      }
    })

    socket.on('call-media-state', (data) => {
      if (!checkMediaStateRateLimit(socket.id)) return
      const parsed = callMediaStateSchema.safeParse(data)
      if (!parsed.success) return

      const { roomId, micOn, cameraOn } = parsed.data
      const room = roomManager.resolveRoom(roomId)
      if (!room) return

      const member = getRoomMember(room, socket)
      if (!member) return

      const updated = roomManager.updateCallMediaState(room.id, member.userId, micOn, cameraOn)
      if (updated) {
        io.to(room.id).emit('call-media-state', {
          userId: member.userId,
          micOn: updated.micOn,
          cameraOn: updated.cameraOn,
          mutedByModerator: updated.mutedByModerator
        })
      }
    })

    socket.on('call-setting-change', (data) => {
      const parsed = callSettingChangeSchema.safeParse(data)
      if (!parsed.success) return

      const { roomId, setting, spectatorsAllowed } = parsed.data
      const resolvedSetting = setting || spectatorsAllowed || 'ask'
      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      const member = getRoomMember(room, socket)
      // Only host (player1) can change call settings
      if (!member || room.player1?.id !== member.userId) {
        socket.emit('error', { message: 'Only the room host can change call settings' })
        return
      }

      const callState = roomManager.setCallSetting(room.id, resolvedSetting)
      if (callState) {
        io.to(room.id).emit('call-state', callState)
      }
    })

    socket.on('leave-room', (data) => {
      const { roomId } = data || {}
      if (!roomId) return

      const room = roomManager.resolveRoom(roomId)
      if (!room) {
        console.log(`[Socket:leave-room] Room not found for id/code: "${roomId}"`)
        return
      }

      // Clean up call participant if client was in call
      handleCallLeaveForSocket(room, socket.id)

      socket.leave(room.id)

      // 1. Check if leaving client was a spectator
      if (room.spectators) {
        let isSpec = false
        for (const spec of Array.from(room.spectators.values())) {
          if (spec.socketIds.has(socket.id)) {
            isSpec = true
            break
          }
        }
        if (isSpec) {
          const removedInfo = roomManager.removeSpectator(room.id, socket.id)
          if (removedInfo.removed) {
            io.to(room.id).emit('spectator-left', {
              spectatorId: removedInfo.removed.id,
              spectatorName: removedInfo.removed.name,
              spectatorsCount: removedInfo.count,
              roomId: room.id
            })
            emitDebouncedSpectatorCount(io, room.id)
          }
          return
        }
      }

      // 2. If it was a player
      roomManager.clearRoomTimer(room.id)
      roomManager.leaveRoom(room.id, socket.id)
      socket.to(room.id).emit('opponent-left', {
        message: 'Opponent left the game'
      })
      broadcastPublicRooms()
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)

      // 1. Check if disconnected client was a spectator
      const spectatedInfo = roomManager.findRoomBySpectatorSocketId(socket.id)
      if (spectatedInfo) {
        const { room } = spectatedInfo
        handleCallLeaveForSocket(room, socket.id)
        const removedInfo = roomManager.removeSpectator(room.id, socket.id)
        if (removedInfo.removed) {
          io.to(room.id).emit('spectator-left', {
            spectatorId: removedInfo.removed.id,
            spectatorName: removedInfo.removed.name,
            spectatorsCount: removedInfo.count,
            roomId: room.id
          })
          emitDebouncedSpectatorCount(io, room.id)
        }
      }

      // 2. Player disconnect handling
      const room = roomManager.findRoomBySocketId(socket.id)
      if (room) {
        handleCallLeaveForSocket(room, socket.id)
        const isP1 = room.player1?.socketId === socket.id
        const otherPlayer = isP1 ? room.player2 : room.player1
        if (!otherPlayer || room.status !== 'playing') {
          roomManager.clearRoomTimer(room.id)
        }
      }
      roomManager.handleDisconnect(socket.id)
      broadcastPublicRooms()
    })
  })

  console.log('[Socket] Socket event handlers setup complete')
}
