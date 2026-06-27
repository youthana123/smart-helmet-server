const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use('/boss', express.static(path.join(__dirname, 'public/boss')));
app.use('/worker', express.static(path.join(__dirname, 'public/worker')));
app.get('/', (req, res) => res.redirect('/boss'));

const clients = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'register') {
                clients.set(ws, { role: data.role, deviceId: data.deviceId || 'boss' });
            } 
            else if (data.type === 'sensor_data') {
                clients.forEach((info, clientWs) => {
                    if (info.role === 'boss' && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify(data));
                    }
                });
            }
            else if (data.type === 'ack_sos') {
                clients.forEach((info, clientWs) => {
                    if (info.role === 'helmet' && info.deviceId === data.targetId && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({ type: 'ack_sos' }));
                    }
                });
            }
            else if (data.type === 'set_worker') {
                clients.forEach((info, clientWs) => {
                    if ((info.role === 'boss' || (info.role === 'helmet' && info.deviceId === data.deviceId)) 
                        && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify(data)); 
                    }
                });
            }
        } catch (e) {
            console.error("Invalid Data", e);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));