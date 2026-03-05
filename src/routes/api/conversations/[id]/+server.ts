import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { conversations, messages } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET({ params }) {
	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.id, params.id)
	});
	if (!conv) throw error(404, 'Conversation not found');

	const msgs = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, params.id))
		.orderBy(asc(messages.createdAt));

	return json({ ...conv, messages: msgs });
}

export async function PATCH({ params, request }) {
	const body = await request.json();
	const [updated] = await db
		.update(conversations)
		.set({ title: body.title, updatedAt: new Date() })
		.where(eq(conversations.id, params.id))
		.returning();
	return json(updated);
}

export async function DELETE({ params }) {
	await db.delete(conversations).where(eq(conversations.id, params.id));
	return json({ ok: true });
}
