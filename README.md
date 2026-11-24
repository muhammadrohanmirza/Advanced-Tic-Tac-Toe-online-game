# 🎮 Tic-Tac-Toe Online

A modern real-time Tic-Tac-Toe web app built with Next.js, Socket.IO, Prisma, and NextAuth. Players can sign up, create or join multiplayer rooms, play against AI, track scores on a leaderboard, and chat live inside the game room.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-green?logo=socket.io&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)

---

## ✨ What this project includes

### 🎯 Core gameplay
- Real-time multiplayer matches with live board updates
- Game replay system: record every move (player, cell index, order, timestamp) of multiplayer and AI games
- Interactive replay player with play/pause, step forward/backward, scrubber slider, speed controls (0.5x, 1x, 2x), move timeline, and winning line highlights
- Match history ("My Games") page with filters, search, and replay links
- Spectator mode: 3rd+ users can watch live matches with synchronized board & timer updates, spectator counts, and view-only chat
- Authoritative server per-turn timer (No Limit, 15s, 30s, 45s) with auto-moves and 3-timeout forfeit
- Modular AI opponent (Easy, Medium, and unbeatable Hard with Minimax & Alpha-Beta pruning)
- Choice to play as X or O (AI moves first if user is O)
- Private and public game rooms
- Room code-based joining for quick friend matches
- Rematch support after a finished game

### 💬 Live in-game chat & reactions
- Real-time chat inside each game room
- Message bubbles with timestamps
- Typing indicator for the other player
- Online/offline status for the opponent
- Smooth animations and a modern neon-styled chat UI
- Emoji reactions with cooldowns and floating overlay animations

### 🎙️ WebRTC Voice & Video Chat
- Real-time peer-to-peer (P2P mesh) voice and video calls inside game rooms
- **Universal participation**: both players and spectators can join the call with individual mic and camera toggles
- **Host permissions**: room creator can set "Spectators in call" to `Ask` (players get accept/decline prompt), `Allow` (direct join), or `Off` (disabled)
- **Moderation**: players can mute, unmute, or remove spectators from the call (enforced on server; muted spectators cannot unmute themselves)
- **Self & Local controls**: toggle mic (M), toggle camera (V), local "Mute for me", "Hide video", and general "Deafen" (silences all incoming remote audio)
- **Audio detection**: real-time speaking indicator using Web Audio API `AudioContext` and `AnalyserNode`
- **Autoplay protection**: handles browser audio autoplay restrictions with a one-click audio enablement banner

### 🔐 Authentication and user flow
- Secure signup and login with NextAuth credentials
- Simple In-App Forgot Password Modal on the login page:
  - Step 1: Account email lookup with inline validation
  - Step 2: New password and confirmation inputs with eye toggles and strength indicator
  - Automatic email prefilling on the login form upon successful reset
  - Rate limiting (max 5 requests/min per IP, max 5 resets/hour per email) and lowercase/trimmed email normalization
  > **Note**: For demo and development convenience, password reset uses an in-app email lookup flow without sending actual emails. In production, an email provider (e.g. Resend, SendGrid) should be configured to verify ownership before resetting.
- Password hashing using bcrypt (salt rounds: 12)
- Protected lobby, replay, and room pages
- Leaderboard tracking for wins, losses, and draws

### 🎨 UI experience
- Neon dark theme with animated visuals
- Responsive layout for mobile, tablet, and desktop
- Toast notifications and confetti for game outcomes
- Smooth transitions powered by Framer Motion

---

## 🧱 Tech stack

- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Real-time communication: Socket.IO
- Authentication: NextAuth.js
- Database: PostgreSQL via Prisma
- Styling: custom CSS + Tailwind-inspired UI components
- Animation: Framer Motion
- Icons: Lucide React
- Validation: Zod
- Notifications: react-hot-toast

---

## 📁 Project structure

```text
app/                 # Next.js app routes and pages
  api/               # API routes for auth, rooms, scores, signup
  lobby/             # Lobby page
  login/             # Login page
  play-ai/           # AI mode page
  room/[roomId]/     # Multiplayer room page
  signup/            # Signup page
components/          # Reusable UI and game components
hooks/               # Custom hooks for socket and game state
lib/                 # Socket client and Prisma helpers
prisma/              # Prisma schema and database setup
server/              # Backend socket and room logic
types/               # Shared TypeScript interfaces
auth.ts              # NextAuth configuration
middleware.ts        # Route protection and simple rate limiting
server.js            # Custom server with Socket.IO
```

---

## ⚙️ Setup instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a file named `.env.local` and add values similar to this:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
DIRECT_URL=postgresql://user:password@host:5432/dbname?sslmode=require

NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# WebRTC Voice & Video Call Settings
MAX_CALL_PARTICIPANTS=6

# Optional TURN Configuration (for strict NATs / corporate firewalls)
NEXT_PUBLIC_TURN_URL=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

You can generate a secret with:

```bash
openssl rand -base64 32
```

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## ▶️ How to use it

### Sign up or log in
- Create an account from the signup page
- Log in to access the lobby and game rooms

### Play multiplayer
1. Go to the lobby
2. Create a room or join an existing one using a 4-character room code
3. Share the room code with your friend
4. Start playing and use the live chat while the game is running

### Play against AI
- Open the AI mode page from the lobby
- Choose a difficulty level
- Play locally against the computer

---

## 🧠 Game rules

- X goes first
- Players alternate turns
- First player to make 3 in a row wins
- If the board fills up without a winner, the game is a draw
- Rematches can be requested after a finished game

---

## 🔌 Socket events

### Client to server
- `create-room`
- `join-room`
- `spectate-room` (joins an existing match as a spectator with roomId, userId, userName; can watch and chat)
- `make-move`
- `send-message`
- `typing`
- `send-reaction` (sends an emoji reaction with room, senderId, senderName, and reaction)
- `request-rematch`
- `accept-rematch`
- `reject-rematch`
- `leave-room`
- `get-public-rooms`
- `get-spectators` (requests paginated spectator list with roomId, page, pageSize)
- `call-start` (initiates voice/video call with roomId, withVideo)
- `call-join-request` (requests to join active call with roomId, withVideo)
- `call-join-response` (host/player responds to join request or incoming call)
- `webrtc-offer` (relays WebRTC SDP offer to target user)
- `webrtc-answer` (relays WebRTC SDP answer to target user)
- `webrtc-ice-candidate` (relays WebRTC ICE candidate to target user)
- `call-leave` (voluntary departure from active call)
- `call-end` (player ends active call for all participants)
- `call-moderate` (player mutes, unmutes, or removes spectator from call)
- `call-media-state` (syncs micOn and cameraOn states)
- `call-setting-change` (host updates spectator call permission: Ask, Allow, Off)

### Server to client
- `room-created`
- `room-joined`
- `player-joined`
- `spectator-joined` (broadcasts when a new spectator joins, with spectator info and updated spectator count)
- `spectator-left` (broadcasts when a spectator leaves or disconnects, with updated spectator count)
- `spectator-count-updated` (broadcasts updated spectator count to the room, debounced at 500ms)
- `spectators-list` (paginated spectator list response with spectators, page, pageSize, total, totalPages)
- `board-updated`
- `game-over`
- `new-message` (broadcasts message with text, sender info, timestamp, and server-verified role: "player" | "spectator")
- `user-typing`
- `new-reaction` (broadcasts a validated reaction with sender info and timestamp to the room)
- `reaction-cooldown` (sent if a player reacts within the 1-second cooldown window)
- `timer-update` (authoritative per-turn countdown update with turnDuration, deadline, and timeout count)
- `turn-timeout` (notifies players of auto-move execution or forfeit after 3 timeouts)
- `rematch-requested`
- `rematch-started`
- `rematch-rejected`
- `opponent-left`
- `public-rooms-list`
- `call-state` (broadcasts current call status, participant list, and spectator access setting)
- `call-incoming` (notifies opponent of incoming call prompt)
- `call-join-request` (notifies players of spectator join request in Ask mode)
- `call-join-response` (notifies requester whether join was accepted or declined)
- `call-participant-joined` (broadcasts when a participant joins the call)
- `call-participant-left` (broadcasts when a participant leaves or is removed)
- `webrtc-offer` (relayed offer to target peer)
- `webrtc-answer` (relayed answer to target peer)
- `webrtc-ice-candidate` (relayed ICE candidate to target peer)
- `call-media-state` (syncs updated mic and camera states to room)
- `call-moderated` (notifies target participant of mute/unmute/remove action)
- `call-ended` (notifies room that call ended)
- `error`

---

## 📹 WebRTC Architecture & Voice/Video Guide

### 1. P2P Mesh Network & Capacity
- **Full Mesh Topology**: Every participant in the call establishes a direct peer-to-peer `RTCPeerConnection` with every other participant.
- **Participant Limit**: Governed by the `MAX_CALL_PARTICIPANTS` environment variable (default: `6`). Because a P2P mesh requires $\frac{N(N - 1)}{2}$ simultaneous connections (e.g., 6 participants = 15 peer connections), mesh scaling is capped at 6. For larger group sizes (10+ or 50+ participants), an SFU (Selective Forwarding Unit) such as **LiveKit** or **mediasoup** would be recommended.
- Spectators not currently in the call continue to watch the game and participate in live chat without any performance degradation.

