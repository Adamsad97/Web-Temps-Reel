import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { saveSubscription, removeSubscription, PushSubscription } from '../services/webpush';

const router = Router();



router.get('/vapid-public-key', (_req, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    res.status(503).json({ error: 'VAPID_PUBLIC_KEY non configurée dans .env' });
    return;
  }
  res.json({ publicKey });
});

router.post('/subscribe', authMiddleware, (req: AuthRequest, res: Response) => {
  const { subscription } = req.body as { subscription: PushSubscription };
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }
  saveSubscription(req.user!.userId, subscription);
  res.status(201).json({ subscribed: true });
});

router.post('/unsubscribe', authMiddleware, (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
  removeSubscription(req.user!.userId, endpoint);
  res.json({ unsubscribed: true });
});

export default router;
