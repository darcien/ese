<script lang="ts">
	import { SAMPLES } from '$lib/utils/sample-data';

	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();

	let selectedSampleId = $state('');

	function handleLoadSample() {
		const sample = SAMPLES.find((s) => s.id === selectedSampleId);
		if (sample) {
			value = sample.data;
		}
	}
</script>

<div class="input-container">
	<div class="input-header">
		<label for="sse-input" class="input-label">Event Stream Input</label>
		<div class="sample-controls">
			<label for="sample-select" class="sample-label">Sample:</label>
			<select id="sample-select" bind:value={selectedSampleId} class="sample-select">
				<option value="">Select...</option>
				{#each SAMPLES as sample (sample.id)}
					<option value={sample.id}>{sample.name}</option>
				{/each}
			</select>
			<button
				onclick={handleLoadSample}
				disabled={!selectedSampleId}
				class="load-button"
				class:disabled={!selectedSampleId}
			>
				Load
			</button>
		</div>
	</div>

	<textarea
		id="sse-input"
		bind:value
		placeholder="event: message&#10;data: Hello, world!&#10;id: 1&#10;&#10;data: Another message&#10;id: 2"
		rows={20}
		class="sse-textarea"
	></textarea>
</div>

<style>
	.input-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 0.5rem;
	}

	.input-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #3a3a3a;
	}

	.input-label {
		font-weight: 600;
		font-size: 0.875rem;
		color: #e0e0e0;
		letter-spacing: 0.3px;
	}

	.sample-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sample-label {
		font-size: 0.75rem;
		color: #888;
		white-space: nowrap;
	}

	.sample-select {
		padding: 0.25rem 0.5rem;
		background-color: #2a2a2a;
		color: #e0e0e0;
		border: 1px solid #3a3a3a;
		border-radius: 3px;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.sample-select:hover {
		border-color: #4a4a4a;
		background-color: #333;
	}

	.sample-select:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
	}

	.load-button {
		padding: 0.25rem 0.75rem;
		background-color: #0066cc;
		color: #ffffff;
		border: 1px solid #0066cc;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.load-button:hover:not(.disabled) {
		background-color: #0052a3;
		border-color: #0052a3;
	}

	.load-button:active:not(.disabled) {
		background-color: #004080;
	}

	.load-button.disabled {
		background-color: #2a2a2a;
		border-color: #3a3a3a;
		color: #666;
		cursor: not-allowed;
	}

	.sse-textarea {
		flex: 1;
		width: 100%;
		min-width: 60ch;
		padding: 0.75rem;
		background-color: #252525;
		color: #e0e0e0;
		border: 1px solid #3a3a3a;
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.5;
		resize: none;
		transition: all 0.2s ease;
	}

	.sse-textarea:hover {
		border-color: #4a4a4a;
	}

	.sse-textarea:focus {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.15);
	}

	.sse-textarea::placeholder {
		color: #555;
		font-style: italic;
	}

	/* Scrollbar Styling */
	.sse-textarea::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.sse-textarea::-webkit-scrollbar-track {
		background: #1a1a1a;
	}

	.sse-textarea::-webkit-scrollbar-thumb {
		background: #3a3a3a;
		border-radius: 4px;
	}

	.sse-textarea::-webkit-scrollbar-thumb:hover {
		background: #4a4a4a;
	}
</style>
