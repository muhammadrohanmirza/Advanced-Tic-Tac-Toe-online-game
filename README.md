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
- Private and public game rooms
- Room code-based joining for quick friend matches
- AI mode with difficulty selection
- Rematch support after a finished game

### 💬 Live in-game chat
- Real-time chat inside each game room
- Message bubbles with timestamps
- Typing indicator for the other player
- Online/offline status for the opponent
- Smooth animations and a modern neon-styled chat UI

### 🔐 Authentication and user flow
- Secure signup and login with NextAuth credentials
- Password hashing using bcrypt
- Protected lobby and room pages
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
- `make-move`
- `send-message`
- `typing`
- `request-rematch`
- `accept-rematch`
- `reject-rematch`
- `leave-room`
- `get-public-rooms`

### Server to client
- `room-created`
- `room-joined`
- `player-joined`
- `board-updated`
- `game-over`
- `new-message`
- `user-typing`
- `rematch-requested`
- `rematch-started`
- `rematch-rejected`
- `opponent-left`
- `public-rooms-list`
- `error`

---

## 🗄️ Database model

The Prisma schema currently includes:

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  scores    Score[]
  createdAt DateTime @default(now())
}

model Score {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  game      String
  result    String
  opponent  String?
  createdAt DateTime @default(now())
}
```

---

## 🚀 Scripts

```bash
npm run dev       # start the development server
npm run build     # build the Next.js app
npm run start     # run the production server
npm run db:push   # sync Prisma schema to the database
npm run db:generate  # regenerate Prisma client
```

---

## ✅ Notes

This project is a polished real-time Tic-Tac-Toe experience with multiplayer rooms, AI play, score tracking, and an integrated live chat system. It is well suited for learning full-stack real-time app development or as a foundation for extending into a larger multiplayer game platform.

**Made with Muhammad Rohan Mirza ❤️ using Next.js, Socket.IO, and TypeScript**"# Advanced-Tic-Tac-Toe-online-game" 
