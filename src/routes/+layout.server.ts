import { db } from '$lib/server/db';
import { conversations } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export async function load() {
	const convs = await db
		.select()
		.from(conversations)
		.orderBy(desc(conversations.updatedAt));
	return { conversations: convs };
}
