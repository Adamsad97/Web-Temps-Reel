import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { messages, groupMessages, users, discussionGroups, getDiscussionGroupMessages } from '../services/db';

const router = Router();

router.get('/private/:withId', authMiddleware, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const otherUserId = req.params.withId;

  const conversationMessages = messages.filter(
    message =>
      (message.fromId === currentUserId && message.toId === otherUserId) ||
      (message.fromId === otherUserId && message.toId === currentUserId)
  );

  const enrichedMessages = conversationMessages.map(message => {
    const senderUser = users.find(registeredUser => registeredUser.id === message.fromId);
    return { ...message, fromName: senderUser?.name, fromRole: senderUser?.role };
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
      .filter(message => message.fromId === currentUserId || message.toId === currentUserId)
      .forEach(message => {
        if (message.fromId !== currentUserId) contactedStaffIds.add(message.fromId);
        if (message.toId !== currentUserId) contactedStaffIds.add(message.toId);
      });

    if (contactedStaffIds.size === 0) {
      users
        .filter(registeredUser => registeredUser.role === 'conseiller')
        .forEach(registeredUser => contactedStaffIds.add(registeredUser.id));
    }

    const clientContacts = [...contactedStaffIds]
      .map(contactId => {
        const foundUser = users.find(registeredUser => registeredUser.id === contactId);
        return foundUser ? { id: foundUser.id, name: foundUser.name, role: foundUser.role } : null;
      })
      .filter(Boolean);

    res.json(clientContacts);
  } else {
    // Règles de visibilité des contacts :
    // - Conseiller : voit les clients + les autres conseillers + le directeur
    // - Directeur  : voit uniquement les conseillers (pas les clients)
    let allowedUsers: typeof users;
    if (currentUserRole === 'directeur') {
      allowedUsers = users.filter(u => u.role === 'conseiller');
    } else {
      // conseiller : tout le monde sauf soi-même
      allowedUsers = users.filter(u => u.id !== currentUserId);
    }

    const contacts = allowedUsers.map(otherUser => {
      const lastMessage = messages
        .filter(
          message =>
            (message.fromId === currentUserId && message.toId === otherUser.id) ||
            (message.fromId === otherUser.id && message.toId === currentUserId)
        )
        .slice(-1)[0];
      return { id: otherUser.id, name: otherUser.name, role: otherUser.role, lastMessage };
    });

    contacts.sort((contactA, contactB) => {
      const aIsStaff = contactA.role === 'conseiller';
      const bIsStaff = contactB.role === 'conseiller';
      if (aIsStaff && !bIsStaff) return -1;
      if (!aIsStaff && bIsStaff) return 1;
      return contactA.name.localeCompare(contactB.name, 'fr');
    });

    res.json(contacts);
  }
});

router.get('/discussion-groups', authMiddleware, requireRole('conseiller', 'directeur'), (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const currentUserRole = req.user!.role;

  const visibleGroups = currentUserRole === 'directeur'
    ? discussionGroups
    : discussionGroups.filter(group => group.memberIds.includes(currentUserId));

  const enrichedGroups = visibleGroups.map(group => ({
    ...group,
    members: group.memberIds.map(memberId => {
      const foundMember = users.find(registeredUser => registeredUser.id === memberId);
      return foundMember ? { id: foundMember.id, name: foundMember.name, role: foundMember.role } : null;
    }).filter(Boolean),
  }));

  res.json(enrichedGroups);
});

router.get('/discussion-groups/conseillers', authMiddleware, requireRole('directeur'), (_req: AuthRequest, res: Response) => {
  const conseillers = users
    .filter(registeredUser => registeredUser.role === 'conseiller')
    .map(registeredUser => ({ id: registeredUser.id, name: registeredUser.name, role: registeredUser.role }));
  res.json(conseillers);
});

router.get('/discussion-groups/:groupId/messages', authMiddleware, requireRole('conseiller', 'directeur'), (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.userId;
  const currentUserRole = req.user!.role;
  const group = discussionGroups.find(discussionGroup => discussionGroup.id === req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Groupe introuvable' });
  if (currentUserRole !== 'directeur' && !group.memberIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  return res.json(getDiscussionGroupMessages(req.params.groupId));
});

export default router;
