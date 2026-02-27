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

  // Simple in-memory cache for geocoding results to avoid hitting rate limits
  const geocodeCache: Record<string, any> = {};

  app.get("/api/reverse-geocode", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    // Round coordinates to 4 decimal places to increase cache hit rate (~11m precision)
    const cacheKey = `${parseFloat(lat as string).toFixed(4)},${parseFloat(lon as string).toFixed(4)}`;
    
    if (geocodeCache[cacheKey]) {
      console.log(`[Geocode] Cache hit for ${cacheKey}`);
      return res.json(geocodeCache[cacheKey]);
    }

    console.log(`[Geocode] Request for lat: ${lat}, lon: ${lon}`);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": `RescueLinkEmergencyApp/1.1 (contact: admin@rescuelink.example.com; session: ${Date.now()})`,
            "Accept-Language": "en-US,en;q=0.9"
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Geocode] Nominatim error (${response.status}):`, errorText);
        
        if (response.status === 429) {
          return res.status(429).json({ 
            error: "Rate limit exceeded", 
            message: "The geocoding service is temporarily unavailable due to high demand. Please try again in a few moments." 
          });
        }
        
        return res.status(response.status).json({ error: "Geocoding service error" });
      }

      const data = await response.json() as any;
      console.log(`[Geocode] Success: ${data.display_name?.substring(0, 50)}...`);
      
      // Store in cache
      geocodeCache[cacheKey] = data;
      
      res.json(data);
    } catch (error) {
      console.error("[Geocode] Server-side fetch error:", error);
      res.status(500).json({ error: "Failed to connect to geocoding service" });
    }
  });

  // Store active alerts, history, active users, and disaster mode in memory
  let alerts: any[] = [];
  let history: any[] = [];
  let activeUsers: Record<string, { location: string, fullAddress?: string | null, lastSeen: string }> = {};
  let disasterMode = { active: false, type: null as string | null, timestamp: null as string | null };
  let trafficSimulation = { 
    active: false, 
    showHeatmap: true, 
    showReroutes: true, 
    showAmbulance: true,
    accidentLocation: [12.9750, 77.5900] as [number, number]
  };

  wss.on("connection", (ws) => {
    console.log("Client connected");

    // Send current alerts, history, active users, disaster mode, and traffic simulation to the new client
    ws.send(JSON.stringify({ 
      type: "INIT_DATA", 
      payload: { alerts, history, activeUsers, disasterMode, trafficSimulation } 
    }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "UPDATE_TRAFFIC_SIM") {
          trafficSimulation = { ...trafficSimulation, ...message.payload };
          const broadcastData = JSON.stringify({ type: "TRAFFIC_SIM_UPDATED", payload: trafficSimulation });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (message.type === "ACTIVATE_DISASTER") {
          disasterMode = {
            active: true,
            type: message.payload.type,
            timestamp: new Date().toISOString()
          };
          
          const broadcastData = JSON.stringify({ type: "DISASTER_ACTIVATED", payload: disasterMode });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (message.type === "DEACTIVATE_DISASTER") {
          disasterMode = {
            active: false,
            type: null,
            timestamp: null
          };
          
          const broadcastData = JSON.stringify({ type: "DISASTER_DEACTIVATED", payload: disasterMode });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }

        if (message.type === "NEW_ALERT") {
          const newAlert = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            status: message.payload.urgency || "Critical",
            location: message.payload.location || "Unknown Location",
            fullAddress: message.payload.fullAddress || null,
            userId: message.payload.userId || "Anonymous",
            transcript: message.payload.transcript || "",
            aiReasoning: message.payload.aiReasoning || "",
            accepted: false,
            videoData: message.payload.videoData || null,
            videoAnalysis: message.payload.videoAnalysis || null,
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
          const { userId, location, fullAddress } = message.payload;
          
          // Update active users
          activeUsers[userId] = { location, fullAddress, lastSeen: new Date().toISOString() };

          // Update any active alerts for this user
          let alertUpdated = false;
          alerts = alerts.map(a => {
            if (a.userId === userId) {
              alertUpdated = true;
              return { ...a, location, fullAddress };
            }
            return a;
          });
          
          // Broadcast location update
          const broadcastData = JSON.stringify({ 
            type: "USER_LOCATION_UPDATED", 
            payload: { userId, location, fullAddress, activeUsers } 
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