### 2. Perfect Negotiation Pattern
- Implements the WebRTC **Perfect Negotiation** pattern (polite vs. impolite peers) to completely prevent offer collisions.
- The polite peer is deterministically calculated by comparing user IDs (`userIdA < userIdB`).
- When an offer collision occurs, the polite peer automatically rolls back its local offer and accepts the incoming remote offer. The impolite peer ignores collision offers.
- ICE candidates received prior to setting the remote description are queued and flushed immediately upon description initialization.

### 3. Roles, Permissions & Moderation
- **Spectator Call Setting**: The room host can toggle spectator access to:
  - `Ask` *(default)*: When a spectator clicks "Join call", both players receive an accept/decline modal. The first response wins.
  - `Allow`: Spectators join the call directly without a prompt.
  - `Off`: Spectators cannot join the call; the button is hidden.
- **Moderation Rules**:
  - Players can mute, unmute, or remove any spectator from the call via the participant tile menu.
  - If muted by a player, the spectator cannot unmute themselves; their mic button displays "Muted by a player" in a disabled state until unmuted by a player.
  - Removed spectators cannot rejoin the call unless explicitly re-invited.
- **Default Media States**:
  - Spectators join muted with camera off by default.
  - Players start with mic enabled and camera off (or on if started as a video call).

### 4. Self and Local Controls
- **Self Controls**:
  - **Mic Toggle**: Enables or disables the local audio track (no renegotiation).
  - **Camera Toggle**: When turned off, hardware tracks are fully stopped (`track.stop()`) and replaced with `null` so device lights turn off completely. When turned on, a new video track is requested and swapped into peer senders.
  - **Keyboard Shortcuts**: Press `M` to toggle microphone, press `V` to toggle camera (automatically ignored when typing in the chat or input boxes).
- **Local Controls (Client-Side Only)**:
  - **Mute for me**: Silences audio from a specific remote participant on your screen only.
  - **Hide video**: Hides video from a specific remote participant on your screen only.
  - **Deafen**: Silences all incoming remote audio across the entire call.

### 5. Network & Browser Requirements
- **HTTPS Context**: Browser security mandates HTTPS for `navigator.mediaDevices.getUserMedia` in production environments (`http://localhost` is permitted in local development).
- **STUN & TURN**: Default Google public STUN servers are configured (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`). If users connect from behind restrictive symmetric NATs or corporate firewalls, configure a TURN server using `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, and `NEXT_PUBLIC_TURN_CREDENTIAL`.

---

## 🗄️ Database model

The Prisma schema currently includes:

```prisma
model User {
  id            String              @id @default(cuid())
  name          String
  email         String              @unique
  password      String
  emailVerified DateTime?
  scores        Score[]
  games         Game[]
  tokens        VerificationToken[]
  createdAt     DateTime            @default(now())
}

model VerificationToken {
  id        String   @id @default(cuid())
  token     String   @unique // SHA-256 hashed token
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   // "EMAIL_VERIFICATION" | "PASSWORD_RESET"
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@index([type])
}

model Score {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  game        String
  result      String
  opponent    String?
  gameRecords Game[]
  createdAt   DateTime @default(now())
  @@index([game])
}

model Game {
  id          String   @id @default(cuid())
  mode        String   // "multiplayer" | "ai-easy" | "ai-medium" | "ai-hard"
  playerX     String
  playerO     String
  playerXId   String?
  playerOId   String?
  winner      String?  // "X" | "O" | "draw"
  winningLine String?  // e.g. "[0,1,2]"
  moves       Json     // Array of { step, player, cellIndex, timestamp }
  createdAt   DateTime @default(now())

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  scoreId     String?
  score       Score?   @relation(fields: [scoreId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([playerXId])
  @@index([playerOId])
  @@index([mode])
  @@index([createdAt])
}
```

---

## 🚀 Scripts

```bash
npm run dev       # start the development server
npm run build     # build the Next.js app
npm run start     # run the production server
npm test          # run Vitest AI unit tests
npm run db:push   # sync Prisma schema to the database
npm run db:generate  # regenerate Prisma client
```

---

## ✅ Notes

This project is a polished real-time Tic-Tac-Toe experience with multiplayer rooms, AI play, score tracking, and an integrated live chat system. It is well suited for learning full-stack real-time app development or as a foundation for extending into a larger multiplayer game platform.

**Made with Muhammad Rohan Mirza ❤️ using Next.js, Socket.IO, and TypeScript**"# Advanced-Tic-Tac-Toe-online-game" 
