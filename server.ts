import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const PORT = 3000;

  // Store active alerts, history, and active users in memory
  let alerts: any[] = [];
  let history: any[] = [];
  let activeUsers: Record<string, { location: string, lastSeen: string }> = {};

  wss.on("connection", (ws) => {
    console.log("Client connected");

    // Send current alerts, history, and active users to the new client
    ws.send(JSON.stringify({ 
      type: "INIT_DATA", 
      payload: { alerts, history, activeUsers } 
    }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "NEW_ALERT") {
          const newAlert = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            status: message.payload.urgency || "Critical",
            location: message.payload.location || "Unknown Location",
            userId: message.payload.userId || "Anonymous",
            transcript: message.payload.transcript || "",
            aiReasoning: message.payload.aiReasoning || "",
            accepted: false,
          };
          alerts.push(newAlert);
          
          // Broadcast to all clients
          const broadcastData = JSON.stringify({ type: "ALERT_CREATED", payload: newAlert });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (message.type === "ACCEPT_ALERT") {
          const alertId = message.payload.id;
          alerts = alerts.map(a => a.id === alertId ? { ...a, accepted: true, acceptedAt: new Date().toISOString() } : a);
          
          const broadcastData = JSON.stringify({ type: "ALERT_UPDATED", payload: alerts.find(a => a.id === alertId) });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (message.type === "RESOLVE_ALERT") {
          const alertId = message.payload.id;
          const alertIndex = alerts.findIndex(a => a.id === alertId);
          if (alertIndex !== -1) {
            const resolvedAlert = { 
              ...alerts[alertIndex], 
              resolved: true, 
              resolvedAt: new Date().toISOString(),
              resolutionType: 'Resolved'
            };
            history.push(resolvedAlert);
            alerts.splice(alertIndex, 1);

            const broadcastData = JSON.stringify({ type: "ALERT_RESOLVED", payload: { alertId, resolvedAlert } });
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastData);
              }
            });
          }
        }

        if (message.type === "REJECT_ALERT") {
          const alertId = message.payload.id;
          const alertIndex = alerts.findIndex(a => a.id === alertId);
          if (alertIndex !== -1) {
            const rejectedAlert = { 
              ...alerts[alertIndex], 
              resolved: true, 
              resolvedAt: new Date().toISOString(),
              resolutionType: 'Rejected'
            };
            history.push(rejectedAlert);
            alerts.splice(alertIndex, 1);

            const broadcastData = JSON.stringify({ type: "ALERT_RESOLVED", payload: { alertId, resolvedAlert: rejectedAlert } });
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastData);
              }
            });
          }
        }

        if (message.type === "LOCATION_UPDATE") {
          const { userId, location } = message.payload;
          
          // Update active users
          activeUsers[userId] = { location, lastSeen: new Date().toISOString() };

          // Update any active alerts for this user
          let alertUpdated = false;
          alerts = alerts.map(a => {
            if (a.userId === userId) {
              alertUpdated = true;
              return { ...a, location };
            }
            return a;
          });
          
          // Broadcast location update
          const broadcastData = JSON.stringify({ 
            type: "USER_LOCATION_UPDATED", 
            payload: { userId, location, activeUsers } 
          });
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    ws.on("close", () => console.log("Client disconnected"));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
