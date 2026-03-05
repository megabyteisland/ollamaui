<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	type Conversation = {
		id: string;
		title: string;
		model: string;
		createdAt: Date;
		updatedAt: Date;
	};

	let { conversations = [] }: { conversations: Conversation[] } = $props();

	let search = $state('');

	const filtered = $derived(
		conversations.filter((c) =>
			c.title.toLowerCase().includes(search.toLowerCase())
		)
	);

	const currentId = $derived($page.params.id);

	async function newChat() {
		const res = await fetch('/api/conversations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});
		const conv = await res.json();
		await invalidateAll();
		goto(`/chat/${conv.id}`);
	}

	async function deleteConv(e: MouseEvent, id: string) {
		e.preventDefault();
		e.stopPropagation();
		await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
		await invalidateAll();
		if (currentId === id) goto('/');
	}

	function formatDate(d: Date | string) {
		const date = new Date(d);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / 86400000);
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString();
	}

	// Group conversations by date label
	const grouped = $derived(() => {
		const groups: Record<string, Conversation[]> = {};
		for (const conv of filtered) {
			const label = formatDate(conv.updatedAt);
			if (!groups[label]) groups[label] = [];
			groups[label].push(conv);
		}
		return groups;
	});
</script>

<aside class="flex flex-col h-full w-64 bg-[#1a1a2e] border-r border-white/8 shrink-0">
	<!-- Header -->
	<div class="p-3 border-b border-white/8">
		<div class="flex items-center gap-2 mb-3 px-1">
			<div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
				<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
			</div>
			<span class="font-semibold text-white text-sm">OllamaUI</span>
		</div>

		<button
			onclick={newChat}
			class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
				bg-violet-600 hover:bg-violet-500 text-white transition-colors duration-150"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			New Chat
		</button>
	</div>

	<!-- Search -->
	<div class="px-3 py-2">
		<div class="relative">
			<svg class="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				placeholder="Search chats..."
				bind:value={search}
				class="w-full bg-white/5 text-white/70 placeholder-white/25 text-xs
					pl-8 pr-3 py-2 rounded-lg border border-white/8 outline-none
					focus:border-violet-500/50 focus:bg-white/8 transition-colors"
			/>
		</div>
	</div>

	<!-- Chat list -->
	<nav class="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
		{#if filtered.length === 0}
			<p class="text-white/25 text-xs text-center mt-8">No chats yet</p>
		{:else}
			{#each Object.entries(grouped()) as [label, convs]}
				<div>
					<p class="text-white/30 text-xs font-medium px-2 py-1">{label}</p>
					{#each convs as conv}
						<a
							href="/chat/{conv.id}"
							class="group flex items-center gap-2 px-2 py-2 rounded-lg text-sm
								transition-colors duration-100 relative
								{currentId === conv.id
									? 'bg-white/10 text-white'
									: 'text-white/60 hover:bg-white/6 hover:text-white/90'}"
						>
							<span class="flex-1 truncate">{conv.title}</span>
							<button
								onclick={(e) => deleteConv(e, conv.id)}
								class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400
									transition-opacity shrink-0 text-white/40"
								title="Delete"
							>
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</a>
					{/each}
				</div>
			{/each}
		{/if}
	</nav>
</aside>
