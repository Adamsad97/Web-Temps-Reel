import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { messages, groupMessages, users, discussionGroups, getDiscussionGroupMessages } from '../services/db';

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
    // Clients see conseillers
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
    // Staff (conseiller / directeur) see: all clients + all other staff members
    const otherUsers = users.filter(u => u.id !== currentUserId);

    const contacts = otherUsers.map(u => {
      const lastMessage = messages
        .filter(m => (m.fromId === currentUserId && m.toId === u.id) || (m.fromId === u.id && m.toId === currentUserId))
        .slice(-1)[0];
      return { id: u.id, name: u.name, role: u.role, lastMsg: lastMessage };
    });

    // Sort: staff first, then clients; alphabetically within groups
    contacts.sort((a, b) => {
      const aIsStaff = a.role === 'conseiller' || a.role === 'directeur';
      const bIsStaff = b.role === 'conseiller' || b.role === 'directeur';
      if (aIsStaff && !bIsStaff) return -1;
      if (!aIsStaff && bIsStaff) return 1;
      return a.name.localeCompare(b.name, 'fr');
    });

    res.json(contacts);
  }
});

// Discussion Groups
router.get('/discussion-groups', authMiddleware, requireRole('conseiller', 'directeur'), (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const currentUserRole = req.user!.role;

  const visibleGroups = currentUserRole === 'directeur'
    ? discussionGroups
    : discussionGroups.filter(g => g.memberIds.includes(currentUserId));

  const enriched = visibleGroups.map(g => ({
    ...g,
    members: g.memberIds.map(id => {
      const u = users.find(u => u.id === id);
      return u ? { id: u.id, name: u.name, role: u.role } : null;
    }).filter(Boolean),
  }));

  res.json(enriched);
});

router.get('/discussion-groups/conseillers', authMiddleware, requireRole('directeur'), (_req: AuthRequest, res: Response) => {
  const conseillers = users
    .filter(u => u.role === 'conseiller')
    .map(u => ({ id: u.id, name: u.name, role: u.role }));
  res.json(conseillers);
});

router.get('/discussion-groups/:groupId/messages', authMiddleware, requireRole('conseiller', 'directeur'), (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const currentUserRole = req.user!.role;
  const group = discussionGroups.find(g => g.id === req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Groupe introuvable' });
  if (currentUserRole !== 'directeur' && !group.memberIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  return res.json(getDiscussionGroupMessages(req.params.groupId));
});

export default router;
