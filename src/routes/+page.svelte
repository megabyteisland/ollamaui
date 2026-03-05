<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';

	async function startNewChat() {
		const res = await fetch('/api/conversations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});
		const conv = await res.json();
		await invalidateAll();
		goto(`/chat/${conv.id}`);
	}
</script>

<div class="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
	<div class="space-y-3">
		<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
			<svg class="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
			</svg>
		</div>
		<h1 class="text-3xl font-semibold text-white">OllamaUI</h1>
		<p class="text-white/40 text-base max-w-sm">
			Chat with your local Ollama models. Fast, private, and runs entirely on your machine.
		</p>
	</div>

	<button
		onclick={startNewChat}
		class="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500
			text-white font-medium rounded-xl transition-colors shadow-lg shadow-violet-500/20"
	>
		<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		Start a new chat
	</button>
</div>
