import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const conversations = sqliteTable('conversations', {
	id: text('id').primaryKey(),
	title: text('title').notNull().default('New Chat'),
	model: text('model').notNull().default('qwen2.5:7b'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const messages = sqliteTable('messages', {
	id: text('id').primaryKey(),
	conversationId: text('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
	content: text('content').notNull(),
	tokensPrompt: integer('tokens_prompt'),
	tokensCompletion: integer('tokens_completion'),
	durationMs: integer('duration_ms'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const accessLogs = sqliteTable('access_logs', {
	id: text('id').primaryKey(),
	method: text('method').notNull(),
	path: text('path').notNull(),
	status: integer('status').notNull(),
	durationMs: integer('duration_ms').notNull(),
	userAgent: text('user_agent'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
