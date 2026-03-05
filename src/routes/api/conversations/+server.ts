import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { conversations, messages } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function GET() {
	const rows = await db
		.select()
		.from(conversations)
		.orderBy(desc(conversations.updatedAt));
	return json(rows);
}

export async function POST({ request }) {
	const body = await request.json();
	const now = new Date();
	const id = randomUUID();

	const [conv] = await db
		.insert(conversations)
		.values({
			id,
			title: body.title ?? 'New Chat',
			model: body.model ?? 'qwen2.5:7b',
			createdAt: now,
			updatedAt: now
		})
		.returning();

	return json(conv);
}
