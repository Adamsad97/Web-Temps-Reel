import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { saveSubscription, removeSubscription, PushSubscription } from '../services/webpush';

const router = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNsGLcL5HXHELz9S7eXti4Gi5kpFo7CX_LAjhE2nhQYRPLAn28wbqTZY_HKKflsXsDzK14mAw5fuOB57qX7wBM4';

router.get('/vapid-public-key', (_req, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
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
