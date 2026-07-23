// ========================================
// SQLite Database — powered by sql.js (pure WASM, zero native deps)
// Provides a better-sqlite3–like API wrapper
// ========================================

import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// ---- Built-in admin account (账号: 123456 / 密码: 123456) ----
const ADMIN_USERNAME = '123456';
const ADMIN_EMAIL = '123456';
const ADMIN_PASSWORD = '123456';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'smartstyle.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let SQL: SqlJsStatic;
let _db: SqlJsDatabase;

// ---- Init: load existing DB or create new ----
export async function initDatabase(): Promise<void> {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buffer);
  } else {
    _db = new SQL.Database();
  }

  // Enable WAL-like behavior (sql.js doesn't support WAL, but we set foreign keys)
  _db.run('PRAGMA foreign_keys = ON');

  // Create schema
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT NOT NULL UNIQUE,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      body_shape      TEXT NOT NULL DEFAULT '梨形',
      height          REAL NOT NULL DEFAULT 165,
      weight          REAL NOT NULL DEFAULT 55,
      gender          TEXT NOT NULL DEFAULT 'FEMALE',
      top_style       TEXT NOT NULL DEFAULT '极简风',
      most_worn_color TEXT NOT NULL DEFAULT '白色',
      avatar_url      TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS clothing_items (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_url   TEXT NOT NULL,
      category    TEXT NOT NULL,
      tags        TEXT NOT NULL DEFAULT '[]',
      color       TEXT NOT NULL,
      brand       TEXT,
      season      TEXT NOT NULL DEFAULT '四季',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      wear_count  INTEGER NOT NULL DEFAULT 0,
      last_worn   TEXT,
      status      TEXT NOT NULL DEFAULT 'OWNED',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run('CREATE INDEX IF NOT EXISTS idx_clothing_user ON clothing_items(user_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_clothing_category ON clothing_items(user_id, category)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_clothing_status ON clothing_items(user_id, status)');

  // ---- Seed built-in admin account (idempotent) ----
  // 账号: 123456 / 密码: 123456 —— 首次启动自动创建，已存在则跳过
  const admin = get(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [ADMIN_EMAIL, ADMIN_USERNAME]
  );
  if (!admin) {
    const adminId = uuidv4();
    const profileId = uuidv4();
    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    run(
      'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [adminId, ADMIN_USERNAME, ADMIN_EMAIL, hashedPassword]
    );
    run(
      'INSERT INTO user_profiles (id, user_id) VALUES (?, ?)',
      [profileId, adminId]
    );
    console.log('✓ 内置管理员账号已创建（账号: 123456 / 密码: 123456）');
  }

  // Save initial schema to disk
  saveToDisk();
}

// ---- Persist to disk ----
export function saveToDisk(): void {
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ---- sql.js helper: bind params to a prepared statement ----
function bindParams(stmt: any, params: any[]): void {
  if (!params || params.length === 0) return;
  stmt.bind(params);
}

// ---- Execute INSERT/UPDATE/DELETE (returns nothing) ----
export function run(sql: string, params: any[] = []): void {
  _db.run(sql, params);
  saveToDisk();
}

// ---- Execute SELECT returning single row ----
export function get(sql: string, params: any[] = []): any | undefined {
  const stmt = _db.prepare(sql);
  bindParams(stmt, params);
  let row: any = undefined;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

// ---- Execute SELECT returning all rows ----
export function all(sql: string, params: any[] = []): any[] {
  const stmt = _db.prepare(sql);
  bindParams(stmt, params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// ---- Get the raw sql.js database (for transactions or advanced use) ----
export function getRawDb(): SqlJsDatabase {
  return _db;
}
