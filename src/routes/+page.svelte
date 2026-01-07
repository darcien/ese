<script lang="ts">
	import SSEInput from '$lib/components/SSEInput.svelte';
	import SSETable from '$lib/components/SSETable.svelte';
	import { parseSSEStream } from '$lib/utils/sse-parser';
	import type { SSEEvent } from '$lib/types/sse';
	import { SvelteSet } from 'svelte/reactivity';

	let rawInput = $state('');
	let events = $state<SSEEvent[]>([]);
	let parseErrors = $state<string[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let isLeftPanelCollapsed = $state(false);
	let hideEmptyColumns = $state(true);
	let parseJSON = $state(true);
	let prettyPrintJSON = $state(true);
	let expandedRows = new SvelteSet<number>();

	// Derive checkbox state from expanded rows
	let allExpanded = $derived(events.length > 0 && expandedRows.size === events.length);
	let someExpanded = $derived(expandedRows.size > 0 && expandedRows.size < events.length);

	// Auto-parse when rawInput changes (for HMR, reload, sample loading)
	$effect(() => {
		// Explicitly read rawInput to track it as a dependency
		const currentInput = rawInput;

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Debounce parsing (300ms delay)
		debounceTimer = setTimeout(() => {
			if (currentInput.trim().length === 0) {
				events = [];
				parseErrors = [];
				return;
			}

			const result = parseSSEStream(currentInput);
			events = result.events;
			parseErrors = result.errors;
		}, 300);
	});

	function toggleLeftPanel() {
		isLeftPanelCollapsed = !isLeftPanelCollapsed;
	}

	function handleExpandAllClick() {
		if (allExpanded) {
			// Collapse all
			expandedRows.clear();
		} else {
			// Expand all
			expandedRows.clear();
			events.forEach((e) => expandedRows.add(e.sequence));
		}
	}

	function handleToggleRow(sequence: number) {
		if (expandedRows.has(sequence)) {
			expandedRows.delete(sequence);
		} else {
			expandedRows.add(sequence);
		}
	}
</script>

<svelte:head>
	<title>ese - event stream explorer</title>
</svelte:head>

<div class="app-container">
	<!-- Header -->
	<header class="app-header">
		<h1>ese - event stream explorer</h1>
	</header>

	<!-- Main Content Area -->
	<main class="app-main">
		<!-- Left Panel (Collapsible) -->
		<aside class="left-panel" class:collapsed={isLeftPanelCollapsed}>
			{#if !isLeftPanelCollapsed}
				<div class="panel-content">
					<SSEInput bind:value={rawInput} />

					{#if parseErrors.length > 0}
						<div class="error-box">
							<strong>Parsing Errors:</strong>
							<ul>
								{#each parseErrors as error, index (index)}
									<li>{error}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}

			<button
				class="collapse-toggle"
				onclick={toggleLeftPanel}
				aria-label={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
				title={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
			>
				{#if isLeftPanelCollapsed}
					<span class="toggle-icon">›</span>
				{:else}
					<span class="toggle-icon">‹</span>
				{/if}
			</button>
		</aside>

		<!-- Right Panel (Table) -->
		<section class="right-panel">
			{#if rawInput.trim().length === 0}
				<div class="empty-state">
					<p>no input</p>
					<p>paste stream or load sample</p>
				</div>
			{:else if events.length === 0 && parseErrors.length === 0}
				<div class="empty-state">
					<p>parsing stream...</p>
				</div>
			{:else}
				<SSETable
					{events}
					bind:hideEmptyColumns
					{parseJSON}
					bind:prettyPrintJSON
					{expandedRows}
					onToggleRow={handleToggleRow}
				/>
			{/if}
		</section>
	</main>

	<!-- Status Bar -->
	<footer class="status-bar">
		<div class="status-left">
			<span class="status-item">
				Events: <strong>{events.length}</strong>
			</span>
			{#if parseErrors.length > 0}
				<span class="status-item status-error">
					Errors: <strong>{parseErrors.length}</strong>
				</span>
			{/if}
		</div>
		<div class="status-center"></div>
		<div class="status-right">
			<label class="status-checkbox" title="Expand all table rows to show full content">
				<input
					type="checkbox"
					checked={allExpanded}
					indeterminate={someExpanded}
					onclick={handleExpandAllClick}
				/>
				Expand all
			</label>

			<label class="status-checkbox">
				<input type="checkbox" bind:checked={hideEmptyColumns} />
				Hide empty columns
			</label>

			<label
				class="status-checkbox"
				title="Parse data field as JSON and display each field as a column"
			>
				<input type="checkbox" bind:checked={parseJSON} />
				Parse data as JSON
			</label>

			<label class="status-checkbox" title="Pretty print JSON values in table cells">
				<input type="checkbox" bind:checked={prettyPrintJSON} />
				Pretty print JSON
			</label>
		</div>
	</footer>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		background-color: #1a1a1a;
	}

	/* Header */
	.app-header {
		flex-shrink: 0;
		height: 36px;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		background-color: #252525;
		border-bottom: 1px solid #3a3a3a;
	}

	.app-header h1 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 0.5px;
		line-height: 1;
		padding-bottom: 2px;
	}

	/* Main Content */
	.app-main {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-height: 0;
	}

	/* Left Panel */
	.left-panel {
		position: relative;
		flex-shrink: 0;
		width: calc(60ch + 2rem);
		background-color: #1e1e1e;
		border-right: 1px solid #3a3a3a;
		display: flex;
		transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}

	.left-panel.collapsed {
		width: 40px;
	}

	.panel-content {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.collapse-toggle {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 24px;
		height: 60px;
		background-color: #2a2a2a;
		border: 1px solid #3a3a3a;
		border-right: none;
		border-radius: 4px 0 0 4px;
		color: #888;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		z-index: 10;
	}

	.collapse-toggle:hover {
		background-color: #333;
		color: #fff;
	}

	.collapse-toggle:active {
		background-color: #3a3a3a;
	}

	.toggle-icon {
		font-size: 1.5rem;
		line-height: 1;
		user-select: none;
	}

	/* Right Panel */
	.right-panel {
		flex: 1;
		background-color: #1a1a1a;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		height: 100%;
		color: #666;
		font-size: 1rem;
	}

	.empty-state p {
		margin: 0;
	}

	/* Error Box */
	.error-box {
		margin-top: 0.75rem;
		padding: 0.75rem;
		border: 1px solid #cc4444;
		background-color: #2a1a1a;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.error-box strong {
		color: #ff6b6b;
	}

	.error-box ul {
		margin: 0.5rem 0 0 0;
		padding-left: 1.5rem;
		color: #ffaaaa;
	}

	.error-box li {
		margin: 0.25rem 0;
	}

	/* Status Bar */
	.status-bar {
		flex-shrink: 0;
		height: 32px;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: #252525;
		border-top: 1px solid #3a3a3a;
		font-size: 0.75rem;
		color: #888;
	}

	.status-left,
	.status-center,
	.status-right {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.status-center {
		flex: 1;
		justify-content: center;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		line-height: 1;
	}

	.status-item strong {
		color: #fff;
		font-weight: 600;
	}

	.status-error strong {
		color: #ff6b6b;
	}

	/* Status bar controls */
	.status-checkbox {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #888;
		cursor: pointer;
		user-select: none;
		transition: color 0.2s ease;
	}

	.status-checkbox:hover {
		color: #aaa;
	}

	.status-checkbox input[type='checkbox'] {
		cursor: pointer;
		accent-color: #0066cc;
	}
</style>
