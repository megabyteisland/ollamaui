import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { conversations, messages } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function load({ params }) {
	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.id, params.id)
	});

	if (!conv) throw error(404, 'Conversation not found');

	const msgs = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, params.id))
		.orderBy(asc(messages.createdAt));

	// Fetch available models
	let models: string[] = [];
	try {
		const res = await fetch('http://localhost:11434/api/tags');
		const data = await res.json();
		models = (data.models ?? []).map((m: { name: string }) => m.name);
	} catch {
		models = [conv.model];
	}

	return { conversation: conv, messages: msgs, models };
}
