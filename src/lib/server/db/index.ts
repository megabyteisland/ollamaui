import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';

const DB_PATH = './data/ollamaui.db';

if (!existsSync('./data')) {
	mkdirSync('./data', { recursive: true });
}

const client = new Database(DB_PATH);
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

// Ensure base tables exist
client.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    model TEXT NOT NULL DEFAULT 'qwen2.5:7b',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS access_logs (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    user_agent TEXT,
    created_at INTEGER NOT NULL
  );
`);

// Migrate: add analytics columns to messages if not present
const messageColumns = client.prepare('PRAGMA table_info(messages)').all() as { name: string }[];
const columnNames = messageColumns.map((c) => c.name);
if (!columnNames.includes('tokens_prompt')) {
	client.exec('ALTER TABLE messages ADD COLUMN tokens_prompt INTEGER');
}
if (!columnNames.includes('tokens_completion')) {
	client.exec('ALTER TABLE messages ADD COLUMN tokens_completion INTEGER');
}
if (!columnNames.includes('duration_ms')) {
	client.exec('ALTER TABLE messages ADD COLUMN duration_ms INTEGER');
}

export const db = drizzle(client, { schema });
