import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { accessLogs } from '$lib/server/db/schema';
import { randomUUID } from 'crypto';

// Paths to skip logging (noise / static assets)
const SKIP_PREFIXES = ['/_app/', '/favicon', '/__data'];

export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const response = await resolve(event);
	const durationMs = Date.now() - start;

	const path = event.url.pathname;
	const skip = SKIP_PREFIXES.some((p) => path.startsWith(p));

	if (!skip) {
		// Fire-and-forget — don't block the response
		setImmediate(() => {
			try {
				db.insert(accessLogs)
					.values({
						id: randomUUID(),
						method: event.request.method,
						path,
						status: response.status,
						durationMs,
						userAgent: event.request.headers.get('user-agent') ?? null,
						createdAt: new Date()
					})
					.run();
			} catch {
				// ignore logging failures
			}
		});
	}

	return response;
};
