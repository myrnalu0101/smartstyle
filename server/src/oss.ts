// ========================================
// 阿里云 OSS 存储抽象
// 图片持久化：上传原图、抠图、裁剪结果都存 OSS，不依赖 Render 本地磁盘
// 本地 uploads/ 仍保留为 multer 落盘的临时区，上传后会同步到 OSS
// ========================================

import OSS from 'ali-oss';

const REGION = process.env.OSS_REGION || '';
const BUCKET = process.env.OSS_BUCKET || '';
const ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || process.env.ALI_ACCESS_KEY_ID || '';
const ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || process.env.ALI_ACCESS_KEY_SECRET || '';

let client: OSS | null = null;

/** 是否已配置 OSS（未配置时各处仍回退本地文件，保证可降级） */
export function isOssEnabled(): boolean {
  return !!(REGION && BUCKET && ACCESS_KEY_ID && ACCESS_KEY_SECRET);
}

function getClient(): OSS | null {
  if (!isOssEnabled()) return null;
  if (!client) {
    client = new OSS({
      region: REGION,
      bucket: BUCKET,
      accessKeyId: ACCESS_KEY_ID,
      accessKeySecret: ACCESS_KEY_SECRET,
      secure: true,
    });
  }
  return client;
}

/**
 * 把一段 buffer 存到 OSS，返回可公网访问的 URL
 * @param key OSS 对象 key（如 "uploads/abc.png"）
 * @param buf 文件内容
 * @param publicBase 可选自定义域名前缀，默认 https://<bucket>.<region>.aliyuncs.com
 */
export async function putToOss(key: string, buf: Buffer, publicBase?: string): Promise<string> {
  const c = getClient();
  if (!c) throw new Error('OSS 未配置');
  await c.put(key, buf);
  const base = publicBase || process.env.OSS_PUBLIC_BASE || `https://${BUCKET}.${REGION}.aliyuncs.com`;
  return `${base}/${key}`;
}

/** 从 URL（本站 /uploads/ 或 OSS 直链）拉取图片 buffer，用于喂模型（不依赖本地磁盘） */
export async function fetchBufferFromUrl(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`拉取图片失败 HTTP ${r.status}: ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
