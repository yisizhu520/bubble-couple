<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bubble Couple Game

This is a fun bubble couple game built with React, TypeScript, and Vite. Supports both local multiplayer and **online multiplayer** via Colyseus game server!

View your app in AI Studio: https://ai.studio/apps/drive/1Fqc9uDMOooISdVLuRvGoX8bi_MGlbFgm

## Game Modes

- **Solo** - Single player campaign against AI enemies
- **PvE** - Local co-op for 2 players vs AI enemies
- **PvP** - Local 1v1 battle mode
- **Online** - Online multiplayer (PvP or PvE) with room codes or quick match

## Controls

### Player 1
**Keyboard:**
- Movement: W, A, S, D
- Place Bomb: Space

**Gamepad (Xbox Controller):**
- Movement: Left Stick / D-Pad
- Place Bomb: A Button / B Button

### Player 2
**Keyboard:**
- Movement: Arrow Keys (↑, ↓, ←, →)
- Place Bomb: Enter / Numpad 0

**Gamepad (Xbox Controller):**
- Movement: Left Stick / D-Pad
- Place Bomb: A Button / B Button

> **Note:** Player 1 uses the first connected gamepad, and Player 2 uses the second connected gamepad. Both keyboard and gamepad controls work simultaneously!

## Run Locally

**Prerequisites:**  Node.js

### Frontend Only (Local Multiplayer)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

### With Online Multiplayer

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Install server dependencies:
   ```bash
   cd server && npm install
   ```

3. Start the game server (in one terminal):
   ```bash
   cd server && npm run dev
   ```

4. Start the frontend (in another terminal):
   ```bash
   npm run dev
   ```

5. Access the game at `http://localhost:3000`

### Environment Variables

Create a `.env.local` file for custom configuration:

```env
# WebSocket URL for Colyseus server
VITE_WS_URL=ws://localhost:2567
```

## Deploy with Docker

**Prerequisites:** Docker and Docker Compose

### Full Stack Deployment (Recommended)

```bash
# Start both frontend and game server
docker-compose up -d

# Stop the application
docker-compose down
```

This will start:
- Frontend at `http://localhost:3000`
- Game server at `ws://localhost:2567`

### Frontend Only

```bash
# Build the image
docker build -t bubble-couple .

# Run the container
docker run -p 3000:80 bubble-couple
```

### Production Deployment

For production, set the WebSocket URL to your server domain:

```bash
# Build with production WebSocket URL
docker-compose build --build-arg VITE_WS_URL=wss://your-domain.com
docker-compose up -d
```

## Project Structure

```
bubble-couple/
├── components/         # React UI components
│   ├── GameCanvas.tsx  # Local game renderer
│   ├── OnlineGame.tsx  # Online game wrapper
│   ├── Lobby.tsx       # Online lobby/matchmaking
│   └── ...
├── hooks/
│   ├── useGameEngine.ts    # Local game engine
│   └── useOnlineGame.ts    # Online connection hook
├── server/             # Colyseus game server
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   ├── rooms/
│   │   │   ├── BubbleRoom.ts   # Game room logic
│   │   │   └── schema/         # State schemas
│   │   └── utils/
│   │       └── gameLogic.ts    # Shared game logic
│   └── package.json
├── types.ts            # Type definitions
├── constants.ts        # Game constants
└── ...
```

## Deploy to Dokploy

This project is ready for deployment on Dokploy platform. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Start:**
1. Create a new application in Dokploy
2. Connect your GitHub repository
3. Select Docker Compose build method
4. Deploy!

For detailed Chinese/English deployment guide, check [DEPLOYMENT.md](./DEPLOYMENT.md) (包含中文部署说明).

## Online Multiplayer Features

- **Quick Match** - Automatically find and join available rooms
- **Private Rooms** - Create room with 4-character code to play with friends
- **PvP Mode** - 1v1 online battle
- **PvE Co-op** - Online cooperative mode against AI enemies
- **State Synchronization** - Smooth multiplayer experience with client-side prediction
