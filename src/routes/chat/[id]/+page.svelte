<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';

	let { data } = $props();

	type Message = {
		id: string;
		role: 'user' | 'assistant' | 'system';
		content: string;
		createdAt: Date;
	};

	let messages = $state<Message[]>([...(data.messages as Message[])]);
	let input = $state('');
	let isStreaming = $state(false);
	let selectedModel = $state(data.conversation?.model ?? 'qwen2.5:7b');
	let streamingContent = $state('');
	let messagesEl = $state<HTMLElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let abortController = $state<AbortController | null>(null);

	// Re-sync messages when navigating between chats
	$effect(() => {
		messages = data.messages as Message[];
		streamingContent = '';
		isStreaming = false;
	});

	async function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
		await tick();
		if (messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	}

	async function send() {
		const text = input.trim();
		if (!text || isStreaming) return;

		input = '';
		autoResize();

		// Optimistically add user message
		messages = [
			...messages,
			{
				id: crypto.randomUUID(),
				role: 'user',
				content: text,
				createdAt: new Date()
			}
		];

		isStreaming = true;
		streamingContent = '';
		await scrollToBottom('instant');

		abortController = new AbortController();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: data.conversation.id,
					content: text,
					model: selectedModel
				}),
				signal: abortController.signal
			});

			if (!res.ok) throw new Error('Chat request failed');

			const reader = res.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					try {
						const json = JSON.parse(line.slice(6));
						if (json.content) {
							streamingContent += json.content;
							await scrollToBottom('instant');
						}
						if (json.done) {
							messages = [
								...messages,
								{
									id: json.id,
									role: 'assistant',
									content: streamingContent,
									createdAt: new Date()
								}
							];
							streamingContent = '';
						}
					} catch {
						// skip
					}
				}
			}
		} catch (e: unknown) {
			if (e instanceof Error && e.name !== 'AbortError') {
				streamingContent = '';
				messages = [
					...messages,
					{
						id: crypto.randomUUID(),
						role: 'assistant',
						content: '⚠️ Error: Could not get a response from Ollama.',
						createdAt: new Date()
					}
				];
			}
		} finally {
			isStreaming = false;
			abortController = null;
			await scrollToBottom();
			await invalidateAll();
			textareaEl?.focus();
		}
	}

	function stopStreaming() {
		abortController?.abort();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
	}

	// Render markdown-ish content (simple, no full markdown lib needed)
	function renderContent(text: string): string {
		return text
			// Code blocks
			.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
			// Inline code
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			// Bold
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			// Italic
			.replace(/\*([^*]+)\*/g, '<em>$1</em>')
			// Headers
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			// Lists
			.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
			.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
			// Numbered lists
			.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
			// Paragraphs (double newlines)
			.replace(/\n\n/g, '</p><p>')
			// Single newlines
			.replace(/\n/g, '<br>');
	}
</script>

<div class="flex flex-col h-full">
	<!-- Top bar -->
	<header class="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
		<div class="flex items-center gap-3">
			<h2 class="text-sm font-medium text-white/80 truncate max-w-xs">
				{data.conversation.title}
			</h2>
		</div>
		<select
			bind:value={selectedModel}
			class="bg-white/6 hover:bg-white/10 text-white/70 text-xs px-3 py-1.5
				rounded-lg border border-white/10 outline-none cursor-pointer transition-colors"
		>
			{#each data.models as model}
				<option value={model}>{model}</option>
			{/each}
		</select>
	</header>

	<!-- Messages -->
	<div bind:this={messagesEl} class="flex-1 overflow-y-auto py-6">
		{#if messages.length === 0 && !isStreaming}
			<div class="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
				<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20
					border border-violet-500/20 flex items-center justify-center">
					<svg class="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
					</svg>
				</div>
				<div>
					<p class="text-white/60 font-medium">Start a conversation</p>
					<p class="text-white/25 text-sm mt-1">Chatting with <span class="text-violet-400">{selectedModel}</span></p>
				</div>
			</div>
		{:else}
			<div class="max-w-3xl mx-auto px-4 space-y-6">
				{#each messages as msg}
					{#if msg.role === 'user'}
						<div class="flex justify-end">
							<div class="max-w-[80%] bg-violet-600/90 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
								{msg.content}
							</div>
						</div>
					{:else if msg.role === 'assistant'}
						<div class="flex gap-3">
							<div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600
								flex items-center justify-center shrink-0 mt-0.5">
								<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
								</svg>
							</div>
							<div class="flex-1 prose-chat text-white/90 text-sm leading-relaxed min-w-0">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html renderContent(msg.content)}
							</div>
						</div>
					{/if}
				{/each}

				<!-- Streaming message -->
				{#if isStreaming}
					<div class="flex gap-3">
						<div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600
							flex items-center justify-center shrink-0 mt-0.5">
							<svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
							</svg>
						</div>
						<div class="flex-1 prose-chat text-white/90 text-sm leading-relaxed min-w-0">
							{#if streamingContent}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html renderContent(streamingContent)}
							{:else}
								<span class="inline-flex gap-1 items-center py-1">
									<span class="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
									<span class="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
									<span class="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
								</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Input area -->
	<div class="shrink-0 px-4 pb-5 pt-3">
		<div class="max-w-3xl mx-auto">
			<div class="relative bg-white/6 border border-white/12 rounded-2xl
				focus-within:border-violet-500/50 focus-within:bg-white/8 transition-colors">
				<textarea
					bind:this={textareaEl}
					bind:value={input}
					onkeydown={onKeydown}
					oninput={autoResize}
					placeholder="Message {selectedModel}..."
					rows="1"
					class="w-full bg-transparent text-white placeholder-white/25 text-sm
						px-4 pt-3.5 pb-3 pr-24 resize-none outline-none leading-relaxed
						max-h-48 overflow-y-auto"
				></textarea>

				<div class="absolute bottom-2.5 right-3 flex items-center gap-2">
					{#if isStreaming}
						<button
							onclick={stopStreaming}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10
								hover:bg-white/15 text-white/60 text-xs transition-colors"
						>
							<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
								<rect x="6" y="6" width="12" height="12" rx="2"/>
							</svg>
							Stop
						</button>
					{:else}
						<button
							onclick={send}
							disabled={!input.trim()}
							aria-label="Send message"
							class="p-2 rounded-xl transition-all
								{input.trim()
									? 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm'
									: 'bg-white/6 text-white/20 cursor-not-allowed'}"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
							</svg>
						</button>
					{/if}
				</div>
			</div>
			<p class="text-center text-white/15 text-xs mt-2">
				Enter to send · Shift+Enter for new line
			</p>
		</div>
	</div>
</div>
