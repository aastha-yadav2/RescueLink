/**
 * Emergency Alert WebSocket Server
 * 
 * Setup Instructions:
 * 1. Ensure you have Node.js installed.
 * 2. Install the 'ws' package: npm install ws
 * 3. Run the server: node server.js
 * 4. The server will listen on port 3000.
 */

const { WebSocketServer, WebSocket } = require('ws');

const wss = new WebSocketServer({ port: 3000 });

// Simple in-memory storage for active alerts
let activeAlerts = [];

console.log('Emergency Alert WebSocket Server is running on ws://localhost:3000');

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send current active alerts to the newly connected client
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    payload: { alerts: activeAlerts }
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received:', message);

      switch (message.type) {
        case 'SEND_ALERT':
          // Create a new alert object
          const newAlert = {
            id: Date.now().toString(),
            userId: message.payload.userId || 'Anonymous',
            location: message.payload.location || 'Unknown',
            urgency: message.payload.urgency || 'Critical',
            timestamp: new Date().toISOString(),
            status: 'Pending'
          };

          activeAlerts.push(newAlert);

          // Broadcast the new alert to ALL connected clients (including admins)
          broadcast({
            type: 'NEW_ALERT',
            payload: newAlert
          });
          break;

        case 'RESOLVE_ALERT':
          const alertId = message.payload.id;
          activeAlerts = activeAlerts.filter(a => a.id !== alertId);

          // Broadcast resolution to all clients
          broadcast({
            type: 'ALERT_RESOLVED',
            payload: { id: alertId }
          });
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

/**
 * Broadcasts a message to all connected clients
 * @param {Object} data 
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
