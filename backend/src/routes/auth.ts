import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';;
import { v4 as uuidv4 } from 'uuid';
import { users, findUserByEmail } from '../services/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Role } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'avenir_bank_super_secret_jwt_2024';
const JWT_EXPIRATION = '24h';
const BCRYPT_SALT_ROUNDS = 10;

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const existingUser = findUserByEmail(email);
  if (!existingUser) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const authToken = jwt.sign({ userId: existingUser.id, role: existingUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  res.json({ token: authToken, user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, role: existingUser.role } });
});

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body as { email: string; password: string; name: string };
  if (!email || !password || !name) {
    res.status(400).json({ error: 'All fields required' });
    return;
  }

  if (findUserByEmail(email)) {
    res.status(409).json({ error: 'Email already used' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const newUser = { id: uuidv4(), email, password: hashedPassword, name, role: 'client' as Role, createdAt: new Date().toISOString() };
  users.push(newUser);

  const authToken = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  res.status(201).json({ token: authToken, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const currentUser = users.find(u => u.id === req.user!.userId);
  if (!currentUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role });
});

export default router;
