<script lang="ts">
	let { data } = $props();

	const { overview, activity, modelStats, recentLogs, topPaths } = data;

	const maxActivity = Math.max(...activity.map((d) => d.count), 1);

	function fmtMs(ms: number) {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function fmtNum(n: number) {
		return n.toLocaleString();
	}

	function shortDay(iso: string) {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function statusColor(status: number) {
		if (status < 300) return 'text-emerald-400';
		if (status < 400) return 'text-sky-400';
		if (status < 500) return 'text-amber-400';
		return 'text-red-400';
	}

	function methodColor(method: string) {
		const map: Record<string, string> = {
			GET: 'text-sky-400',
			POST: 'text-violet-400',
			DELETE: 'text-red-400',
			PATCH: 'text-amber-400'
		};
		return map[method] ?? 'text-white/50';
	}
</script>

<div class="h-full overflow-y-auto">
	<div class="max-w-5xl mx-auto px-6 py-8 space-y-8">

		<!-- Header -->
		<div>
			<h1 class="text-xl font-semibold text-white">Analytics</h1>
			<p class="text-white/40 text-sm mt-0.5">Usage stats and access logs</p>
		</div>

		<!-- Overview cards -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
			{#each [
				{ label: 'Conversations', value: fmtNum(overview.totalConversations) },
				{ label: 'Messages', value: fmtNum(overview.totalMessages) },
				{ label: 'Your Messages', value: fmtNum(overview.userMessages) },
				{ label: 'Prompt Tokens', value: fmtNum(overview.tokensPrompt) },
				{ label: 'Output Tokens', value: fmtNum(overview.tokensCompletion) },
				{ label: 'Avg Response', value: fmtMs(overview.avgResponseMs) }
			] as card}
				<div class="bg-white/4 border border-white/8 rounded-xl p-4">
					<p class="text-white/35 text-xs mb-1">{card.label}</p>
					<p class="text-white text-lg font-semibold">{card.value}</p>
				</div>
			{/each}
		</div>

		<!-- Activity chart + Model performance side by side -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

			<!-- Activity bar chart -->
			<div class="bg-white/4 border border-white/8 rounded-xl p-5">
				<h2 class="text-sm font-medium text-white/80 mb-4">Messages — last 14 days</h2>
				<div class="flex items-end gap-1 h-28">
					{#each activity as day}
						<div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
							<div
								class="w-full bg-violet-500/70 hover:bg-violet-400 rounded-sm transition-colors"
								style="height: {day.count === 0 ? '2px' : `${Math.max(4, (day.count / maxActivity) * 100)}%`}; opacity: {day.count === 0 ? 0.2 : 1}"
							></div>
							<!-- Tooltip -->
							<div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/10
								text-white/80 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
								{day.count}
							</div>
						</div>
					{/each}
				</div>
				<div class="flex justify-between mt-2">
					<span class="text-white/25 text-xs">{shortDay(activity[0].day)}</span>
					<span class="text-white/25 text-xs">{shortDay(activity[activity.length - 1].day)}</span>
				</div>
			</div>

			<!-- Model stats -->
			<div class="bg-white/4 border border-white/8 rounded-xl p-5">
				<h2 class="text-sm font-medium text-white/80 mb-4">Model Performance</h2>
				{#if modelStats.length === 0}
					<p class="text-white/25 text-sm">No data yet</p>
				{:else}
					<div class="space-y-3">
						{#each modelStats as m}
							<div class="flex items-center justify-between gap-4">
								<div class="min-w-0">
									<p class="text-white/80 text-sm font-medium truncate">{m.model}</p>
									<p class="text-white/30 text-xs">
										{fmtNum(m.conversations)} chats · {fmtNum(m.messages)} responses
									</p>
								</div>
								<div class="text-right shrink-0">
									<p class="text-violet-400 text-sm font-semibold">{m.tokPerSec} tok/s</p>
									<p class="text-white/30 text-xs">{fmtMs(Math.round(m.avgDurationMs))} avg</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Top paths -->
		<div class="bg-white/4 border border-white/8 rounded-xl p-5">
			<h2 class="text-sm font-medium text-white/80 mb-4">Top Endpoints</h2>
			{#if topPaths.length === 0}
				<p class="text-white/25 text-sm">No logs yet</p>
			{:else}
				<div class="space-y-2">
					{#each topPaths as p}
						{@const maxCount = topPaths[0].count}
						<div class="flex items-center gap-3">
							<span class="text-white/50 font-mono text-xs w-36 truncate shrink-0">{p.path}</span>
							<div class="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
								<div
									class="h-full bg-violet-500/60 rounded-full"
									style="width: {(p.count / maxCount) * 100}%"
								></div>
							</div>
							<span class="text-white/40 text-xs w-10 text-right shrink-0">{fmtNum(p.count)}</span>
							<span class="text-white/25 text-xs w-14 text-right shrink-0">{fmtMs(Math.round(p.avgMs))}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Access log -->
		<div class="bg-white/4 border border-white/8 rounded-xl p-5">
			<h2 class="text-sm font-medium text-white/80 mb-4">Recent Access Log</h2>
			{#if recentLogs.length === 0}
				<p class="text-white/25 text-sm">No logs yet</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-xs">
						<thead>
							<tr class="text-white/30 border-b border-white/8">
								<th class="text-left pb-2 font-medium pr-4">Time</th>
								<th class="text-left pb-2 font-medium pr-4">Method</th>
								<th class="text-left pb-2 font-medium pr-4">Path</th>
								<th class="text-left pb-2 font-medium pr-4">Status</th>
								<th class="text-right pb-2 font-medium">Duration</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-white/4">
							{#each recentLogs as log}
								<tr class="hover:bg-white/3 transition-colors">
									<td class="py-1.5 pr-4 text-white/30 font-mono whitespace-nowrap">
										{new Date(log.createdAt).toLocaleTimeString()}
									</td>
									<td class="py-1.5 pr-4 font-mono font-medium {methodColor(log.method)}">
										{log.method}
									</td>
									<td class="py-1.5 pr-4 text-white/60 font-mono max-w-xs truncate">
										{log.path}
									</td>
									<td class="py-1.5 pr-4 font-mono {statusColor(log.status)}">
										{log.status}
									</td>
									<td class="py-1.5 text-right text-white/40 font-mono">
										{fmtMs(log.durationMs)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

	</div>
</div>
