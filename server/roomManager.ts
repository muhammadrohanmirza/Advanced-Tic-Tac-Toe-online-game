import { v4 as uuidv4 } from 'uuid'

export interface Player {
  id: string
  name: string
  socketId: string
  symbol: 'X' | 'O'
}

export interface Spectator {
  id: string // userId
  name: string
  socketIds: Set<string>
  joinedAt: number
}

export interface ChatMessage {
  id: string
  roomId: string
  message: string
  senderName: string
  senderId: string
  timestamp: number
  isSystem?: boolean
  role?: 'player' | 'spectator'
}

export interface GameMoveRecord {
  step: number
  player: 'X' | 'O'
  cellIndex: number
  timestamp: number
}

export type CallRole = 'player' | 'spectator'
export type CallStatus = 'idle' | 'ringing' | 'active'
export type SpectatorCallSetting = 'ask' | 'allow' | 'off'
export type SpectatorCallPermission = SpectatorCallSetting | 'Ask' | 'Allow' | 'Off'

export interface CallParticipant {
  userId: string
  socketId: string
  name: string
  role: CallRole
  micOn: boolean
  cameraOn: boolean
  mutedByModerator: boolean
  joinedAt: number
}

export interface RoomCallState {
  status: CallStatus
  active: boolean
  startedBy: string | null
  callerName?: string | null
  withVideo?: boolean
  ringingTimer?: NodeJS.Timeout | null
  spectatorCallSetting: SpectatorCallSetting
  spectatorsAllowed: SpectatorCallPermission
  participants: Map<string, CallParticipant>
  removedUsers: Set<string>
  removedSpectatorIds: Set<string>
  pendingJoinRequests: Map<string, { userId: string; name: string; socketId: string; withVideo: boolean }>
}

export interface Room {
  id: string
  code: string
  player1: Player | null
  player2: Player | null
  spectators: Map<string, Spectator>
  board: string[]
  currentTurn: 'X' | 'O'
  status: 'waiting' | 'playing' | 'finished'
  winner: string | null
  winningLine: number[] | null
  isPublic: boolean
  createdAt: Date
  rematchRequestedBy: string | null
  turnDuration: number
  turnDeadline: number | null
  turnStartTime: number | null
  timeoutCountX: number
  timeoutCountO: number
  messages: ChatMessage[]
  moves: GameMoveRecord[]
  savedGameId: string | null
  call: RoomCallState
}

const WINNING_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

class RoomManager {
  private rooms = new Map<string, Room>()
  private roomTimers = new Map<string, NodeJS.Timeout>()

