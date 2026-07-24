// ========================================
// AI 路由 — 衣服抠图（阿里云图像分割）+ 识图（Anthropic 兼容端点）
// POST /api/ai/segment   入参 { imageUrl } → 返回 { cutoutUrl }
// POST /api/ai/recognize 入参 { imageUrl } → 返回 { category, color, brand, season, tags, recognized }
// 两者失败都不阻断录入流程
// ========================================

import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const aiRouter = Router();
aiRouter.use(authMiddleware);

// ---- 阿里云图像分割配置 ----
const ALI_ACCESS_KEY_ID = process.env.ALI_ACCESS_KEY_ID || '';
const ALI_ACCESS_KEY_SECRET = process.env.ALI_ACCESS_KEY_SECRET || '';

// ---- 豆包 Anthropic 兼容端点配置（识图用，可选）----
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/compatible';
const AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'ep-20260717111036-w2g6m';

// ---- 豆包视觉模型配置（多件检测出框，OpenAI 兼容端点）----
// token 与上面同一个；模型/base 不同，故单独配
const VISION_TOKEN = process.env.ARK_VISION_TOKEN || AUTH_TOKEN;
const VISION_BASE = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const VISION_MODEL = process.env.ARK_VISION_MODEL || 'ep-20260324181057-vgxlw';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const FALLBACK_RECOG = {
  category: '上装',
  color: '白色',
  brand: '',
  season: '四季',
  tags: [] as string[],
};

function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    return parts[parts.length - 1] || null;
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

function normalizeCategory(raw: string): string {
  const s = (raw || '').trim();
  const allowed = ['上装', '下装', '连衣裙', '外套', '鞋履', '配饰', '鞋子'];
  if (/上|衫|衣|t恤|t-shirt/i.test(s) && !/连衣|外套/.test(s)) return '上装';
  if (/裙|dress/i.test(s) && /连/.test(s)) return '连衣裙';
  if (/外套|夹克|大衣|风衣|jacket|coat/i.test(s)) return '外套';
  if (/裤|裙|下装|pant|trouser/i.test(s)) return '下装';
  if (/鞋|shoe|sneaker|boot/i.test(s)) return '鞋履';
  if (/配饰|包|帽|围巾|领带|belt|bag|hat|scarf/i.test(s)) return '配饰';
  return allowed.includes(s) ? s : '上装';
}

