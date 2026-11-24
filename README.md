# 🎮 Tic-Tac-Toe Online (Advanced)

A production-ready, full-stack real-time multiplayer Tic-Tac-Toe battle arena built with **Next.js 14 (App Router)**, **Socket.IO 4**, **WebRTC Voice & Video P2P Mesh**, a procedural **Web Audio API Synthesizer**, **Prisma ORM**, **PostgreSQL**, and an unbeatable **Minimax AI with Alpha-Beta Pruning**. Featuring a tactile, cartoon-3D glassmorphic visual system, multi-theme personalization, authoritative server-side turn timers, interactive move-by-move match replays, and spectator streaming.

![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7.4-green?logo=socket.io&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Mesh-orange?logo=webrtc&logoColor=white)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Procedural-purple)
![Prisma](https://img.shields.io/badge/Prisma-5.10.0-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-38B2AC?logo=tailwind-css&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-66_Tests_Passing-brightgreen?logo=vitest&logoColor=white)

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
  - [🎨 Cartoon-3D Visual Design & Micro-Interactions](#-cartoon-3d-visual-design--micro-interactions)
  - [🎭 5 Themes & 4 Piece Skins](#-5-themes--4-piece-skins)
  - [🔊 Procedural Web Audio API Sound Engine](#-procedural-web-audio-api-sound-engine)
  - [🎙️ Universal WebRTC Voice & Video Mesh](#-universal-webrtc-voice--video-mesh)
  - [⏱️ Authoritative Server Turn Timer & Forfeits](#️-authoritative-server-turn-timer--forfeits)
  - [📼 Interactive Game Replay System & Match History](#-interactive-game-replay-system--match-history)
  - [🤖 Modular AI Engine (Minimax with Alpha-Beta Pruning)](#-modular-ai-engine-minimax-with-alpha-beta-pruning)
  - [💬 Real-Time Multiplayer, Spectators & Live Chat](#-real-time-multiplayer-spectators--live-chat)
  - [🔐 Authentication, Profiles & In-App Password Recovery](#-authentication-profiles--in-app-password-recovery)
  - [📱 Responsive & Cross-Device Engineering](#-responsive--cross-device-engineering)
- [🏗️ System Architecture & Data Flow](#️-system-architecture--data-flow)
- [🧱 Tech Stack & Dependencies](#-tech-stack--dependencies)
- [📁 Project Directory Structure](#-project-directory-structure)
- [🗄️ Database Schema (Prisma)](#️-database-schema-prisma)
- [🔌 Socket.IO Event Reference](#-socketio-event-reference)
- [📹 WebRTC Mesh Architecture Deep Dive](#-webrtc-mesh-architecture-deep-dive)
- [⚙️ Getting Started & Setup Guide](#️-getting-started--setup-guide)
- [🔐 Environment Variables](#-environment-variables)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [📄 License & Credits](#-license--credits)

---

## ✨ Key Features

### 🎨 Cartoon-3D Visual Design & Micro-Interactions
- **Tactile 3D Buttons (`.btn-3d`)**: High-gloss, beveled pill buttons with bottom borders and active-state physical depression effects (`translate-y-1` on click).
- **Floating Isometric Illustrations**: Custom SVG/Canvas 3D board illustration (`Home3DIllustration`) featuring floating X/O pieces with cast drop shadows, dynamic tilt, and ambient glow.
- **Glassmorphism Panels (`game-card-glass`)**: Multi-layered backdrop blurs (`backdrop-blur-xl`), luminous neon perimeter borders, and deep ambient box shadows.
- **Floating Decorative Background (`GameBackground`)**: Non-blocking `position: fixed` background canvas with gently floating 3D X/O glyphs, organic animated waves, and subtle particle ambiance that never obstructs layout scrolling.
- **Fluid Typography**: Dynamic `clamp()`-based text scaling ensuring clean proportions on screens from 320px ultra-compact phones to 4K displays.

### 🎭 5 Themes & 4 Piece Skins
Personalize your entire battle interface via the unified **Settings Modal**, with instant live preview and automatic `localStorage` persistence:
- **Themes**:
  1. **Classic 3D (`neon-purple`)**: Deep navy-violet background with electric cyan (`#00A3FF`) X and radiant orange (`#FF7A00`) O accents.
  2. **Emerald 3D (`neon-green`)**: Cyberpunk matrix emerald background with high-voltage green (`#00FF41`) and cyan (`#00FFFF`) accents.
  3. **Sapphire 3D (`neon-blue`)**: Electric deep sky background with sky blue (`#00BFFF`) and neon magenta (`#BF00FF`) accents.
  4. **Sunset 3D (`sunset`)**: Synthwave dusk background with blaze orange (`#FF5722`) and electric rose (`#FF007F`) accents.
  5. **Light 3D (`light`)**: Crisp, playful daylight cartoon mode with sky blue (`#0284c7`), tangerine (`#f97316`), and clean white cards.
- **Piece Customization Skins**:
  1. **Classic**: Sharp neon glyphs (`X` / `O`).
  2. **Emoji**: Vibrant 3D emojis (`❌` / `⭕`).
  3. **Stars & Hearts**: Playful icons (`⭐` / `❤️`).
  4. **Fire & Ice**: Elemental icons (`🔥` / `❄️`).

### 🔊 Procedural Web Audio API Sound Engine
Built-in procedural audio engine (`hooks/useSound.ts`) using standard browser `AudioContext` and dynamic oscillator synthesizers:
- **Zero Asset Downloads**: Generates 100% of sound effects and music procedurally in real time without downloading external MP3/WAV audio files.
- **Sound Effects (SFX)**:
  - `placeX` & `placeO`: Crisp FM-modulated percussion plucks with distinct pitch differentiation for each player.
  - `win`: Triumphant ascending harmonic arpeggios with celebratory chords.
  - `lose`: Descending minor tone glissando.
  - `draw`: Neutral harmonic frequency sweep.
  - `chat`: Subtle pop notification chime.
  - `click`: Tactile mechanical click response.
  - `timerWarning`: Urgent high-frequency countdown warning blips during the final 5 seconds of a turn.
- **Dynamic Ambient Music**: Soothing, evolving D-minor cyberpunk ambient chord progression (`Dm -> Bb -> Gm -> A`) powered by softly filtered sine-wave oscillators with low-frequency oscillator (LFO) gain pulsation.
- **Controls**: Independent SFX and Music volume sliders, one-click global mute toggles, and seamless resume on user interaction.

### 🎙️ Universal WebRTC Voice & Video Mesh
Full real-time peer-to-peer audio and video calling integrated directly into multiplayer game rooms:
- **Universal Multi-Peer Mesh**: Both active players and spectators can join the call (up to 6 participants simultaneously).
- **Perfect Negotiation Pattern**: Eliminates WebRTC glare and offer collisions through deterministic tie-breaking (`polite` vs `impolite` peers based on alphabetical user IDs).
- **Speaking Detection**: Real-time voice activity detection via Web Audio API `AnalyserNode`, rendering animated glowing voice pulse rings around speaking participants.
- **Host Permissions**: Room creators can set spectator call permissions to:
  - `Ask` *(Default)*: Spectator requests to join trigger an accept/decline dialog for the room host.
  - `Allow`: Spectators can join directly without prompts.
  - `Off`: Voice/video calls are restricted strictly to the two active players.
- **In-Call Moderation**: Players can remotely mute, unmute, or eject unruly spectators from the call with server-enforced permissions.
- **Local Client Controls**: Individual volume toggles, "Mute for me", "Hide video", and a global "Deafen" toggle to silence all incoming remote audio.
- **Persistent DOM Audio Elements**: Dedicated global audio container outside collapsible UI drawers prevents remote audio dropout when the video panel is minimized or toggled.
- **Autoplay Protection**: Proactive audio context unlock prompt if the browser blocks background media playback.

### ⏱️ Authoritative Server Turn Timer & Forfeits
- **Turn Durations**: Choose between `No Limit`, `15s`, `30s`, or `45s` during room creation.
- **Server Authority**: Timers run synchronously on the custom Node.js server (`server/roomManager.ts`) using high-precision timestamps (`Date.now() + durationMs`), preventing client-side clock tampering.
- **Auto-Move Fallback**: If the active player's turn expires, the server automatically selects a valid random cell to keep the game moving.
- **3-Timeout Forfeit Rule**: If a player times out 3 times in a single match, the server automatically awards the victory to their opponent via forfeit.

### 📼 Interactive Game Replay System & Match History
- **Automatic Move Archiving**: Every multiplayer, private code, and AI match is serialized and stored in PostgreSQL via Prisma (`Game.moves` JSON column) with cell index, player mark, step number, and millisecond timestamps.
- **Interactive Replay Viewer (`/replay/[gameId]`)**:
  - Full playback controls: Play, Pause, Step Forward, Step Backward, and Jump to Start/End.
  - Variable playback speeds: `0.5x`, `1.0x`, and `2.0x`.
  - Visual timeline scrubber slider with move-by-move markers.
  - Animated victory line rendering across the winning 3-in-a-row combination upon conclusion.
- **Match History Dashboard (`/history`)**:
  - Browse past personal games with opponent avatars, game modes (Multiplayer vs AI difficulty), outcomes (Win/Loss/Draw), duration, and date.
  - Quick-launch "Watch Replay" button to replay any historical game instantly.

### 🤖 Modular AI Engine (Minimax with Alpha-Beta Pruning)
Play offline or solo against an intelligent computer opponent (`lib/ai.ts`):
- **Easy**: Random available cell selection — ideal for casual play or young learners.
- **Medium**: Heuristic two-step lookahead; seizes immediate winning moves and actively blocks opponent threats.
- **Hard (Unbeatable)**: Full recursive **Minimax Algorithm** enhanced with **Alpha-Beta Pruning**. Evaluates terminal board states and guarantees mathematically that human players can at best achieve a draw (0 human wins achievable).
- **Flexible Play**: Choose to play as X (first move) or O (computer moves first).

### 💬 Real-Time Multiplayer, Spectators & Live Chat
- **Lobby with Dedicated Tabs**: Clean, focused tabs for *Public Rooms*, *Create Room*, *Join Code*, and *Global Leaderboard*.
- **Spectator Streaming**: Unlimited spectators can join ongoing matches with synchronized board state, authoritative timer updates, and live spectator counts (debounced at 500ms).
- **In-Game Chat**: Role-badged messaging (`Host`, `Player`, `Spectator`) with typing indicators and timestamps.
- **Anti-Spam Throttling**: Spectator chat rate limiting (max 1 message per 2 seconds, 20 messages per 10-second room window).
- **Floating Emoji Reactions**: Send quick reactions (`👍`, `😂`, `😮`, `😡`, `❤️`, `🔥`, `GG`) with smooth floating animated upward drift and server-enforced cooldowns (1.0s for players, 1.5s for spectators).
- **Rematch Protocol**: Seamless rematch negotiation with non-blocking status banners and quick-accept modal overlays.

### 🔐 Authentication, Profiles & In-App Password Recovery
- **NextAuth.js Credentials Provider**: Secure session management via JWT.
- **Cryptographic Security**: Passwords hashed with `bcryptjs` using 12 salt rounds.
- **In-App Password Reset Modal**: Multi-step account email verification and secure password update with inline strength meter and rate-limiting (max 5 requests/min per IP, max 5 resets/hour per email).
- **Global Leaderboard**: Live statistics tracking wins, losses, draws, and win ratios.

### 📱 Responsive & Cross-Device Engineering
- Pixel-perfect adaptability across all viewports:
  - Mobile Phones (320px, 360px, 375px, 390px, 414px)
  - Tablets & Foldables (768px, 820px, landscape)
  - Laptops & Desktops (1024px, 1440px, 1920px+)
- Adaptive multi-row lobby cards on small viewports with 44px minimum touch targets.
- Zero hydration mismatch guarantees with strict client-mount lifecycle handling.

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client["Client (Next.js 14 App Router)"]
        UI["React UI (Framer Motion + Tailwind 4)"]
        AudioEng["Procedural Web Audio Engine"]
        PeerConn["WebRTC RTCPeerConnection Mesh"]
        SockClient["Socket.IO Client"]
    end

    subgraph Server["Custom Node Server (server.js)"]
        NextServer["Next.js SSR / API Handlers"]
        SockServer["Socket.IO Server (server/socket.ts)"]
        RoomMgr["Room & Timer Manager (server/roomManager.ts)"]
    end

    subgraph Database["PostgreSQL (Prisma ORM)"]
        Users[("User & Auth Tokens")]
        Scores[("Scores & Leaderboards")]
        Games[("Game Archives & Moves JSON")]
    end

    UI --> SockClient
    UI --> PeerConn
    UI --> AudioEng

    SockClient <-->|"WebSockets (Game Actions, Chat, Signaling)"| SockServer
    SockServer <--> RoomMgr
    NextServer <--> Database
    SockServer <--> Database

    PeerConn <-->|"P2P Encrypted Audio / Video (SRTP)"| PeerConn
```

### WebRTC Perfect Negotiation Signaling Flow

```mermaid
sequenceDiagram
    autonumber
    participant A as Peer A (Polite: userIdA < userIdB)
    participant S as Socket.IO Signaling Server
    participant B as Peer B (Impolite)

    Note over A,B: Call started or spectator admitted
    A->>S: webrtc-offer { targetUserId: B, sdp }
    S->>B: webrtc-offer { senderId: A, sdp }
    B->>B: setRemoteDescription(offer)
    B->>S: webrtc-answer { targetUserId: A, sdp }
    S->>A: webrtc-answer { senderId: B, sdp }
    A->>A: setRemoteDescription(answer)
    A->>S: webrtc-ice-candidate { targetUserId: B, candidate }
    S->>B: webrtc-ice-candidate { senderId: A, candidate }
    B->>S: webrtc-ice-candidate { targetUserId: A, candidate }
    S->>A: webrtc-ice-candidate { senderId: B, candidate }
    Note over A,B: Direct P2P Media Streams Connected (Encrypted SRTP)
```

---

## 🧱 Tech Stack & Dependencies

| Category | Technology | Version | Description |
|---|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) | `14.1.0` | App Router, Server Components, API routes |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `^5.0.0` | Strict end-to-end type safety |
| **Real-Time** | [Socket.IO](https://socket.io/) | `4.7.4` | WebSocket server and client with fallback |
| **Calling** | [WebRTC](https://webrtc.org/) | Native | Full-mesh peer-to-peer audio/video streaming |
| **Audio** | [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Native | Procedural sound synthesizer & speaking analyser |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | `v14+` | Relational database storage |
| **ORM** | [Prisma](https://www.prisma.io/) | `5.10.0` | Type-safe database client and migrations |
| **Auth** | [NextAuth.js](https://next-auth.js.org/) | `^4.24.5` | Authentication with credentials & JWT |
| **Password** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | `^2.4.3` | Cryptographic password hashing (12 rounds) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `^4.2.2` | Utility-first CSS framework with modern tokens |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | `11.18.2` | Fluid 3D animations and page transitions |
| **Icons** | [Lucide React](https://lucide.dev/) | `^0.330.0` | Clean, modern vector interface icons |
| **Validation** | [Zod](https://zod.dev/) | `^3.22.4` | Schema declaration and input validation |
| **Effects** | [canvas-confetti](https://github.com/catdad/canvas-confetti) | `^1.9.4` | Victory celebration particle effects |
| **Testing** | [Vitest](https://vitest.dev/) | `^5.1.0` | High-speed unit testing framework |

---

## 📁 Project Directory Structure

```text
.
├── app/                                 # Next.js 14 App Router
│   ├── api/                             # API Endpoints
│   │   ├── auth/                        # NextAuth handlers & credentials provider
│   │   ├── forgot-password/             # In-app password reset lookup & update
│   │   ├── games/                       # Match history fetching & game recording
│   │   ├── leaderboard/                 # User ranking & score calculations
│   │   ├── rooms/                       # Room discovery endpoints
│   │   └── signup/                      # User registration with bcrypt hashing
│   ├── history/                         # Match History ("My Games") page
│   │   └── page.tsx                     # Filterable list of past multiplayer & AI games
│   ├── lobby/                           # Multiplayer Game Lobby
│   │   └── page.tsx                     # Tabbed interface: Rooms, Create, Join, Rankings
│   ├── login/                           # User Sign-In Page
│   │   └── page.tsx                     # Login card with embedded Forgot Password modal
│   ├── play-ai/                         # Solo Game Mode
│   │   └── page.tsx                     # Offline/Solo play against Minimax AI engine
│   ├── replay/[gameId]/                 # Interactive Match Replay Player
│   │   └── page.tsx                     # Scrubber, play/pause, speed controls, winning line
│   ├── room/[roomId]/                   # Multiplayer Room Page
│   │   └── page.tsx                     # Board, chat, timer, reactions, WebRTC call panel
│   ├── signup/                          # User Registration Page
│   │   └── page.tsx                     # Account creation form
│   ├── globals.css                      # Global styles, 3D button classes, theme variables
│   ├── layout.tsx                       # Root layout with ThemeProvider & SoundProvider
│   └── page.tsx                         # Landing Home page with 3D illustration & quick play
│
├── components/                          # Modular React Components
│   ├── auth/                            # Authentication Components
│   │   ├── ForgotPasswordModal.tsx      # Multi-step in-app password reset modal
│   │   ├── LoginForm.tsx                # Email/Password sign-in form
│   │   ├── SignupForm.tsx               # Registration form with validation
│   │   └── UserAvatar.tsx               # Cartoon avatar with initials or custom icon
│   ├── game/                            # In-Game Mechanics Components
│   │   ├── CallBar.tsx                  # WebRTC call control toolbar (mic, cam, leave)
│   │   ├── CallModals.tsx               # Modals for join requests & moderation alerts
│   │   ├── ChatBox.tsx                  # Live in-game chat box with role tags
│   │   ├── FloatingReactionsOverlay.tsx # Animated floating emoji reaction bubbles
│   │   ├── GameCell.tsx                 # Interactive 3D board cell with piece animations
│   │   ├── GameSkinIcon.tsx             # Theme-aware piece renderer (Classic/Emoji/etc.)
│   │   ├── GameStatus.tsx               # Current turn indicator and outcome announcements
│   │   ├── Home3DIllustration.tsx       # Isometric animated 3D game board illustration
│   │   ├── OnlineBoard.tsx              # 3x3 grid container with winning line highlight
│   │   ├── PlayerInfo.tsx               # Player card with timer, speaking ring, avatar
│   │   ├── RematchButton.tsx            # Rematch negotiation request button
│   │   ├── TurnTimer.tsx                # Authoritative visual countdown circle
│   │   ├── VideoPanel.tsx               # Responsive WebRTC video/audio participant grid
│   │   └── WinLoseDrawOverlay.tsx       # End-of-game victory modal with confetti
│   ├── layout/                          # Global Layout Components
│   │   └── GameBackground.tsx           # Floating decorative X/O and ambient canvas waves
│   ├── leaderboard/                     # Leaderboard Component
│   │   └── Leaderboard.tsx              # Rankings table with win/loss/ratio breakdown
│   ├── lobby/                           # Lobby Sub-Panels
│   │   ├── CreateRoom.tsx               # Room creation card (timers, privacy toggle)
│   │   ├── JoinRoom.tsx                 # Code-entry card for friend matches
│   │   └── RoomList.tsx                 # Live list of public rooms with spectator counts
│   └── ui/                              # Reusable Cartoon-3D UI Elements
│       ├── CrownBadge.tsx               # Winner / rank leader indicator
│       ├── LoadingSpinner.tsx           # 3D spinning loader
│       ├── NeonButton.tsx               # Physical 3D pill button with hover depression
│       ├── NeonCard.tsx                 # Glassmorphic card container with glow borders
│       ├── NeonInput.tsx                # Custom input fields with focus lighting
│       ├── RoundIconButton.tsx          # 44px round icon buttons (sound, settings, back)
│       ├── SettingsModal.tsx            # Theme, skin, audio volume configuration modal
│       ├── SoundControls.tsx            # Audio sliders and quick-mute controls
│       └── ThemeSwitcher.tsx            # Palette selector for 5 color themes
│
├── hooks/                               # Custom React Hooks
│   ├── useSound.ts                      # Procedural Web Audio API sound & music engine
│   ├── useTheme.tsx                     # Theme and skin state provider & persistence
│   └── useWebRTC.ts                     # Full-mesh WebRTC engine with perfect negotiation
│
├── lib/                                 # Shared Logic & Utilities
│   ├── ai.ts                            # Minimax algorithm with Alpha-Beta pruning
│   ├── ai.test.ts                       # Mathematical verification of AI engine
│   ├── forgot-password.test.ts          # Unit tests for password reset logic & validation
│   ├── prisma.ts                        # Singleton Prisma database client
│   ├── replay.test.ts                   # Unit tests for replay move playback & timelines
│   ├── socket.ts                        # Socket.IO client initialization
│   ├── webrtc.ts                        # WebRTC types, Zod schemas, and peer utilities
│   └── webrtc.test.ts                   # Unit tests for WebRTC schemas & polite logic
│
├── prisma/                              # Database Schema & Migrations
│   └── schema.prisma                    # PostgreSQL models: User, VerificationToken, Score, Game
│
├── server/                              # Custom Node.js Real-Time Engine
│   ├── roomManager.ts                   # Authoritative room state, moves, timers, forfeits
│   └── socket.ts                        # Socket.IO event router, chat filters, WebRTC signaling
│
├── types/                               # TypeScript Definitions
│   ├── game.ts                          # Board, cell, move, and replay interfaces
│   └── next-auth.d.ts                   # NextAuth session type augmentations
│
├── auth.ts                              # NextAuth configuration and callbacks
├── middleware.ts                        # Protected route middleware
├── server.js                            # Custom Node.js HTTP server integrating Next.js + Socket.IO
└── vitest.config.ts                     # Vitest test runner configuration
```

---

## 🗄️ Database Schema (Prisma)

The application uses PostgreSQL with Prisma ORM. Below is the relational structure:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String              @id @default(cuid())
  name          String
  email         String              @unique
  password      String              // Hashed with bcrypt (12 rounds)
  emailVerified DateTime?
  scores        Score[]
  games         Game[]
  tokens        VerificationToken[]
  createdAt     DateTime            @default(now())
}

model Score {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  game        String   // "tic-tac-toe"
  result      String   // "win" | "loss" | "draw"
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
  winningLine String?  // JSON string e.g. "[0,1,2]"
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

model VerificationToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   // "PASSWORD_RESET" | "EMAIL_VERIFY"
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@index([type])
}
```

---

## 🔌 Socket.IO Event Reference

### Client-to-Server Events

| Event | Payload | Description |
|---|---|---|
| `create-room` | `{ roomName, isPrivate, turnDuration? }` | Creates a new room with optional per-turn timer |
| `join-room` | `{ roomId, userId, userName }` | Joins a room as Player 2 |
| `spectate-room` | `{ roomId, userId, userName }` | Joins an active match as a view-only spectator |
| `make-move` | `{ roomId, index }` | Submits a move on cell 0–8 |
| `send-message` | `{ roomId, text }` | Broadcasts a chat message to room participants |
| `typing` | `{ roomId, isTyping }` | Emits live typing status |
| `send-reaction` | `{ roomId, reaction }` | Sends an emoji reaction (`👍`, `😂`, `🔥`, etc.) |
| `request-rematch` | `{ roomId }` | Initiates a rematch request |
| `accept-rematch` | `{ roomId }` | Accepts a pending rematch request |
| `reject-rematch` | `{ roomId }` | Rejects a pending rematch request |
| `leave-room` | `{ roomId }` | Leaves the room gracefully |
| `get-public-rooms` | `none` | Requests current list of active public rooms |
| `get-spectators` | `{ roomId, page, pageSize }` | Requests paginated spectator roster |
| `call-start` | `{ roomId, withVideo }` | Starts a voice/video call in the room |
| `call-join-request` | `{ roomId, withVideo }` | Requests permission to join an active call |
| `call-join-response` | `{ roomId, targetUserId, accepted }`| Host accepts or rejects a join request |
| `webrtc-offer` | `{ roomId, targetUserId, sdp }` | Relays WebRTC SDP offer to target peer |
| `webrtc-answer` | `{ roomId, targetUserId, sdp }` | Relays WebRTC SDP answer to target peer |
| `webrtc-ice-candidate` | `{ roomId, targetUserId, candidate }`| Relays ICE candidate to target peer |
| `call-media-state` | `{ roomId, micOn, cameraOn }` | Synchronizes local microphone/camera toggle |
| `call-moderate` | `{ roomId, targetUserId, action }` | Mutes, unmutes, or removes a spectator |
| `call-setting-change` | `{ roomId, spectatorSetting }` | Host updates spectator access: `Ask`, `Allow`, `Off` |
| `call-leave` | `{ roomId }` | Leaves an ongoing call without leaving the game room |
| `call-end` | `{ roomId }` | Room host terminates call for all participants |

### Server-to-Client Events

| Event | Payload | Description |
|---|---|---|
| `room-created` | `{ roomId, code, isHost, turnDuration }` | Confirms room creation |
| `room-joined` | `{ roomId, isHost, turnDuration, opponent }`| Confirms player joined successfully |
| `spectator-joined` | `{ spectator, spectatorCount }` | Notifies room of new spectator |
| `spectator-left` | `{ spectatorId, spectatorCount }` | Notifies room a spectator departed |
| `spectator-count-updated` | `{ count }` | Debounced spectator count update (500ms) |
| `spectators-list` | `{ spectators, total, page, totalPages }` | Paginated spectator list |
| `board-updated` | `{ board, currentTurn, moveCount }` | Real-time board state synchronization |
| `timer-update` | `{ turnDuration, deadline, timeouts }` | Authoritative turn countdown synchronization |
| `turn-timeout` | `{ player, autoMoveIndex, timeoutsLeft }` | Notifies auto-move or forfeit upon timeout |
| `game-over` | `{ winner, winningLine, moves, score }` | Broadcasts match outcome & recorded moves |
| `new-message` | `{ id, text, sender, role, timestamp }` | Incoming chat message with verified role |
| `user-typing` | `{ userId, isTyping }` | Displays typing indicator |
| `new-reaction` | `{ reaction, senderName, id }` | Triggers floating emoji animation overlay |
| `reaction-cooldown` | `{ remainingMs }` | Informs sender of cooldown throttle |
| `rematch-requested` | `{ requesterName }` | Shows rematch prompt to opponent |
| `rematch-started` | `{ board, currentTurn }` | Resets board and starts new round |
| `rematch-rejected` | `none` | Informs player that rematch was declined |
| `opponent-left` | `none` | Informs player that opponent disconnected |
| `public-rooms-list` | `RoomSummary[]` | Refreshed list of public rooms |
| `call-state` | `{ status, participants, spectatorSetting }`| Call roster and setting synchronization |
| `call-incoming` | `{ callerName, withVideo }` | Prompts player of incoming call |
| `call-participant-joined` | `{ participant }` | Notifies room of new call participant |
| `call-participant-left` | `{ userId }` | Notifies room participant left call |
| `webrtc-offer` | `{ senderId, sdp }` | Incoming relayed WebRTC SDP offer |
| `webrtc-answer` | `{ senderId, sdp }` | Incoming relayed WebRTC SDP answer |
| `webrtc-ice-candidate` | `{ senderId, candidate }` | Incoming relayed ICE candidate |
| `call-media-state` | `{ userId, micOn, cameraOn }` | Real-time sync of peer mic/camera status |
| `call-moderated` | `{ action, byUserId }` | Moderation event (mute, unmute, eject) |
| `call-ended` | `none` | Notification that call has been terminated |
| `error` | `{ message }` | Action failure or validation error |

---

## 📹 WebRTC Mesh Architecture Deep Dive

### 1. Peer-to-Peer Mesh Topology
In this architecture, every participant maintains a direct bidirectional peer connection with every other participant:
$$\text{Connections} = \frac{N(N - 1)}{2}$$
With `MAX_CALL_PARTICIPANTS = 6`, the mesh establishes up to 15 peer connections. This provides ultra-low latency audio/video without the infrastructure cost or complexity of an external SFU media server.

### 2. Perfect Negotiation Pattern
To eliminate race conditions (glare) where both peers create offers simultaneously:
- Each peer connection designates one peer as **polite** and the other as **impolite** via lexical sorting of user IDs (`userIdA < userIdB`).
- If an offer collision occurs, the **polite peer** rolls back its own local offer and accepts the remote offer.
- The **impolite peer** ignores colliding offers, ensuring a clean, deterministic handshake.
- ICE candidates received prior to remote description setup are buffered in a queue and flushed immediately once the description is set.

### 3. Voice Activity Detection (AnalyserNode)
Speech detection is handled via Web Audio API:
- An `AudioContext` and `AnalyserNode` process local and remote audio streams.
- The root-mean-square (RMS) volume level is calculated continuously on animation frames.
- When volume exceeds an adaptive threshold (`-45 dB`), the participant's avatar displays a radiant, pulsating animated neon ring.

### 4. Background Audio Continuity
When the collapsible video panel is hidden or minimized, remote audio continues playing uninterrupted because all `<audio>` elements are mounted in a top-level, persistent DOM container rather than inside the toggleable layout panel.

---

## ⚙️ Getting Started & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.17.0 or higher
- [PostgreSQL](https://www.postgresql.org/) database instance
- npm or pnpm package manager

### 1. Clone & Install
```bash
git clone https://github.com/MuhammadRohanMirza/Advanced-Tic-Tac-Toe-online-game.git
cd "Tic-Tac-Toe online game (Advanced)"
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-secure-random-32-byte-secret

# PostgreSQL Database Connection (Prisma)
DATABASE_URL="postgresql://postgres:password@localhost:5432/tictactoe?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/tictactoe?schema=public"

# WebSocket Server URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# WebRTC Configuration
MAX_CALL_PARTICIPANTS=6

# Optional STUN/TURN Configuration (for NAT traversal)
NEXT_PUBLIC_TURN_URL=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

> **Tip**: Generate a secure secret using:
> ```bash
> openssl rand -base64 32
> ```

### 3. Initialize Database
Apply the Prisma schema to your PostgreSQL database:
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
Run the integrated Next.js + Socket.IO development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Deployment
To create an optimized production build:
```bash
npm run build
npm run start
```

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection pool URL for Prisma |
| `DIRECT_URL` | **Yes** | — | Direct PostgreSQL connection URL for migrations |
| `NEXTAUTH_SECRET` | **Yes** | — | Cryptographic secret for signing NextAuth JWT tokens |
| `NEXTAUTH_URL` | **Yes** | `http://localhost:3000` | Canonical origin URL of the application |
| `NEXT_PUBLIC_SOCKET_URL` | **Yes** | `http://localhost:3000` | Target URL for Socket.IO client connections |
| `MAX_CALL_PARTICIPANTS` | No | `6` | Maximum allowed participants in a WebRTC call |
| `NEXT_PUBLIC_TURN_URL` | No | — | Optional TURN relay server URL for strict NATs |
| `NEXT_PUBLIC_TURN_USERNAME`| No | — | TURN authentication username |
| `NEXT_PUBLIC_TURN_CREDENTIAL`| No | — | TURN authentication password / credential |

---

## 🧪 Testing & Quality Assurance

The codebase includes an exhaustive test suite powered by [Vitest](https://vitest.dev/), covering algorithmic correctness, mathematical optimality, WebRTC signaling integrity, and user security:

```bash
# Run all unit tests
npm test

# Run tests with coverage
npx vitest run --coverage
```

### Verified Test Suites (66 Tests Passing):
1. **AI Minimax Verification (`lib/ai.test.ts`)**:
   - Proves mathematically that the Hard AI engine cannot be defeated under any board state or turn order.
   - Tests corner openings, center responses, edge forks, and defensive blocks across all permutations.
2. **WebRTC Signaling & Schema Validation (`lib/webrtc.test.ts`)**:
   - Validates all Zod schemas for SDP offers, answers, ICE candidates, and moderation actions.
   - Verifies deterministic polite/impolite peer tie-breaking logic.
3. **Password Reset & Account Security (`lib/forgot-password.test.ts`)**:
   - Tests in-app password reset lookup, email normalization, password confirmation matching, and rate limiting.
4. **Replay Engine & Timeline Validation (`lib/replay.test.ts`)**:
   - Validates move serialization, timeline stepping, board reconstruction, and victory line highlights.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
|---|---|---|
| `M` | In WebRTC Call | Toggle Microphone on/off |
| `V` | In WebRTC Call | Toggle Camera on/off |
| `Esc` | Modal / Overlay | Close active modal or game overlay |
| `Space` | Replay Viewer | Play / Pause match replay |
| `←` / `→` | Replay Viewer | Step backward / Step forward one move |

*(Note: In-call keyboard shortcuts are automatically suspended when typing in chat or input fields.)*

---

## 📄 License & Credits

This project is open-source and available under the **MIT License**.

### Crafted with ❤️ by:
**Muhammad Rohan Mirza**  
*Full-Stack Engineer & Real-Time Systems Specialist*

- 🌐 GitHub: [@MuhammadRohanMirza](https://github.com/MuhammadRohanMirza)
- 🚀 Repository: [Advanced-Tic-Tac-Toe-online-game](https://github.com/MuhammadRohanMirza/Advanced-Tic-Tac-Toe-online-game)
