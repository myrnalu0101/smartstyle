import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { get, all, run } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const wardrobeRouter = Router();

// All wardrobe routes require auth
wardrobeRouter.use(authMiddleware);

// GET /api/wardrobe — list user's items
wardrobeRouter.get('/', (req: AuthRequest, res: Response): void => {
  const { category, status, search } = req.query;
  const userId = req.userId!;

  let sql = 'SELECT * FROM clothing_items WHERE user_id = ?';
  const params: any[] = [userId];

  if (status && typeof status === 'string') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (category && typeof category === 'string') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search && typeof search === 'string') {
    sql += ' AND (tags LIKE ? OR color LIKE ? OR brand LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  sql += ' ORDER BY created_at DESC';

  const items = all(sql, params);

  // Parse tags from JSON string
  const parsed = items.map((item: any) => ({
    ...item,
    tags: JSON.parse(item.tags || '[]'),
    isFavorite: Boolean(item.is_favorite),
  }));

  res.json(parsed);
});

// GET /api/wardrobe/:id — get single item
wardrobeRouter.get('/:id', (req: AuthRequest, res: Response): void => {
  const item = get(
    'SELECT * FROM clothing_items WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId!]
  );

  if (!item) {
    res.status(404).json({ error: '衣物不存在' });
    return;
  }

  res.json({
    ...item,
    tags: JSON.parse(item.tags || '[]'),
    isFavorite: Boolean(item.is_favorite),
  });
});

// POST /api/wardrobe — create item
wardrobeRouter.post('/', (req: AuthRequest, res: Response): void => {
  const { imageUrl, category, tags, color, brand, season, status } = req.body;
  const userId = req.userId!;

  if (!imageUrl || !category || !color) {
    res.status(400).json({ error: '图片、分类和颜色不能为空' });
    return;
  }

  const id = uuidv4();
  const tagsJson = JSON.stringify(tags || []);

  run(
    `INSERT INTO clothing_items (id, user_id, image_url, category, tags, color, brand, season, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, imageUrl, category, tagsJson, color, brand || null, season || '四季', status || 'OWNED']
  );

  const created = get('SELECT * FROM clothing_items WHERE id = ?', [id]);

  res.status(201).json({
    ...created,
    tags: JSON.parse(created.tags || '[]'),
    isFavorite: Boolean(created.is_favorite),
  });
});

// PUT /api/wardrobe/:id — update item
wardrobeRouter.put('/:id', (req: AuthRequest, res: Response): void => {
  const userId = req.userId!;
  const itemId = req.params.id;

  // Verify ownership
  const existing = get(
    'SELECT id FROM clothing_items WHERE id = ? AND user_id = ?',
    [itemId, userId]
  );

  if (!existing) {
    res.status(404).json({ error: '衣物不存在' });
    return;
  }

  const { imageUrl, category, tags, color, brand, season, isFavorite, wearCount, lastWorn, status } = req.body;

  const updates: string[] = [];
  const params: any[] = [];

  if (imageUrl !== undefined) { updates.push('image_url = ?'); params.push(imageUrl); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
  if (color !== undefined) { updates.push('color = ?'); params.push(color); }
  if (brand !== undefined) { updates.push('brand = ?'); params.push(brand); }
  if (season !== undefined) { updates.push('season = ?'); params.push(season); }
  if (isFavorite !== undefined) { updates.push('is_favorite = ?'); params.push(isFavorite ? 1 : 0); }
  if (wearCount !== undefined) { updates.push('wear_count = ?'); params.push(wearCount); }
  if (lastWorn !== undefined) { updates.push('last_worn = ?'); params.push(lastWorn); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' });
    return;
  }

  updates.push("updated_at = datetime('now')");
  params.push(itemId, userId);

  run(
    `UPDATE clothing_items SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );

  const updated = get('SELECT * FROM clothing_items WHERE id = ?', [itemId]);

  res.json({
    ...updated,
    tags: JSON.parse(updated.tags || '[]'),
    isFavorite: Boolean(updated.is_favorite),
  });
});

// DELETE /api/wardrobe/:id — delete item
wardrobeRouter.delete('/:id', (req: AuthRequest, res: Response): void => {
  const item = get(
    'SELECT id FROM clothing_items WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId!]
  );

  if (!item) {
    res.status(404).json({ error: '衣物不存在' });
    return;
  }

  run('DELETE FROM clothing_items WHERE id = ? AND user_id = ?', [req.params.id, req.userId!]);

  res.json({ success: true });
});
