import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { get, run } from '../db';
import { JWT_SECRET, authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response): void => {
  const { username, email, password } = req.body;

  // Validate
  if (!username || !email || !password) {
    res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
    return;
  }
  if (typeof username !== 'string' || username.length < 2 || username.length > 20) {
    res.status(400).json({ error: '用户名需 2-20 个字符' });
    return;
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: '密码至少 6 个字符' });
    return;
  }

  // Check uniqueness
  const existing = get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
  if (existing) {
    res.status(409).json({ error: '用户名或邮箱已被注册' });
    return;
  }

  // Create user + profile
  const userId = uuidv4();
  const profileId = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    run('INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [userId, username, email, hashedPassword]);
    run('INSERT INTO user_profiles (id, user_id) VALUES (?, ?)', [profileId, userId]);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: userId, username, email },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: '邮箱和密码不能为空' });
    return;
  }

  // 支持用邮箱或用户名登录（内置管理员账号 123456 也走这里）
  const user = get('SELECT id, username, email, password FROM users WHERE email = ? OR username = ?', [email, email]);

  if (!user) {
    res.status(401).json({ error: '邮箱或密码错误' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    res.status(401).json({ error: '邮箱或密码错误' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
});

// GET /api/auth/me — get current user + profile
authRouter.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  const user = get('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.userId!]);

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const profile = get('SELECT * FROM user_profiles WHERE user_id = ?', [req.userId!]);

  res.json({
    user: { id: user.id, username: user.username, email: user.email },
    profile: profile || null,
  });
});
