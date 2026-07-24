// ========================================
// AI 路由 — 豆包(Ark)Anthropic 兼容端点识图
// POST /api/ai/recognize
//   入参：{ imageUrl }  （已上传到本后端的图片完整 URL）
//   出参：{ category, color, brand, season, tags, recognized }
// 识别失败时返回兜底默认值，不阻断录入流程
// ========================================

import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const aiRouter = Router();
aiRouter.use(authMiddleware);

// ---- 豆包 Anthropic 兼容端点配置 ----
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/compatible';
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'ep-20260717111036-w2g6m';

// 本地 uploads 目录（图片就存在这里，直接读文件转 base64，最稳）
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// 兜底默认值（识图失败时用）
const FALLBACK = {
  category: '上装',
  color: '白色',
  brand: '',
  season: '四季',
  tags: [] as string[],
};

const ALLOWED_CATEGORIES = ['上装', '下装', '连衣裙', '外套', '鞋履', '配饰', '鞋子'];

function normalizeCategory(raw: string): string {
  const s = (raw || '').trim();
  if (/上|衫|衣|t恤|t-shirt/i.test(s) && !/连衣|外套/.test(s)) return '上装';
  if (/裙|dress/i.test(s) && /连/.test(s)) return '连衣裙';
  if (/外套|夹克|大衣|风衣|jacket|coat/i.test(s)) return '外套';
  if (/裤|裙|下装|pant|trouser/i.test(s)) return '下装';
  if (/鞋|shoe|sneaker|boot/i.test(s)) return '鞋履';
  if (/配饰|包|帽|围巾|领带|belt|bag|hat|scarf/i.test(s)) return '配饰';
  return ALLOWED_CATEGORIES.includes(s) ? s : '上装';
}

// 从图片 URL 里取文件名（https://...onrender.com/uploads/xxx.jpg -> xxx.jpg）
function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const last = parts[parts.length - 1];
    return last || null;
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || null;
  }
}

function mediaTypeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

// 从模型回复里抠出 JSON
function extractJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

aiRouter.post('/recognize', (req: AuthRequest, res: Response): void => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    res.status(400).json({ error: '缺少 imageUrl' });
    return;
  }

  if (!AUTH_TOKEN) {
    // 没配 token，直接返回兜底值，不阻断录入
    res.json({ ...FALLBACK, recognized: false });
    return;
  }

  // 1. 从本地读取图片并转 base64
  const filename = filenameFromUrl(imageUrl);
  if (!filename) {
    res.json({ ...FALLBACK, recognized: false });
    return;
  }
  const localPath = path.join(UPLOADS_DIR, filename);
  let imageBase64 = '';
  try {
    const buf = fs.readFileSync(localPath);
    imageBase64 = buf.toString('base64');
  } catch (err) {
    console.error('[AI] 读取本地图片失败:', localPath, err);
    res.json({ ...FALLBACK, recognized: false });
    return;
  }
  const mediaType = mediaTypeFromExt(filename);

  // 2. 组装 Anthropic Messages 请求
  const systemPrompt =
    '你是一个服装识别助手。看图识别这件衣物的属性，只返回 JSON，不要任何解释文字或 markdown 包裹。' +
    '格式：{"category":"上装|下装|连衣裙|外套|鞋履|配饰","color":"主颜色（中文）","brand":"品牌，看不清或无标填空字符串","season":"四季","tags":["风格标签1","风格标签2"]}';

  const body = {
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '识别这张图里的衣物属性，只返回 JSON。' },
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
        ],
      },
    ],
  };

  fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AUTH_TOKEN,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
    .then(async (r) => {
      // 非 2xx 时记录原始返回，避免 Ark 500 仍被当成功解析
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        console.error('[AI] Ark HTTP', r.status, text.slice(0, 300));
        return { __error: true, status: r.status, body: text };
      }
      return r.json();
    })
    .then((data: any) => {
      if (data?.__error) {
        res.json({ ...FALLBACK, recognized: false });
        return;
      }
      // Anthropic / GLM 兼容格式：content[] 块可能是 text 或 thinking
      const blocks = Array.isArray(data?.content) ? data.content : [];
      const content = blocks
        .map((b: any) => {
          if (!b) return '';
          // GLM 思考模型返回 {type:"thinking", thinking:"..."}
          if (typeof b.thinking === 'string') return b.thinking;
          if (typeof b.text === 'string') return b.text;
          return '';
        })
        .join('')
        .trim();
      const parsed = extractJson(content);
      const result = {
        category: normalizeCategory(parsed?.category || FALLBACK.category),
        color: (parsed?.color || FALLBACK.color).trim(),
        brand: (parsed?.brand || '').trim(),
        season: FALLBACK.season,
        tags: Array.isArray(parsed?.tags) ? parsed.tags.slice(0, 5) : [],
        recognized: !!parsed,
      };
      res.json(result);
    })
    .catch((err: any) => {
      console.error('[AI] 识图失败:', err);
      res.json({ ...FALLBACK, recognized: false });
    });
});