// ----------------------------------------------------------------
// POST /api/ai/detect — 视觉模型出框，按框裁剪出每件衣物，供用户多选
// 入参 { imageUrl } → 返回 { items: [{ cropUrl, type }] }
// 失败回退单件（原图），不阻断录入流程
// ----------------------------------------------------------------
aiRouter.post('/detect', async (req: AuthRequest, res: Response): Promise<void> => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    res.status(400).json({ error: '缺少 imageUrl' });
    return;
  }
  if (!VISION_TOKEN) {
    res.json({ items: [{ cropUrl: imageUrl, type: '' }] });
    return;
  }

  const filename = filenameFromUrl(imageUrl);
  if (!filename) {
    res.json({ items: [{ cropUrl: imageUrl, type: '' }] });
    return;
  }
  const localPath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(localPath)) {
    res.json({ items: [{ cropUrl: imageUrl, type: '' }] });
    return;
  }

  try {
    const { Jimp } = require('jimp');
    const img = await Jimp.read(localPath);
    const W = img.width;
    const H = img.height;

    // base64 喂给视觉模型，让它输出每个物体的归一化边界框
    const mediaType = mediaTypeFromExt(filename);
    const b64 = fs.readFileSync(localPath).toString('base64');
    const prompt =
      '识别图中每件独立的衣物（上衣/下装/外套/裙/鞋/包/帽/配饰等）。' +
      '返回 JSON 数组，每项含 name(中文) 和 box(归一化坐标 0~1，格式 [x_min,y_min,x_max,y_max])。' +
      '若整图只有一件衣物就只返回一项。只返回 JSON，不要解释或 markdown 包裹。';

    const body = {
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${b64}` } },
          ],
        },
      ],
    };

    const r = await fetch(`${VISION_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VISION_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('[AI] 检测 HTTP', r.status, t.slice(0, 300));
      res.json({ items: [{ cropUrl: imageUrl, type: '' }] });
      return;
    }
    const data: any = await r.json();
    const content: string = (data?.choices?.[0]?.message?.content || '').toString().trim();
    const parsed = extractJson(content);
    const rawItems: any[] = Array.isArray(parsed) ? parsed : parsed?.items || [];

    // 归一化坐标 → 像素，裁剪每件
    const items: any[] = [];
    for (const it of rawItems) {
      const box = Array.isArray(it?.box) ? it.box : null;
      if (!box || box.length < 4) continue;
      const xMin = clamp01(Number(box[0])) * W;
      const yMin = clamp01(Number(box[1])) * H;
      const xMax = clamp01(Number(box[2])) * W;
      const yMax = clamp01(Number(box[3])) * H;
      let x = Math.round(Math.min(xMin, xMax));
      let y = Math.round(Math.min(yMin, yMax));
      let w = Math.round(Math.abs(xMax - xMin));
      let h = Math.round(Math.abs(yMax - yMin));
      if (w < 12 || h < 12) continue;
      x = Math.max(0, Math.min(x, W - 1));
      y = Math.max(0, Math.min(y, H - 1));
      w = Math.min(w, W - x);
      h = Math.min(h, H - y);
      if (w < 12 || h < 12) continue;
      const cropImg = await Jimp.read(localPath);
      cropImg.crop({ x, y, w, h });
      const buf = await cropImg.getBuffer('image/png');
      const newFile = `crop-${uuidv4()}.png`;
      fs.writeFileSync(path.join(UPLOADS_DIR, newFile), buf);
      items.push({
        cropUrl: `${req.protocol}://${req.get('host')}/uploads/${newFile}`,
        type: String(it.name || '').trim(),
        // 归一化框（相对原图），选择后回传给 /segment，从整图抠图里裁这一件
        box: [
          Number(clamp01(Number(box[0])).toFixed(4)),
          Number(clamp01(Number(box[1])).toFixed(4)),
          Number(clamp01(Number(box[2])).toFixed(4)),
          Number(clamp01(Number(box[3])).toFixed(4)),
        ],
      });
    }

    if (!items.length) {
      res.json({ items: [{ cropUrl: imageUrl, type: '' }] });
      return;
    }
    res.json({ items });
  } catch (err: any) {
    console.error('[AI] 检测失败:', err?.message || err);
    res.json({ items: [{ cropUrl: imageUrl, type: '' }] });
  }
});

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

