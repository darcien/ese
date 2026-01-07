<script lang="ts">
	import type { SSEEvent } from '$lib/types/sse';
	import type { Api, Config, ConfigColumns } from 'datatables.net';
	import DataTable from 'datatables.net-dt';
	import 'datatables.net-colreorder-dt';
	import 'datatables.net-fixedheader-dt';
	import 'datatables.net-fixedcolumns-dt';

	// Import DataTables CSS
	import 'datatables.net-dt/css/dataTables.dataTables.css';
	import 'datatables.net-colreorder-dt/css/colReorder.dataTables.css';
	import 'datatables.net-fixedheader-dt/css/fixedHeader.dataTables.css';
	import 'datatables.net-fixedcolumns-dt/css/fixedColumns.dataTables.css';

	interface TableConfig {
		events: SSEEvent[];
		showEvent: boolean;
		showId: boolean;
		showRetry: boolean;
		parseJSON: boolean;
		prettyPrintJSON: boolean;
		hasAnyJSON: boolean;
		jsonColumns: string[];
		expandedRows: Set<number>;
		expandedRowsSize: number;
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function buildChildFieldHTML(
		label: string,
		value: string,
		sequence: number,
		field: string
	): string {
		return `
			<div class="child-field">
				<div class="child-field-header">
					<span class="child-label">${escapeHtml(label)}:</span>
					<button class="copy-btn" data-sequence="${sequence}" data-field="${escapeHtml(field)}">Copy</button>
				</div>
				<pre class="child-value">${escapeHtml(value)}</pre>
			</div>`;
	}

	// Truncate string to first line or max chars
	function truncateForPreview(value: string, maxChars: number = 100): string {
		const firstLine = value.split('\n')[0];
		if (firstLine.length <= maxChars) {
			return firstLine;
		}
		return firstLine.slice(0, maxChars) + '…';
	}

	function formatValueForDisplay(value: unknown, prettyPrint: boolean = false): string {
		if (value === null) return 'null';
		if (value === undefined) return '-';
		if (typeof value === 'boolean') return value.toString();
		if (typeof value === 'number') return value.toString();
		if (typeof value === 'string') return value;
		return prettyPrint ? JSON.stringify(value, null, 2) : JSON.stringify(value);
	}

	// Format value for collapsed row preview (never pretty print)
	function formatValueForPreview(value: unknown): string {
		const formatted = formatValueForDisplay(value, false);
		return truncateForPreview(formatted);
	}

	interface Props {
		events: SSEEvent[];
		hideEmptyColumns?: boolean;
		parseJSON: boolean;
		prettyPrintJSON?: boolean;
		expandedRows: Set<number>;
		onToggleRow: (sequence: number) => void;
	}

	let {
		events,
		hideEmptyColumns = $bindable(true),
		parseJSON,
		prettyPrintJSON = $bindable(true),
		expandedRows,
		onToggleRow
	}: Props = $props();

	// Check if columns have data
	let hasAnyEvent = $derived(
		events.some((event) => event.event !== undefined && event.event !== null)
	);
	let hasAnyId = $derived(events.some((event) => event.id !== undefined && event.id !== null));
	let hasAnyRetry = $derived(
		events.some((event) => event.retry !== undefined && event.retry !== null)
	);
	let hasAnyJSON = $derived(events.some((event) => event.parsedData !== undefined));

	// Determine which columns to show
	let showEvent = $derived(!hideEmptyColumns || hasAnyEvent);
	let showId = $derived(!hideEmptyColumns || hasAnyId);
	let showRetry = $derived(!hideEmptyColumns || hasAnyRetry);

	// Get all top-level JSON keys across all events
	let jsonColumns = $derived.by(() => {
		if (!parseJSON || !hasAnyJSON) return [];

		const keysMap: Record<string, boolean> = {};
		for (const event of events) {
			if (event.parsedData) {
				Object.keys(event.parsedData).forEach((key) => {
					keysMap[key] = true;
				});
			}
		}
		return Object.keys(keysMap).sort();
	});

	// Derive the full table configuration so the action can react to changes
	let tableConfig = $derived({
		events,
		showEvent,
		showId,
		showRetry,
		parseJSON,
		prettyPrintJSON,
		hasAnyJSON,
		jsonColumns,
		expandedRows,
		expandedRowsSize: expandedRows.size
	});

	// Structural config determines if table needs full recreation
	let structuralConfig = $derived({
		showEvent,
		showId,
		showRetry,
		parseJSON,
		hasAnyJSON,
		jsonColumns: jsonColumns.join(','),
		eventsLength: events.length
	});

	let structuralKey = $derived(JSON.stringify(structuralConfig));

	// Build columns configuration from current config
	function buildColumns(config: TableConfig): ConfigColumns[] {
		const cols: ConfigColumns[] = [
			// Toggle column for expand/collapse
			{
				title: '',
				data: null,
				defaultContent: '',
				className: 'dt-control',
				orderable: false,
				searchable: false,
				width: '30px'
			},
			{
				title: '#',
				data: (row: SSEEvent) => row.sequence,
				className: 'dt-center dt-sequence'
			}
		];

		if (config.showEvent) {
			cols.push({
				title: 'Event Type',
				data: (row: SSEEvent) => row.event || '(default)'
			});
		}

		if (config.parseJSON && config.hasAnyJSON && config.jsonColumns.length > 0) {
			for (const col of config.jsonColumns) {
				cols.push({
					title: col,
					data: (row: SSEEvent) => {
						if (row.parsedData && col in row.parsedData) {
							// Use preview format (no pretty print) for main row
							return formatValueForPreview(row.parsedData[col]);
						}
						return '-';
					}
				});
			}
		} else {
			cols.push({
				title: 'Data',
				data: (row: SSEEvent) => truncateForPreview(row.data),
				className: 'dt-data'
			});
		}

		if (config.showId) {
			cols.push({
				title: 'ID',
				data: (row: SSEEvent) => row.id || '-'
			});
		}

		if (config.showRetry) {
			cols.push({
				title: 'Retry',
				data: (row: SSEEvent) => (row.retry ? `${row.retry}ms` : '-')
			});
		}

		return cols;
	}

	type ChildField = {
		label: string;
		value: string;
		field: string;
	};

	const formatDisplayData = (data: SSEEvent, prettyPrint: boolean): string => {
		if (!prettyPrint) return data.data;

		try {
			return JSON.stringify(JSON.parse(data.data), null, 2);
		} catch {
			return data.data;
		}
	};

	const getChildFields = (data: SSEEvent, config: TableConfig): ChildField[] => {
		if (config.parseJSON && config.hasAnyJSON && data.parsedData) {
			return config.jsonColumns
				.filter((col) => data.parsedData && col in data.parsedData)
				.map((col) => ({
					label: col,
					value: formatValueForDisplay(data.parsedData![col], config.prettyPrintJSON),
					field: col
				}));
		}

		return [
			{
				label: 'Data',
				value: formatDisplayData(data, config.prettyPrintJSON),
				field: 'data'
			}
		];
	};

	const formatChildRow = (data: SSEEvent, config: TableConfig): string => {
		const fields = getChildFields(data, config);
		const fieldsHTML = fields
			.map(({ label, value, field }) => buildChildFieldHTML(label, value, data.sequence, field))
			.join('');

		return `<div class="child-row-content">${fieldsHTML}</div>`;
	};

	// Svelte action for DataTable - handles lifecycle tied to DOM element
	function datatable(node: HTMLTableElement, config: TableConfig) {
		let dt: Api<SSEEvent> | null = null;
		let currentConfig = config;
		let currentStructuralKey = structuralKey;

		function init(cfg: TableConfig) {
			if (cfg.events.length === 0) return;

			// Calculate available height from container
			const container = node.closest('.table-container') as HTMLElement | null;
			const availableHeight = container ? container.clientHeight - 60 : 400;

			try {
				const dtConfig: Config = {
					data: cfg.events,
					columns: buildColumns(cfg),
					paging: false,
					order: [[1, 'asc']], // Order by sequence column (index 1 now, after toggle column)
					autoWidth: false,
					scrollY: `${availableHeight}px`,
					scrollX: true,
					scrollCollapse: false,
					deferRender: true,
					dom: '<"top"f>rt',
					colReorder: {
						columns: ':not(.dt-control)' // Prevent reordering the toggle column
					},
					fixedHeader: {
						header: true,
						headerOffset: 48
					},
					fixedColumns: {
						left: 2
					},
					language: {
						search: 'Search:',
						lengthMenu: 'Show _MENU_',
						info: '_START_-_END_ of _TOTAL_',
						infoEmpty: 'No events',
						infoFiltered: '(filtered from _MAX_)',
						zeroRecords: 'No matching events',
						emptyTable: 'No events found'
					}
				};

				dt = new DataTable(node, dtConfig);

				// Add click handler for expand/collapse
				const tbody = node.querySelector('tbody');
				if (tbody) {
					tbody.addEventListener('click', handleRowClick);
					tbody.addEventListener('click', handleCopyClick);
				}

				// Sync row states with expandedRows Set
				syncRowStates(cfg);
			} catch (error) {
				console.error('Failed to initialize DataTable:', error);
			}
		}

		function syncRowStates(cfg: TableConfig) {
			if (!dt) return;
			try {
				const rowCount = dt.rows().count();
				for (let i = 0; i < rowCount; i++) {
					const row = dt.row(i);
					const rowData = row.data() as SSEEvent;
					const shouldBeExpanded = cfg.expandedRows.has(rowData.sequence);
					const isExpanded = row.child.isShown();

					if (shouldBeExpanded && !isExpanded) {
						row.child(formatChildRow(rowData, cfg)).show();
						const tr = row.node();
						if (tr) tr.classList.add('dt-hasChild');
					} else if (!shouldBeExpanded && isExpanded) {
						row.child.hide();
						const tr = row.node();
						if (tr) tr.classList.remove('dt-hasChild');
					} else if (shouldBeExpanded && isExpanded) {
						// Re-render child content for already-expanded rows
						row.child(formatChildRow(rowData, cfg)).show();
					}
				}
			} catch (error) {
				console.error('Error syncing row states:', error);
			}
		}

		function handleRowClick(e: Event) {
			const target = e.target as HTMLElement;
			const td = target.closest('td.dt-control');
			if (!td || !dt) return;

			const tr = td.closest('tr');
			if (!tr) return;

			const row = dt.row(tr);
			const rowData = row.data() as SSEEvent;

			// Call parent callback to update state
			onToggleRow(rowData.sequence);
		}

		function handleCopyClick(e: Event) {
			const target = e.target as HTMLElement;
			if (!target.classList.contains('copy-btn')) return;

			e.stopPropagation();

			const sequenceStr = target.getAttribute('data-sequence');
			const field = target.getAttribute('data-field');
			if (!sequenceStr || !field) return;

			const sequence = parseInt(sequenceStr, 10);
			const event = currentConfig.events.find((evt) => evt.sequence === sequence);
			if (!event) return;

			let textToCopy: string;
			if (field === 'data') {
				textToCopy = event.data;
			} else if (event.parsedData && field in event.parsedData) {
				textToCopy = formatValueForDisplay(event.parsedData[field], false);
			} else {
				return;
			}

			navigator.clipboard
				.writeText(textToCopy)
				.then(() => {
					const originalText = target.textContent;
					target.textContent = 'Copied!';
					setTimeout(() => {
						target.textContent = originalText;
					}, 2000);
				})
				.catch((err) => {
					console.error('Failed to copy:', err);
				});
		}

		function destroy() {
			if (dt) {
				// Remove event listeners
				const tbody = node.querySelector('tbody');
				if (tbody) {
					tbody.removeEventListener('click', handleRowClick);
					tbody.removeEventListener('click', handleCopyClick);
				}

				try {
					dt.destroy(false);
				} catch (error) {
					console.error('Error destroying DataTable:', error);
				}
				dt = null;

				// Clear thead and tbody so DataTable can rebuild with correct columns
				const thead = node.querySelector('thead');
				const tbodyEl = node.querySelector('tbody');
				if (thead) thead.innerHTML = '<tr></tr>';
				if (tbodyEl) tbodyEl.innerHTML = '';
			}
		}

		// Initial setup
		init(config);

		return {
			update(newConfig: TableConfig) {
				// Check if structural config changed (requires full table recreation)
				if (structuralKey !== currentStructuralKey) {
					destroy();
					init(newConfig);
					currentConfig = newConfig;
					currentStructuralKey = structuralKey;
				} else if (dt && newConfig.events !== currentConfig.events) {
					// Events data changed but structure stayed the same - update data
					dt.clear();
					dt.rows.add(newConfig.events);
					dt.draw();
					syncRowStates(newConfig);
					currentConfig = newConfig;
				} else if (
					dt &&
					(newConfig.prettyPrintJSON !== currentConfig.prettyPrintJSON ||
						newConfig.expandedRowsSize !== currentConfig.expandedRowsSize)
				) {
					// Only UI state changed, just sync row states
					syncRowStates(newConfig);
					currentConfig = newConfig;
				}
			},
			destroy() {
				destroy();
			}
		};
	}
</script>

{#if events.length === 0}
	<div class="empty-table">
		<p>No events to display</p>
	</div>
{:else}
	<div class="table-container">
		<table use:datatable={tableConfig} class="display compact stripe hover">
			<thead>
				<tr></tr>
			</thead>
			<tbody></tbody>
		</table>
	</div>
{/if}

<style>
	.table-container {
		/* CSS Custom Properties for theming */
		--dt-bg-primary: #1a1a1a;
		--dt-bg-secondary: #1e1e1e;
		--dt-bg-elevated: #252525;
		--dt-bg-child: #151515;
		--dt-border-primary: #3a3a3a;
		--dt-border-secondary: #2a2a2a;
		--dt-border-subtle: #333;
		--dt-text-primary: #e0e0e0;
		--dt-text-secondary: #888;
		--dt-text-tertiary: #666;
		--dt-text-muted: #999;
		--dt-accent: #0066cc;
		--dt-accent-hover: #0080ff;
		--dt-accent-alpha: rgba(0, 102, 204, 0.15);

		width: 100%;
		height: 100%;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.table-container :global(.dataTables_wrapper) {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.table-container :global(.dataTables_wrapper .top) {
		flex-shrink: 0;
	}

	.table-container :global(.dataTables_scroll) {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.table-container :global(.dataTables_scrollHead) {
		flex-shrink: 0;
	}

	.table-container :global(.dataTables_scrollBody) {
		flex: 1;
		overflow: auto !important;
		min-height: 0;
	}

	.empty-table {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #666;
		font-style: italic;
	}

	/* DataTables Dark Theme - Scoped within table-container */
	.table-container :global(.dataTables_wrapper) {
		font-family: var(--font-mono);
		color: var(--dt-text-primary);
	}

	.table-container :global(.dataTables_wrapper .dataTables_filter) {
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
		color: var(--dt-text-secondary);
		float: right;
	}

	.table-container :global(.dataTables_wrapper .dataTables_filter input) {
		padding: 0.25rem 0.5rem;
		margin: 0 0.5rem;
		background-color: var(--dt-bg-secondary);
		color: var(--dt-text-primary);
		border: 1px solid var(--dt-border-primary);
		border-radius: 3px;
		font-size: 0.75rem;
		font-family: inherit;
	}

	.table-container :global(.dataTables_wrapper .dataTables_filter input:focus) {
		outline: none;
		border-color: var(--dt-accent);
		box-shadow: 0 0 0 2px var(--dt-accent-alpha);
	}

	/* Table Styling */
	.table-container :global(table.dataTable) {
		border-collapse: collapse;
		font-size: 0.8rem;
		width: 100%;
		background-color: var(--dt-bg-primary);
		color: var(--dt-text-primary);
		border: 1px solid var(--dt-border-primary);
	}

	.table-container :global(table.dataTable thead th) {
		font-weight: 600;
		background-color: var(--dt-bg-elevated);
		border: 1px solid var(--dt-border-primary);
		padding: 0.5rem;
		text-align: left;
		color: var(--dt-text-primary);
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.table-container :global(table.dataTable tbody td) {
		border: 1px solid var(--dt-border-secondary);
		padding: 0.5rem;
		vertical-align: top;
		background-color: var(--dt-bg-secondary);
		color: var(--dt-text-primary);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 300px;
	}

	.table-container :global(table.dataTable tbody td.dt-control) {
		background-color: var(--dt-bg-elevated);
	}

	/* Collapsed state: right-pointing arrow */
	.table-container :global(table.dataTable tbody td.dt-control::before) {
		border-left-color: var(--dt-text-secondary) !important;
	}

	.table-container :global(table.dataTable tbody td.dt-control:hover::before) {
		border-left-color: #fff !important;
	}

	/* Expanded state: down-pointing arrow */
	.table-container :global(table.dataTable tbody tr.dt-hasChild td.dt-control::before) {
		border-top-color: var(--dt-accent) !important;
		border-left-color: transparent !important;
		border-right-color: transparent !important;
	}

	.table-container :global(table.dataTable tbody tr.dt-hasChild td.dt-control:hover::before) {
		border-top-color: #fff !important;
		border-left-color: transparent !important;
		border-right-color: transparent !important;
	}

	.table-container :global(table.dataTable tbody td.dt-sequence) {
		font-family: var(--font-mono);
		text-align: center;
		font-weight: 500;
		color: var(--dt-text-secondary);
		background-color: var(--dt-bg-elevated);
	}

	.table-container :global(table.dataTable tbody td.dt-data) {
		max-width: 400px;
	}

	.table-container :global(table.dataTable tbody tr:hover td) {
		background-color: var(--dt-bg-elevated);
	}

	.table-container :global(table.dataTable tbody tr.dt-hasChild td) {
		background-color: var(--dt-bg-elevated);
		border-bottom-color: var(--dt-accent);
	}

	.table-container :global(table.dataTable.stripe tbody tr.odd td) {
		background-color: var(--dt-bg-primary);
	}

	.table-container :global(table.dataTable.stripe tbody tr.even td) {
		background-color: var(--dt-bg-secondary);
	}

	.table-container :global(table.dataTable.stripe tbody tr.odd.dt-hasChild td),
	.table-container :global(table.dataTable.stripe tbody tr.even.dt-hasChild td) {
		background-color: var(--dt-bg-elevated);
	}

	/* Child Row Styling */
	.table-container :global(table.dataTable tbody tr.child-row) {
		background-color: var(--dt-bg-primary);
	}

	.table-container :global(table.dataTable tbody tr > td.child) {
		padding: 0;
		background-color: var(--dt-bg-child);
		border-left: 3px solid var(--dt-accent);
	}

	.table-container :global(.child-row-content) {
		padding: 0.75rem 1rem;
		background-color: var(--dt-bg-child);
	}

	.table-container :global(.child-field) {
		margin-bottom: 0.5rem;
	}

	.table-container :global(.child-field-header) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
		gap: 1rem;
	}

	.table-container :global(.child-field:last-child) {
		margin-bottom: 0;
	}

	.table-container :global(.child-label) {
		font-size: 0.7rem;
		color: var(--dt-text-secondary);
		font-weight: 600;
	}

	.table-container :global(.copy-btn) {
		position: sticky;
		right: 1rem;
		padding: 0.2rem 0.5rem;
		font-size: 0.65rem;
		color: var(--dt-text-muted);
		background-color: var(--dt-bg-elevated);
		border: 1px solid var(--dt-border-subtle);
		border-radius: 3px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
		flex-shrink: 0;
	}

	.table-container :global(.copy-btn:hover) {
		color: var(--dt-text-primary);
		background-color: var(--dt-bg-secondary);
		border-color: var(--dt-accent);
	}

	.table-container :global(.copy-btn:active) {
		transform: scale(0.95);
	}

	.table-container :global(.child-value) {
		margin: 0;
		padding: 0.5rem;
		background-color: var(--dt-bg-secondary);
		border: 1px solid var(--dt-border-secondary);
		border-radius: 3px;
		font-size: 0.8rem;
		color: var(--dt-text-primary);
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 300px;
		overflow-y: auto;
		font-family: var(--font-mono);
	}

	/* Fixed Header */
	.table-container :global(.fixedHeader-floating) {
		background-color: var(--dt-bg-elevated);
		border: 1px solid var(--dt-border-primary);
	}

	.table-container :global(.fixedHeader-floating th) {
		background-color: var(--dt-bg-elevated);
		border: 1px solid var(--dt-border-primary);
		color: var(--dt-text-primary);
	}

	/* Fixed Columns */
	.table-container :global(.dtfc-fixed-left),
	.table-container :global(.dtfc-fixed-right) {
		background-color: var(--dt-bg-elevated);
		border-right: 2px solid var(--dt-accent);
	}

	/* Scrollbar */
	.table-container :global(.dataTables_scrollBody::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}

	.table-container :global(.dataTables_scrollBody::-webkit-scrollbar-track) {
		background: var(--dt-bg-primary);
	}

	.table-container :global(.dataTables_scrollBody::-webkit-scrollbar-thumb) {
		background: var(--dt-border-primary);
		border-radius: 4px;
	}

	.table-container :global(.dataTables_scrollBody::-webkit-scrollbar-thumb:hover) {
		background: #4a4a4a;
	}

	/* Child value scrollbar */
	.table-container :global(.child-value::-webkit-scrollbar) {
		width: 6px;
	}

	.table-container :global(.child-value::-webkit-scrollbar-track) {
		background: var(--dt-bg-primary);
	}

	.table-container :global(.child-value::-webkit-scrollbar-thumb) {
		background: var(--dt-border-primary);
		border-radius: 3px;
	}
</style>
