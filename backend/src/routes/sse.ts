import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { news, notifications, users, findUserById, addNotification } from '../services/db';
import { registerSSEClient, unregisterSSEClient, broadcastSSE, sendSSEToUser } from '../services/sse';
import { News } from '../types';

const router = Router();
const SSE_HEARTBEAT_INTERVAL_MS = 20_000;

router.get('/stream', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  registerSSEClient(userId, res);

  const heartbeatTimer = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeatTimer); }
  }, SSE_HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    unregisterSSEClient(userId);
  });
});

router.get('/news', authMiddleware, (_req: AuthRequest, res: Response) => {
  res.json([...news].reverse());
});

router.post('/news', authMiddleware, requireRole('conseiller', 'directeur'), (req: AuthRequest, res: Response) => {
  const { title, content } = req.body as { title: string; content: string };
  if (!title || !content) {
    res.status(400).json({ error: 'title and content required' });
    return;
  }

  const author = findUserById(req.user!.userId);
  if (!author) {
    res.status(404).json({ error: 'Author not found' });
    return;
  }

  const newsItem: News = {
    id: uuidv4(),
    authorId: author.id,
    authorName: author.name,
    title,
    content,
    createdAt: new Date().toISOString(),
  };
  news.push(newsItem);

  broadcastSSE('news', newsItem);

  const bankClients = users.filter(u => u.role === 'client');
  for (const bankClient of bankClients) {
    const notification = addNotification(bankClient.id, 'news', `Actualité : ${title}`, newsItem.id);
    sendSSEToUser(bankClient.id, 'notification', notification);
  }

  res.status(201).json(newsItem);
});

router.get('/notifications', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const userNotifications = notifications.filter(n => n.userId === userId).reverse();
  res.json(userNotifications);
});

router.patch('/notifications/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const targetNotification = notifications.find(n => n.id === req.params.id && n.userId === req.user!.userId);
  if (!targetNotification) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  targetNotification.read = true;
  res.json(targetNotification);
});

export default router;