// ----------------------------------------------------------------
// POST /api/ai/segment — 抠图，返回抠好图的公网 URL
// ----------------------------------------------------------------
aiRouter.post('/segment', async (req: AuthRequest, res: Response): Promise<void> => {
  const { imageUrl, box } = req.body;
  if (!imageUrl) {
    res.status(400).json({ error: '缺少 imageUrl' });
    return;
  }
  const hasBox = Array.isArray(box) && box.length >= 4 && box.every((v: any) => Number.isFinite(Number(v)));
  if (!ALI_ACCESS_KEY_ID || !ALI_ACCESS_KEY_SECRET) {
    // 没配阿里云 key，返回原图 URL，不阻断流程
    res.json({ cutoutUrl: imageUrl, segmented: false });
    return;
  }

  // 1. 从 imageUrl 解析本地文件名并读取本地图片流
  //    （Advance 版本直接传本地文件流，绕过"必须上海 OSS URL"的限制）
  const filename = filenameFromUrl(imageUrl);
  if (!filename) {
    res.json({ cutoutUrl: imageUrl, segmented: false });
    return;
  }
  const localPath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(localPath)) {
    res.json({ cutoutUrl: imageUrl, segmented: false });
    return;
  }

  try {
    // 动态 require 阿里云 SDK（default export 才是 Client 构造器）
    const aliMod: any = require('@alicloud/imageseg20191230');
    const Client = aliMod.default;
    const { Config } = require('@alicloud/openapi-client');
    const { RuntimeOptions } = require('@alicloud/tea-util');

    const config = new Config({
      accessKeyId: ALI_ACCESS_KEY_ID,
      accessKeySecret: ALI_ACCESS_KEY_SECRET,
      endpoint: 'imageseg.cn-shanghai.aliyuncs.com',
    });
    const client = new Client(config);

    // 服装分割 Advance：用本地文件流，识别出衣服各部位
    const segReq = new aliMod.SegmentClothAdvanceRequest({
      imageURLObject: fs.createReadStream(localPath),
    });
    const runtime = new RuntimeOptions({ readTimeout: 60000, connectTimeout: 30000 });
    const resp = await client.segmentClothAdvance(segReq, runtime);

    // data.elements[] 每个是一件抠好的衣服，imageURL 是阿里云临时 OSS URL（有时效）
    const elements = (resp?.body?.data?.elements as any[]) || [];
    const first = elements[0];
    const cutUrl: string = first?.imageURL;
    if (!cutUrl || !cutUrl.startsWith('http')) {
      res.json({ cutoutUrl: imageUrl, segmented: false });
      return;
    }

    // 下载阿里云返回的抠图
    const imgResp = await fetch(cutUrl);
    let buf = Buffer.from(await imgResp.arrayBuffer());

    // 若带 box（用户选了多件中的一件）：从整图抠图里按框裁出这一件
    // 关键：先对整图抠图（质量好、不变形），再裁单件；避免对局部图抠图导致带人/放大
    if (hasBox) {
      try {
        const { Jimp } = require('jimp');
        const cut = await Jimp.read(buf);
        const W = cut.width;
        const H = cut.height;
        const xMin = clamp01(Number(box[0])) * W;
        const yMin = clamp01(Number(box[1])) * H;
        const xMax = clamp01(Number(box[2])) * W;
        const yMax = clamp01(Number(box[3])) * H;
        let x = Math.round(Math.min(xMin, xMax));
        let y = Math.round(Math.min(yMin, yMax));
        let w = Math.round(Math.abs(xMax - xMin));
        let h = Math.round(Math.abs(yMax - yMin));
        if (w >= 12 && h >= 12) {
          x = Math.max(0, Math.min(x, W - 1));
          y = Math.max(0, Math.min(y, H - 1));
          w = Math.min(w, W - x);
          h = Math.min(h, H - y);
          if (w >= 12 && h >= 12) {
            cut.crop({ x, y, w, h });
            buf = await cut.getBuffer('image/png');
          }
        }
      } catch (e: any) {
        console.error('[AI] 裁剪单件失败，使用整图抠图:', e?.message || e);
      }
    }

    const newFile = `cutout-${uuidv4()}.png`;
    fs.writeFileSync(path.join(UPLOADS_DIR, newFile), buf);

    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${newFile}`;
    res.json({ cutoutUrl: publicUrl, segmented: true });
  } catch (err: any) {
    console.error('[AI] 抠图失败:', err?.message || err);
    // 失败返回原图，不阻断
    res.json({ cutoutUrl: imageUrl, segmented: false });
  }
});

// ----------------------------------------------------------------
// POST /api/ai/recognize — 识图（豆包 Anthropic 兼容端点，可选）
// ----------------------------------------------------------------
aiRouter.post('/recognize', (req: AuthRequest, res: Response): void => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    res.status(400).json({ error: '缺少 imageUrl' });
    return;
  }
  if (!AUTH_TOKEN) {
    res.json({ ...FALLBACK_RECOG, recognized: false });
    return;
  }

  const filename = filenameFromUrl(imageUrl);
  if (!filename) {
    res.json({ ...FALLBACK_RECOG, recognized: false });
    return;
  }
  const localPath = path.join(UPLOADS_DIR, filename);
  let imageBase64 = '';
  try {
    const buf = fs.readFileSync(localPath);
    imageBase64 = buf.toString('base64');
  } catch (err) {
    console.error('[AI] 读取本地图片失败:', localPath, err);
    res.json({ ...FALLBACK_RECOG, recognized: false });
    return;
  }
  const mediaType = mediaTypeFromExt(filename);

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
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        console.error('[AI] Ark HTTP', r.status, text.slice(0, 300));
        return { __error: true };
      }
      return r.json();
    })
    .then((data: any) => {
      if (data?.__error) {
        res.json({ ...FALLBACK_RECOG, recognized: false });
        return;
      }
      const blocks = Array.isArray(data?.content) ? data.content : [];
      const content = blocks
        .map((b: any) => {
          if (!b) return '';
          if (typeof b.thinking === 'string') return b.thinking;
          if (typeof b.text === 'string') return b.text;
          return '';
        })
        .join('')
        .trim();
      const parsed = extractJson(content);
      const result = {
        category: normalizeCategory(parsed?.category || FALLBACK_RECOG.category),
        color: (parsed?.color || FALLBACK_RECOG.color).trim(),
        brand: (parsed?.brand || '').trim(),
        season: FALLBACK_RECOG.season,
        tags: Array.isArray(parsed?.tags) ? parsed.tags.slice(0, 5) : [],
        recognized: !!parsed,
      };
      res.json(result);
    })
    .catch((err: any) => {
      console.error('[AI] 识图失败:', err);
      res.json({ ...FALLBACK_RECOG, recognized: false });
    });
});
