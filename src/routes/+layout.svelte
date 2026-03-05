<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>OllamaUI</title>
</svelte:head>

<div class="flex h-screen bg-[#0f0f1a] text-white overflow-hidden">
	<Sidebar conversations={data.conversations} />
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>
