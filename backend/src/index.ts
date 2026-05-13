import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { seedDatabase } from './services/db';
import { setupSocketIO } from './services/socketio';
import authRouter    from './routes/auth';
import sseRouter     from './routes/sse';
import messagesRouter from './routes/messages';
import pushRouter    from './routes/push';

const app = express();
const SERVER_PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth',     authRouter);
app.use('/api/sse',      sseRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/push',     pushRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const httpServer = http.createServer(app);

// Initialisation socket.io — cours : new Server(PORT, { cors: { origin: "..." } })
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

setupSocketIO(io);

seedDatabase().then(() => {
  httpServer.listen(SERVER_PORT, () => {
    process.stdout.write(`AVENIR Bank backend running on port ${SERVER_PORT}\n`);
  });
});
