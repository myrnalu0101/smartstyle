import dotenv from 'dotenv';
import path from 'path';

// 本地开发加载.env；Render生产环境使用平台环境变量，不读取文件
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import { authRouter } from './routes/auth';
import { wardrobeRouter } from './routes/wardrobe';
import { uploadRouter } from './routes/upload';
import { profileRouter } from './routes/profile';

const app = express();
const PORT = process.env.PORT || 3000;

// 云端反代（Render/Railway）下，让 req.protocol / req.get('host') 取真实域名，用于拼接图片完整 URL
app.set('trust proxy', 1);

// --------------- Middleware ---------------
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Static files: uploaded images
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// --------------- Routes ---------------
app.use('/api/auth', authRouter);
app.use('/api/wardrobe', wardrobeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/profile', profileRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server after DB init
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✨ SmartStyle Server running at http://localhost:${PORT}`);
    console.log(`   Uploads: http://localhost:${PORT}/uploads\n`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;