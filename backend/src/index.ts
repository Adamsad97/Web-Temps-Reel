import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { seedDatabase } from './services/db';
import { setupWebSocketServer } from './services/websocket';
import authRouter    from './routes/auth';
import sseRouter     from './routes/sse';
import messagesRouter from './routes/messages';
import pushRouter    from './routes/push';

const app = express();
const SERVER_PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth',     authRouter);
app.use('/api/sse',      sseRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/push',     pushRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const httpServer = http.createServer(app);
const webSocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
setupWebSocketServer(webSocketServer);

seedDatabase().then(() => {
  httpServer.listen(SERVER_PORT, () => {
    process.stdout.write(`AVENIR Bank backend running on port ${SERVER_PORT}\n`);
  });
});
