import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { conversations, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST({ request }) {
	const { conversationId, content, model } = await request.json();

	if (!conversationId || !content) throw error(400, 'Missing required fields');

	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.id, conversationId)
	});
	if (!conv) throw error(404, 'Conversation not found');

	// Save user message
	const userMsgId = randomUUID();
	await db.insert(messages).values({
		id: userMsgId,
		conversationId,
		role: 'user',
		content,
		createdAt: new Date()
	});

	// Get all messages for context
	const history = await db.query.messages.findMany({
		where: eq(messages.conversationId, conversationId),
		orderBy: (m, { asc }) => [asc(m.createdAt)]
	});

	const ollamaMessages = history.map((m) => ({ role: m.role, content: m.content }));

	// Update conversation title if this is the first user message
	if (history.filter((m) => m.role === 'user').length === 1) {
		const title = content.slice(0, 60).trim();
		await db
			.update(conversations)
			.set({ title, updatedAt: new Date() })
			.where(eq(conversations.id, conversationId));
	} else {
		await db
			.update(conversations)
			.set({ updatedAt: new Date() })
			.where(eq(conversations.id, conversationId));
	}

	// Stream from Ollama
	const ollamaRes = await fetch('http://localhost:11434/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: model ?? conv.model,
			messages: ollamaMessages,
			stream: true
		})
	});

	if (!ollamaRes.ok) throw error(502, 'Ollama request failed');

	const assistantMsgId = randomUUID();
	let fullContent = '';

	// Transform the Ollama stream into SSE
	const stream = new ReadableStream({
		async start(controller) {
			const reader = ollamaRes.body!.getReader();
			const decoder = new TextDecoder();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split('\n').filter(Boolean);

					for (const line of lines) {
						try {
							const json = JSON.parse(line);
							if (json.message?.content) {
								fullContent += json.message.content;
								const sseData = `data: ${JSON.stringify({ content: json.message.content })}\n\n`;
								controller.enqueue(new TextEncoder().encode(sseData));
							}
							if (json.done) {
								// Save assistant message
								await db.insert(messages).values({
									id: assistantMsgId,
									conversationId,
									role: 'assistant',
									content: fullContent,
									createdAt: new Date()
								});
								controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, id: assistantMsgId })}\n\n`));
							}
						} catch {
							// skip unparseable lines
						}
					}
				}
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