  clearRoomTimer(roomId: string) {
    const timer = this.roomTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      this.roomTimers.delete(roomId)
    }
  }

  setRoomTimer(roomId: string, timeout: NodeJS.Timeout) {
    this.clearRoomTimer(roomId)
    this.roomTimers.set(roomId, timeout)
  }

  generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  /**
   * Canonical helper to resolve a room by UUID or 4-character code.
   * - If 4 characters: look up uppercase code.
   * - Otherwise: check direct ID match or case-insensitive lowercase UUID.
   */
  resolveRoom(idOrCode: string | undefined | null): Room | null {
    if (!idOrCode || typeof idOrCode !== 'string') return null
    const trimmed = idOrCode.trim()
    if (!trimmed) return null

    // 1. If 4 characters, look up by uppercase code
    if (trimmed.length === 4) {
      const codeUpper = trimmed.toUpperCase()
      for (const room of Array.from(this.rooms.values())) {
        if (room.code === codeUpper) {
          return room
        }
      }
    }

    // 2. Direct map lookup
    const directMatch = this.rooms.get(trimmed)
    if (directMatch) return directMatch

    // 3. Case-insensitive UUID / ID lookup
    const trimmedLower = trimmed.toLowerCase()
    for (const room of Array.from(this.rooms.values())) {
      if (room.id.toLowerCase() === trimmedLower) {
        return room
      }
    }

    // 4. Fallback code match
    const trimmedUpper = trimmed.toUpperCase()
    for (const room of Array.from(this.rooms.values())) {
      if (room.code === trimmedUpper) {
        return room
      }
    }

    return null
  }

  getRoom(roomId: string): Room | null {
    return this.resolveRoom(roomId)
  }

  getRoomByCode(code: string): Room | null {
    return this.resolveRoom(code)
  }

  createRoom(player: Player, isPublic: boolean, turnDuration: number = 0): Room {
    const safeTurnDuration = [15, 30, 45].includes(Number(turnDuration)) ? Number(turnDuration) : 0
    const room: Room = {
      id: uuidv4(),
      code: this.generateCode(),
      player1: player,
      player2: null,
      spectators: new Map<string, Spectator>(),
      board: Array(9).fill(''),
      currentTurn: 'X',
      status: 'waiting',
      winner: null,
      winningLine: null,
      isPublic,
      createdAt: new Date(),
      rematchRequestedBy: null,
      turnDuration: safeTurnDuration,
      turnDeadline: null,
      turnStartTime: null,
      timeoutCountX: 0,
      timeoutCountO: 0,
      messages: [],
      moves: [],
      savedGameId: null,
      call: {
        status: 'idle',
        active: false,
        startedBy: null,
        callerName: null,
        withVideo: false,
        ringingTimer: null,
        spectatorCallSetting: 'ask',
        spectatorsAllowed: 'ask',
        participants: new Map<string, CallParticipant>(),
        removedUsers: new Set<string>(),
        removedSpectatorIds: new Set<string>(),
        pendingJoinRequests: new Map(),
      },
    }
    this.rooms.set(room.id, room)
    console.log(`[RoomManager] Room created: ${room.id} (${room.code}) - Timer: ${safeTurnDuration}s`)
    return room
  }

  addChatMessage(roomId: string, message: ChatMessage): ChatMessage | null {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    if (!room.messages) room.messages = []
    room.messages.push(message)
    if (room.messages.length > 50) {
      room.messages = room.messages.slice(-50)
    }
    return message
  }

  getChatMessages(roomId: string): ChatMessage[] {
    const room = this.resolveRoom(roomId)
    return room?.messages || []
  }

  joinRoom(codeOrId: string, player: Player) {
    const room = this.resolveRoom(codeOrId)

    if (!room) {
      console.log(`[RoomManager] Room not found: ${codeOrId}`)
      return { error: 'Room not found' }
    }

    if (room.player2) {
      console.log(`[RoomManager] Room full: ${room.code}`)
      return { error: 'Room is full' }
    }

    if (room.status === 'finished') {
      return { error: 'Game already finished' }
    }

    room.player2 = player
    room.status = 'playing'
    console.log(`[RoomManager] Player joined: ${room.code}`)
    return { room }
  }

  makeMove(roomId: string, cellIndex: number, playerId: string, isAutoMove: boolean = false) {
    const room = this.resolveRoom(roomId)
    if (!room) return { error: 'Room not found' }

    const playerSymbol = room.player1?.id === playerId ? 'X' : 'O'

    if (room.currentTurn !== playerSymbol) {
      return { error: 'Not your turn' }
    }

    if (room.board[cellIndex] !== '') {
      return { error: 'Cell already taken' }
    }

    room.board[cellIndex] = playerSymbol

    if (!room.moves) room.moves = []
    room.moves.push({
      step: room.moves.length + 1,
      player: playerSymbol,
      cellIndex,
      timestamp: Date.now()
    })

    // Clear active turn timer
    this.clearRoomTimer(room.id)

    // Reset moving player's consecutive timeouts count if it was a manual move
    if (!isAutoMove) {
      if (playerSymbol === 'X') {
        room.timeoutCountX = 0
      } else {
        room.timeoutCountO = 0
      }
    }

    const winResult = this.checkWinner(room.board)
    const isDraw = !winResult && room.board.every(cell => cell !== '')

    if (winResult) {
      room.winner = playerSymbol
      room.winningLine = winResult
      room.status = 'finished'
      console.log(`[RoomManager] Player ${playerSymbol} wins in ${room.id}`)
    } else if (isDraw) {
      room.status = 'finished'
      console.log(`[RoomManager] Draw in ${room.id}`)
    } else {
      room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X'
    }

    return {
      board: room.board,
      nextTurn: room.currentTurn,
      gameOver: room.status === 'finished',
      winner: room.winner,
      winningLine: room.winningLine,
      isDraw
    }
  }

  checkWinner(board: string[]) {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combo
      }
    }
    return null
  }

  addSpectator(
    codeOrId: string,
    spectator: { id: string; name: string; socketId: string }
  ): { error?: string; room?: Room; spectator?: { id: string; name: string; joinedAt: number }; isNew?: boolean } {
    const room = this.resolveRoom(codeOrId)

    if (!room) {
      return { error: 'Room not found' }
    }

    if (!room.spectators) {
      room.spectators = new Map<string, Spectator>()
    }

    // A player cannot join as a spectator
    if (room.player1?.id === spectator.id || room.player2?.id === spectator.id) {
      return { error: 'Players in this match cannot join as spectators' }
    }

    const maxSpectators = parseInt(process.env.MAX_SPECTATORS_PER_ROOM || '100', 10)

    // Check if spectator already exists by userId
    const existing = room.spectators.get(spectator.id)
    if (existing) {
      existing.socketIds.add(spectator.socketId)
      if (spectator.name) existing.name = spectator.name
      return {
        room,
        spectator: { id: existing.id, name: existing.name, joinedAt: existing.joinedAt },
        isNew: false
      }
    }

    if (room.spectators.size >= maxSpectators) {
      return { error: 'Room is full for spectators' }
    }

    const newSpec: Spectator = {
      id: spectator.id,
      name: spectator.name || 'Spectator',
      socketIds: new Set([spectator.socketId]),
      joinedAt: Date.now()
    }
    room.spectators.set(spectator.id, newSpec)
    console.log(`[RoomManager] Spectator ${newSpec.name} (${newSpec.id}) joined room ${room.code}. Total spectators: ${room.spectators.size}`)
    return {
      room,
      spectator: { id: newSpec.id, name: newSpec.name, joinedAt: newSpec.joinedAt },
      isNew: true
    }
  }

  removeSpectator(
    roomId: string,
    socketIdOrUserId: string
  ): { removed: { id: string; name: string } | null; count: number } {
    const room = this.resolveRoom(roomId)
    if (!room || !room.spectators) {
      return { removed: null, count: 0 }
    }

    let targetSpec: Spectator | null = null
    for (const spec of Array.from(room.spectators.values())) {
      if (spec.id === socketIdOrUserId || spec.socketIds.has(socketIdOrUserId)) {
        targetSpec = spec
        break
      }
    }

    if (!targetSpec) {
      return { removed: null, count: room.spectators.size }
    }

    // Remove socketId from spectator's active socket set
    targetSpec.socketIds.delete(socketIdOrUserId)

    // If explicit userId or all sockets closed, remove spectator completely
    if (targetSpec.id === socketIdOrUserId || targetSpec.socketIds.size === 0) {
      room.spectators.delete(targetSpec.id)
      console.log(`[RoomManager] Spectator ${targetSpec.name} (${targetSpec.id}) fully left room ${room.code}. Total spectators: ${room.spectators.size}`)
      return { removed: { id: targetSpec.id, name: targetSpec.name }, count: room.spectators.size }
    }

    // User still has another socket / tab open
    return { removed: null, count: room.spectators.size }
  }

  findRoomBySpectatorSocketId(socketId: string): { room: Room; spectator: Spectator } | null {
    for (const room of Array.from(this.rooms.values())) {
      if (room.spectators) {
        for (const spec of Array.from(room.spectators.values())) {
          if (spec.socketIds.has(socketId)) {
            return { room, spectator: spec }
          }
        }
      }
    }
    return null
  }

  getFirstNSpectators(roomId: string, n: number = 50): { id: string; name: string; joinedAt: number }[] {
    const room = this.resolveRoom(roomId)
    if (!room || !room.spectators) return []

    const result: { id: string; name: string; joinedAt: number }[] = []
    for (const spec of Array.from(room.spectators.values())) {
      result.push({ id: spec.id, name: spec.name, joinedAt: spec.joinedAt })
      if (result.length >= n) break
    }
    return result
  }

  getSpectatorsPaged(
    roomId: string,
    page: number = 1,
    pageSize: number = 50
  ): { spectators: { id: string; name: string; joinedAt: number }[]; page: number; pageSize: number; total: number; totalPages: number } | null {
    const room = this.resolveRoom(roomId)
    if (!room || !room.spectators) return null

    const all = Array.from(room.spectators.values()).map(s => ({
      id: s.id,
      name: s.name,
      joinedAt: s.joinedAt
    }))

    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.max(1, Math.min(page, totalPages))
    const start = (safePage - 1) * pageSize
    const paged = all.slice(start, start + pageSize)

    return {
      spectators: paged,
      page: safePage,
      pageSize,
      total,
      totalPages
    }
  }

  getPublicRooms() {
    const maxSpectators = parseInt(process.env.MAX_SPECTATORS_PER_ROOM || '100', 10)
    return Array.from(this.rooms.values())
      .filter(r => r.isPublic && ((r.player1 ? 1 : 0) + (r.player2 ? 1 : 0) > 0))
      .map(r => {
        const specCount = r.spectators ? r.spectators.size : 0
        const firstSpecs: { id: string; name: string; joinedAt: number }[] = []
        if (r.spectators) {
          for (const s of Array.from(r.spectators.values())) {
            firstSpecs.push({ id: s.id, name: s.name, joinedAt: s.joinedAt })
            if (firstSpecs.length >= 3) break
          }
        }
        return {
          id: r.id,
          code: r.code,
          isPublic: r.isPublic,
          status: r.status,
          player1: r.player1 ? { id: r.player1.id, name: r.player1.name } : null,
          player2: r.player2 ? { id: r.player2.id, name: r.player2.name } : null,
          playerCount: (r.player1 ? 1 : 0) + (r.player2 ? 1 : 0),
          spectatorCount: specCount,
          maxSpectators,
          isSpectatorFull: specCount >= maxSpectators,
          spectators: firstSpecs,
          turnDuration: r.turnDuration,
          createdAt: r.createdAt
        }
      })
  }

  resetRoom(roomId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    this.clearRoomTimer(room.id)
    room.board = Array(9).fill('')
    room.currentTurn = 'X'
    room.status = 'playing'
    room.winner = null
    room.winningLine = null
    room.rematchRequestedBy = null
    room.turnDeadline = null
    room.turnStartTime = null
    room.timeoutCountX = 0
    room.timeoutCountO = 0
    room.moves = []
    room.savedGameId = null
    console.log(`[RoomManager] Room reset: ${room.id}`)
    return room
  }

  requestRematch(roomId: string, playerId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return { error: 'Room not found' }
    
    room.rematchRequestedBy = playerId
    console.log(`[RoomManager] Rematch requested by ${playerId} in ${room.id}`)
    return { success: true }
  }

  rejectRematch(roomId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return { error: 'Room not found' }
    
    room.rematchRequestedBy = null
    console.log(`[RoomManager] Rematch rejected in ${room.id}`)
    return { success: true }
  }

  clearRematchRequest(roomId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    room.rematchRequestedBy = null
    return room
  }

  leaveRoom(roomId: string, socketId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return

    // 1. If spectator is leaving
    if (room.spectators) {
      for (const spec of Array.from(room.spectators.values())) {
        if (spec.socketIds.has(socketId)) {
          this.removeSpectator(room.id, socketId)
          return
        }
      }
    }

    // 2. If player is leaving, clear room timer
    this.clearRoomTimer(room.id)
    
    if (room.player1?.socketId === socketId) {
      // Player 1 is leaving
      if (room.player2) {
        // Player 2 is still here - player1 leaves, player2 becomes player1
        room.player1 = room.player2
        room.player1.symbol = 'X'
        room.player2 = null
        room.status = 'waiting'
        room.currentTurn = 'X'
        room.board = Array(9).fill('')
        room.winner = null
        room.winningLine = null
        console.log(`[RoomManager] Player1 left, player2 kept as player1: ${room.id}`)
      } else {
        // No player2. If spectators remain, keep room alive with finished state
        if (room.spectators && room.spectators.size > 0) {
          room.player1 = null
          room.status = 'finished'
          console.log(`[RoomManager] Player1 left, room kept for ${room.spectators.size} spectators: ${room.id}`)
        } else {
          this.rooms.delete(room.id)
          this.clearRoomTimer(room.id)
          console.log(`[RoomManager] Room deleted: ${room.id}`)
        }
      }
    } else if (room.player2?.socketId === socketId) {
      // Player 2 is leaving
      room.player2 = null
      room.status = 'waiting'
      room.currentTurn = 'X'
      room.board = Array(9).fill('')
      room.winner = null
      room.winningLine = null
      console.log(`[RoomManager] Player2 left, room waiting: ${room.id}`)
    } else {
      console.log(`[RoomManager] Unknown socket left: ${socketId} from room ${room.id}`)
    }
  }

  findRoomBySocketId(socketId: string): Room | null {
    const rooms = Array.from(this.rooms.values())
    for (const room of rooms) {
      if (
        room.player1?.socketId === socketId ||
        room.player2?.socketId === socketId
      ) {
        return room
      }
      if (room.spectators) {
        for (const spec of Array.from(room.spectators.values())) {
          if (spec.socketIds.has(socketId)) {
            return room
          }
        }
      }
    }
    return null
  }

  updatePlayerSocket(roomId: string, playerId: string, newSocketId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return false
    
    if (room.player1?.id === playerId) {
      room.player1.socketId = newSocketId
      return true
    }
    if (room.player2?.id === playerId) {
      room.player2.socketId = newSocketId
      return true
    }
    return false
  }

  handleDisconnect(socketId: string) {
    console.log(`[RoomManager] Client disconnected: ${socketId}`)
  }

  ensureCall(room: Room): RoomCallState {
    if (!room.call) {
      room.call = {
        status: 'idle',
        active: false,
        startedBy: null,
        callerName: null,
        withVideo: false,
        ringingTimer: null,
        spectatorCallSetting: 'ask',
        spectatorsAllowed: 'ask',
        participants: new Map(),
        removedUsers: new Set(),
        removedSpectatorIds: new Set(),
        pendingJoinRequests: new Map(),
      }
    }
    return room.call
  }

  serializeCallState(room: Room) {
    const call = this.ensureCall(room)
    return {
      status: call.status,
      active: call.status === 'active',
      startedBy: call.startedBy,
      callerName: call.callerName || null,
      withVideo: !!call.withVideo,
      spectatorCallSetting: call.spectatorCallSetting,
      spectatorsAllowed: call.spectatorCallSetting,
      participants: Array.from(call.participants.values())
    }
  }

  getCallState(roomId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    return this.serializeCallState(room)
  }

  setCallSetting(roomId: string, setting: SpectatorCallPermission | string) {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    const call = this.ensureCall(room)
    const normalized = (setting || 'ask').toLowerCase() as SpectatorCallSetting
    if (['ask', 'allow', 'off'].includes(normalized)) {
      call.spectatorCallSetting = normalized
      call.spectatorsAllowed = normalized
    }
    return this.serializeCallState(room)
  }

  startCall(
    roomId: string,
    starterId: string,
    starterName: string,
    socketId: string,
    withVideo: boolean,
    onTimeout?: () => void
  ) {
    const room = this.resolveRoom(roomId)
    if (!room) return { error: 'Room not found' }
    const isPlayer = room.player1?.id === starterId || room.player2?.id === starterId
    if (!isPlayer) {
      return { error: 'Only players can start a call' }
    }
    const call = this.ensureCall(room)

    if (call.ringingTimer) {
      clearTimeout(call.ringingTimer)
      call.ringingTimer = null
    }

    call.status = 'ringing'
    call.active = false
    call.startedBy = starterId
    call.callerName = starterName
    call.withVideo = !!withVideo

    const participant: CallParticipant = {
      userId: starterId,
      name: starterName,
      socketId,
      role: 'player',
      micOn: true,
      cameraOn: !!withVideo,
      mutedByModerator: false,
      joinedAt: Date.now()
    }
    call.participants.clear()
    call.participants.set(starterId, participant)

    if (onTimeout) {
      call.ringingTimer = setTimeout(() => {
        if (call.status === 'ringing') {
          call.status = 'idle'
          call.active = false
          call.startedBy = null
          call.callerName = null
          call.participants.clear()
          call.ringingTimer = null
          onTimeout()
        }
      }, 30000)
    }

    return { participant, callState: this.serializeCallState(room) }
  }

  cancelCall(roomId: string, userId?: string): { cancelled: boolean; error?: string; callState?: ReturnType<RoomManager['serializeCallState']> } {
    const room = this.resolveRoom(roomId)
    if (!room) return { cancelled: false, error: 'Room not found' }
    const call = this.ensureCall(room)

    if (call.status !== 'ringing') {
      return { cancelled: false, error: 'Call is not ringing' }
    }

    if (userId && call.startedBy && call.startedBy !== userId) {
      return { cancelled: false, error: 'Only the caller can cancel the call' }
    }

    if (call.ringingTimer) {
      clearTimeout(call.ringingTimer)
      call.ringingTimer = null
    }

    call.status = 'idle'
    call.active = false
    call.startedBy = null
    call.callerName = null
    call.participants.clear()
    call.pendingJoinRequests.clear()

    return { cancelled: true, callState: this.serializeCallState(room) }
  }

  addCallParticipant(
    roomId: string,
    userId: string,
    name: string,
    socketId: string,
    withVideo: boolean
  ): { error?: string; participant?: CallParticipant; callState?: ReturnType<RoomManager['serializeCallState']> } {
    const room = this.resolveRoom(roomId)
    if (!room) return { error: 'Room not found' }
    const call = this.ensureCall(room)

    const isPlayer = room.player1?.id === userId || room.player2?.id === userId
    const role: CallRole = isPlayer ? 'player' : 'spectator'

    if (role === 'spectator' && (call.removedUsers.has(userId) || call.removedSpectatorIds.has(userId))) {
      return { error: 'You have been removed from this call by a player' }
    }

    const maxParticipants = parseInt(process.env.MAX_CALL_PARTICIPANTS || '6', 10)
    if (call.participants.size >= maxParticipants && !call.participants.has(userId)) {
      return { error: 'Call is full' }
    }

    const existing = call.participants.get(userId)
    const micOn = existing ? existing.micOn : (isPlayer ? true : false)
    const cameraOn = existing ? existing.cameraOn : (isPlayer ? !!withVideo : false)
    const mutedByModerator = existing ? existing.mutedByModerator : false

    const participant: CallParticipant = {
      userId,
      name,
      socketId,
      role,
      micOn: mutedByModerator ? false : micOn,
      cameraOn,
      mutedByModerator,
      joinedAt: existing ? existing.joinedAt : Date.now()
    }

    call.participants.set(userId, participant)

    // In ringing state, callee answering or second participant joining activates the call
    if (call.status === 'ringing') {
      if (call.ringingTimer) {
        clearTimeout(call.ringingTimer)
        call.ringingTimer = null
      }
      call.status = 'active'
      call.active = true
    } else if (call.participants.size >= 2) {
      call.status = 'active'
      call.active = true
    }

    call.pendingJoinRequests.delete(userId)

    return { participant, callState: this.serializeCallState(room) }
  }

  removeCallParticipant(
    roomId: string,
    socketIdOrUserId: string
  ): { removedUser: CallParticipant | null; callEnded: boolean; callState?: ReturnType<RoomManager['serializeCallState']> } {
    const room = this.resolveRoom(roomId)
    if (!room) return { removedUser: null, callEnded: false }
    const call = this.ensureCall(room)

    let target: CallParticipant | null = null
    for (const p of Array.from(call.participants.values())) {
      if (p.userId === socketIdOrUserId || p.socketId === socketIdOrUserId) {
        target = p
        break
      }
    }

    if (!target) {
      return { removedUser: null, callEnded: false, callState: this.serializeCallState(room) }
    }

    call.participants.delete(target.userId)

    let callEnded = false

    if (call.status === 'ringing') {
      if (call.ringingTimer) {
        clearTimeout(call.ringingTimer)
        call.ringingTimer = null
      }
      call.status = 'idle'
      call.active = false
      call.startedBy = null
      call.callerName = null
      call.participants.clear()
      callEnded = true
    } else {
      // In active call:
      // Rule: The call stays active while 2 or more participants remain.
      // It ends automatically only when 1 or 0 participants are left.
      if (call.participants.size <= 1) {
        if (call.ringingTimer) {
          clearTimeout(call.ringingTimer)
          call.ringingTimer = null
        }
        call.status = 'idle'
        call.active = false
        call.startedBy = null
        call.callerName = null
        call.participants.clear()
        call.pendingJoinRequests.clear()
        callEnded = true
        console.log(`[RoomManager] Call in ${room.id} has ${call.participants.size} participant(s) left. Call ended automatically.`)
      }
    }

    return { removedUser: target, callEnded, callState: this.serializeCallState(room) }
  }

  updateCallMediaState(roomId: string, userId: string, micOn: boolean, cameraOn: boolean): CallParticipant | null {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    const call = this.ensureCall(room)

    const participant = call.participants.get(userId)
    if (!participant) return null

    if (participant.mutedByModerator) {
      participant.micOn = false
    } else {
      participant.micOn = !!micOn
    }
    participant.cameraOn = !!cameraOn

    return participant
  }

  moderateCallParticipant(
    roomId: string,
    moderatorUserId: string,
    targetUserId: string,
    action: 'mute' | 'unmute' | 'remove'
  ): {
    success: boolean
    error?: string
    action?: 'mute' | 'unmute' | 'remove'
    participant?: CallParticipant
    callEnded?: boolean
    callState?: ReturnType<RoomManager['serializeCallState']>
  } {
    const room = this.resolveRoom(roomId)
    if (!room) return { success: false, error: 'Room not found' }

    const isModeratorPlayer = room.player1?.id === moderatorUserId || room.player2?.id === moderatorUserId
    if (!isModeratorPlayer) {
      return { success: false, error: 'Only players can moderate call participants' }
    }

    const call = this.ensureCall(room)
    const target = call.participants.get(targetUserId)
    if (!target) {
      return { success: false, error: 'Participant not in call' }
    }

    if (action === 'mute') {
      target.mutedByModerator = true
      target.micOn = false
      return { success: true, action: 'mute', participant: target, callState: this.serializeCallState(room) }
    } else if (action === 'unmute') {
      target.mutedByModerator = false
      return { success: true, action: 'unmute', participant: target, callState: this.serializeCallState(room) }
    } else if (action === 'remove') {
      call.participants.delete(targetUserId)
      call.removedUsers.add(targetUserId)
      call.removedSpectatorIds.add(targetUserId)

      let callEnded = false
      if (call.participants.size <= 1) {
        if (call.ringingTimer) {
          clearTimeout(call.ringingTimer)
          call.ringingTimer = null
        }
        call.status = 'idle'
        call.active = false
        call.startedBy = null
        call.callerName = null
        call.participants.clear()
        call.pendingJoinRequests.clear()
        callEnded = true
        console.log(`[RoomManager] Call in ${room.id} ended after moderation removal (<= 1 participant).`)
      }

      return {
        success: true,
        action: 'remove',
        participant: target,
        callEnded,
        callState: this.serializeCallState(room)
      }
    }

    return { success: false, error: 'Invalid moderation action' }
  }

  endCall(roomId: string) {
    const room = this.resolveRoom(roomId)
    if (!room) return null
    const call = this.ensureCall(room)
    if (call.ringingTimer) {
      clearTimeout(call.ringingTimer)
      call.ringingTimer = null
    }
    call.status = 'idle'
    call.active = false
    call.startedBy = null
    call.callerName = null
    call.participants.clear()
    call.pendingJoinRequests.clear()
    return this.serializeCallState(room)
  }
}

export const roomManager = new RoomManager()
