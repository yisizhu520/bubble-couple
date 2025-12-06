import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import { monitor } from "@colyseus/monitor";
import { BubbleRoom } from "./rooms/BubbleRoom";

const app = express();
const port = Number(process.env.PORT) || 2567;

// Parse JSON bodies
app.use(express.json());

// CORS headers for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus game server
const gameServer = new Server({
  server: httpServer,
  pingInterval: 3000,
  pingMaxRetries: 3,
});

// Register game rooms
gameServer.define("bubble_pvp", BubbleRoom, { mode: "PVP" });
gameServer.define("bubble_pve", BubbleRoom, { mode: "PVE" });

// Colyseus monitor (development only)
if (process.env.NODE_ENV !== "production") {
  app.use("/colyseus", monitor());
}

// Start the server
gameServer.listen(port).then(() => {
  console.log(`🎮 Bubble Couple Server listening on port ${port}`);
  console.log(`📊 Monitor available at http://localhost:${port}/colyseus`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${port}`);
  console.log(`📡 Registered rooms: bubble_pvp, bubble_pve`);
});

// Add connection logging
gameServer.onShutdown(() => {
  console.log('Server shutting down...');
});

