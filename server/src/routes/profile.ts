import { Router, Response } from 'express';
import { get, all, run } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const profileRouter = Router();

profileRouter.use(authMiddleware);

// GET /api/profile — get user stats
profileRouter.get('/', (req: AuthRequest, res: Response): void => {
  const userId = req.userId!;

  const profile = get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

  if (!profile) {
    res.status(404).json({ error: '用户资料不存在' });
    return;
  }

  const countResult = get(
    'SELECT COUNT(*) as total FROM clothing_items WHERE user_id = ? AND status = ?',
    [userId, 'OWNED']
  ) as any;

  res.json({
    bodyShape: profile.body_shape,
    height: profile.height,
    weight: profile.weight,
    gender: profile.gender,
    topStyle: profile.top_style,
    mostWornColor: profile.most_worn_color,
    totalItems: countResult.total,
    avatarUrl: profile.avatar_url,
  });
});

// PUT /api/profile — update user stats
profileRouter.put('/', (req: AuthRequest, res: Response): void => {
  const userId = req.userId!;
  const { bodyShape, height, weight, gender, topStyle, mostWornColor } = req.body;

  const existing = get('SELECT id FROM user_profiles WHERE user_id = ?', [userId]);

  if (!existing) {
    res.status(404).json({ error: '用户资料不存在' });
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (bodyShape !== undefined) { updates.push('body_shape = ?'); params.push(bodyShape); }
  if (height !== undefined) { updates.push('height = ?'); params.push(height); }
  if (weight !== undefined) { updates.push('weight = ?'); params.push(weight); }
  if (gender !== undefined) { updates.push('gender = ?'); params.push(gender); }
  if (topStyle !== undefined) { updates.push('top_style = ?'); params.push(topStyle); }
  if (mostWornColor !== undefined) { updates.push('most_worn_color = ?'); params.push(mostWornColor); }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' });
    return;
  }

  updates.push("updated_at = datetime('now')");
  params.push(userId);

  run(`UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`, params);

  // Return updated profile
  const updated = get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

  const countResult = get(
    'SELECT COUNT(*) as total FROM clothing_items WHERE user_id = ? AND status = ?',
    [userId, 'OWNED']
  ) as any;

  res.json({
    bodyShape: updated.body_shape,
    height: updated.height,
    weight: updated.weight,
    gender: updated.gender,
    topStyle: updated.top_style,
    mostWornColor: updated.most_worn_color,
    totalItems: countResult.total,
    avatarUrl: updated.avatar_url,
  });
});
