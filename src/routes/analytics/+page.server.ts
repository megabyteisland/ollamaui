import { db } from '$lib/server/db';
import { conversations, messages, accessLogs } from '$lib/server/db/schema';
import { sql, desc, and, gte, eq } from 'drizzle-orm';

export async function load() {
	const now = new Date();
	const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

	// --- Overview counts ---
	const [totalConversations] = await db
		.select({ count: sql<number>`count(*)` })
		.from(conversations);

	const [totalMessages] = await db
		.select({ count: sql<number>`count(*)` })
		.from(messages);

	const [userMessages] = await db
		.select({ count: sql<number>`count(*)` })
		.from(messages)
		.where(eq(messages.role, 'user'));

	const [tokenTotals] = await db
		.select({
			prompt: sql<number>`coalesce(sum(tokens_prompt), 0)`,
			completion: sql<number>`coalesce(sum(tokens_completion), 0)`
		})
		.from(messages)
		.where(eq(messages.role, 'assistant'));

	const [avgResponse] = await db
		.select({
			avgMs: sql<number>`coalesce(avg(duration_ms), 0)`
		})
		.from(messages)
		.where(and(eq(messages.role, 'assistant'), sql`duration_ms IS NOT NULL`));

	// --- Activity: messages per day for the last 14 days ---
	const activity = await db
		.select({
			day: sql<string>`date(created_at / 1000, 'unixepoch')`,
			count: sql<number>`count(*)`
		})
		.from(messages)
		.where(and(eq(messages.role, 'user'), gte(messages.createdAt, fourteenDaysAgo)))
		.groupBy(sql`date(created_at / 1000, 'unixepoch')`)
		.orderBy(sql`date(created_at / 1000, 'unixepoch')`);

	// Fill in missing days
	const activityMap = new Map(activity.map((r) => [r.day, r.count]));
	const activityFull = Array.from({ length: 14 }, (_, i) => {
		const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
		const day = d.toISOString().slice(0, 10);
		return { day, count: activityMap.get(day) ?? 0 };
	});

	// --- Model breakdown ---
	const modelStats = await db
		.select({
			model: conversations.model,
			conversations: sql<number>`count(distinct ${conversations.id})`,
			messages: sql<number>`count(${messages.id})`,
			tokensTotal: sql<number>`coalesce(sum(${messages.tokensCompletion}), 0)`,
			avgDurationMs: sql<number>`coalesce(avg(${messages.durationMs}), 0)`
		})
		.from(conversations)
		.leftJoin(messages, and(
			eq(messages.conversationId, conversations.id),
			eq(messages.role, 'assistant')
		))
		.groupBy(conversations.model)
		.orderBy(desc(sql`count(${messages.id})`));

	// Compute tokens/sec per model
	const modelStatsWithPerf = await Promise.all(
		modelStats.map(async (m) => {
			const [perf] = await db
				.select({
					avgTokPerSec: sql<number>`coalesce(
						avg(cast(tokens_completion as real) / (duration_ms / 1000.0)),
						0
					)`
				})
				.from(messages)
				.innerJoin(conversations, eq(messages.conversationId, conversations.id))
				.where(
					and(
						eq(conversations.model, m.model),
						eq(messages.role, 'assistant'),
						sql`${messages.durationMs} > 0`,
						sql`${messages.tokensCompletion} > 0`
					)
				);
			return { ...m, tokPerSec: Math.round(perf?.avgTokPerSec ?? 0) };
		})
	);

	// --- Recent access logs ---
	const recentLogs = await db
		.select()
		.from(accessLogs)
		.orderBy(desc(accessLogs.createdAt))
		.limit(50);

	// --- Access log summary: top paths ---
	const topPaths = await db
		.select({
			path: accessLogs.path,
			count: sql<number>`count(*)`,
			avgMs: sql<number>`avg(duration_ms)`
		})
		.from(accessLogs)
		.groupBy(accessLogs.path)
		.orderBy(desc(sql`count(*)`))
		.limit(10);

	return {
		overview: {
			totalConversations: totalConversations.count,
			totalMessages: totalMessages.count,
			userMessages: userMessages.count,
			tokensPrompt: tokenTotals.prompt,
			tokensCompletion: tokenTotals.completion,
			avgResponseMs: Math.round(avgResponse.avgMs)
		},
		activity: activityFull,
		modelStats: modelStatsWithPerf,
		recentLogs,
		topPaths
	};
}
