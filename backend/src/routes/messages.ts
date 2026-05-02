import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { messages, groupMessages, users } from '../services/db';

const router = Router();

router.get('/private/:withId', authMiddleware, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const otherUserId = req.params.withId;

  const conversationMessages = messages.filter(
    m => (m.fromId === currentUserId && m.toId === otherUserId) || (m.fromId === otherUserId && m.toId === currentUserId)
  );

  const enrichedMessages = conversationMessages.map(m => {
    const senderUser = users.find(u => u.id === m.fromId);
    return { ...m, fromName: senderUser?.name, fromRole: senderUser?.role };
  });

  res.json(enrichedMessages);
});

router.get('/group', authMiddleware, requireRole('conseiller', 'directeur'), (_req: AuthRequest, res: Response) => {
  res.json(groupMessages);
});

router.get('/conversations', authMiddleware, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const currentUserRole = req.user!.role;

  if (currentUserRole === 'client') {
    const contactedStaffIds = new Set<string>();
    messages
      .filter(m => m.fromId === currentUserId || m.toId === currentUserId)
      .forEach(m => {
        if (m.fromId !== currentUserId) contactedStaffIds.add(m.fromId);
        if (m.toId !== currentUserId) contactedStaffIds.add(m.toId);
      });

    if (contactedStaffIds.size === 0) {
      users.filter(u => u.role === 'conseiller').forEach(u => contactedStaffIds.add(u.id));
    }

    const clientContacts = [...contactedStaffIds]
      .map(id => {
        const foundUser = users.find(u => u.id === id);
        return foundUser ? { id: foundUser.id, name: foundUser.name, role: foundUser.role } : null;
      })
      .filter(Boolean);

    res.json(clientContacts);
  } else {
    const allClientIds = new Set<string>(users.filter(u => u.role === 'client').map(u => u.id));

    const staffContacts = [...allClientIds]
      .map(id => {
        const foundUser = users.find(u => u.id === id);
        if (!foundUser) return null;
        const lastMessage = messages
          .filter(m => (m.fromId === currentUserId && m.toId === id) || (m.fromId === id && m.toId === currentUserId))
          .slice(-1)[0];
        return { id: foundUser.id, name: foundUser.name, role: foundUser.role, lastMsg: lastMessage };
      })
      .filter(Boolean);

    res.json(staffContacts);
  }
});

export default router;
