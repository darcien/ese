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

	// Build columns configuration from current config
	function buildColumns(config: typeof tableConfig): ConfigColumns[] {
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

	// Format child row content for expanded view
	function formatChildRow(data: SSEEvent, config: typeof tableConfig): string {
		let content = '<div class="child-row-content">';

		if (config.parseJSON && config.hasAnyJSON && data.parsedData) {
			// Show each JSON field with pretty printing if enabled
			for (const col of config.jsonColumns) {
				if (data.parsedData && col in data.parsedData) {
					const value = formatValueForDisplay(data.parsedData[col], config.prettyPrintJSON);
					content += `<div class="child-field"><span class="child-label">${col}:</span><pre class="child-value">${escapeHtml(value)}</pre></div>`;
				}
			}
		} else {
			// Show raw data with pretty print if it's JSON
			let displayData = data.data;
			if (config.prettyPrintJSON && data.parsedData) {
				try {
					displayData = JSON.stringify(JSON.parse(data.data), null, 2);
				} catch {
					// Keep original if parsing fails
				}
			}
			content += `<div class="child-field"><span class="child-label">Data:</span><pre class="child-value">${escapeHtml(displayData)}</pre></div>`;
		}

		content += '</div>';
		return content;
	}

	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	// Svelte action for DataTable - handles lifecycle tied to DOM element
	function datatable(node: HTMLTableElement, config: typeof tableConfig) {
		let dt: Api<SSEEvent> | null = null;
		let currentConfig = config;

		function init(cfg: typeof tableConfig) {
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
				}

				// Sync row states with expandedRows Set
				syncRowStates(cfg);
			} catch (error) {
				console.error('Failed to initialize DataTable:', error);
			}
		}

		function syncRowStates(cfg: typeof tableConfig) {
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

		function destroy() {
			if (dt) {
				// Remove event listener
				const tbody = node.querySelector('tbody');
				if (tbody) {
					tbody.removeEventListener('click', handleRowClick);
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
			update(newConfig: typeof tableConfig) {
				// Check if only expandedRows changed
				const jsonColumnsEqual =
					newConfig.jsonColumns.length === currentConfig.jsonColumns.length &&
					newConfig.jsonColumns.every((col, idx) => col === currentConfig.jsonColumns[idx]);

				const onlyExpandedRowsChanged =
					dt &&
					newConfig.events === currentConfig.events &&
					newConfig.showEvent === currentConfig.showEvent &&
					newConfig.showId === currentConfig.showId &&
					newConfig.showRetry === currentConfig.showRetry &&
					newConfig.parseJSON === currentConfig.parseJSON &&
					newConfig.prettyPrintJSON === currentConfig.prettyPrintJSON &&
					newConfig.hasAnyJSON === currentConfig.hasAnyJSON &&
					jsonColumnsEqual &&
					newConfig.expandedRowsSize !== currentConfig.expandedRowsSize;

				if (onlyExpandedRowsChanged) {
					// Just sync row states without recreating table
					syncRowStates(newConfig);
					currentConfig = newConfig;
				} else {
					// Full recreation needed
					destroy();
					init(newConfig);
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
		{#key events}
			<table use:datatable={tableConfig} class="display compact stripe hover">
				<thead>
					<tr></tr>
				</thead>
				<tbody></tbody>
			</table>
		{/key}
	</div>
{/if}

<style>
	.table-container {
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

	/* DataTables Dark Theme */
	:global(.dataTables_wrapper) {
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		color: #e0e0e0;
	}

	:global(.dataTables_wrapper .dataTables_filter) {
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
		color: #888;
		float: right;
	}

	:global(.dataTables_wrapper .dataTables_filter input) {
		padding: 0.25rem 0.5rem;
		margin: 0 0.5rem;
		background-color: #2a2a2a;
		color: #e0e0e0;
		border: 1px solid #3a3a3a;
		border-radius: 3px;
		font-size: 0.75rem;
		font-family: inherit;
	}

	:global(.dataTables_wrapper .dataTables_filter input:focus) {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.15);
	}

	/* Table Styling */
	:global(table.dataTable) {
		border-collapse: collapse;
		font-size: 0.8rem;
		width: 100%;
		background-color: #1a1a1a;
		color: #e0e0e0;
		border: 1px solid #3a3a3a;
	}

	:global(table.dataTable thead th) {
		font-weight: 600;
		background-color: #252525;
		border: 1px solid #3a3a3a;
		padding: 0.5rem;
		text-align: left;
		color: #e0e0e0;
		font-size: 0.75rem;
		white-space: nowrap;
	}

	:global(table.dataTable tbody td) {
		border: 1px solid #2a2a2a;
		padding: 0.5rem;
		vertical-align: top;
		background-color: #1e1e1e;
		color: #e0e0e0;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
		font-size: 0.8rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 300px;
	}

	:global(table.dataTable tbody td.dt-control) {
		background-color: #252525;
	}

	/* Collapsed state: right-pointing arrow (uses border-left) */
	:global(table.dataTable tbody td.dt-control::before) {
		border-left-color: #888 !important;
	}

	:global(table.dataTable tbody td.dt-control:hover::before) {
		border-left-color: #fff !important;
	}

	/* Expanded state: down-pointing arrow (uses border-top, left/right are transparent) */
	:global(table.dataTable tbody tr.dt-hasChild td.dt-control::before) {
		border-top-color: #0066cc !important;
		border-left-color: transparent !important;
		border-right-color: transparent !important;
	}

	:global(table.dataTable tbody tr.dt-hasChild td.dt-control:hover::before) {
		border-top-color: #fff !important;
		border-left-color: transparent !important;
		border-right-color: transparent !important;
	}

	:global(table.dataTable tbody td.dt-sequence) {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		text-align: center;
		font-weight: 500;
		color: #888;
		background-color: #252525;
	}

	:global(table.dataTable tbody td.dt-data) {
		max-width: 400px;
	}

	:global(table.dataTable tbody tr:hover td) {
		background-color: #252525;
	}

	:global(table.dataTable tbody tr.dt-hasChild td) {
		background-color: #252525;
		border-bottom-color: #0066cc;
	}

	:global(table.dataTable.stripe tbody tr.odd td) {
		background-color: #1a1a1a;
	}

	:global(table.dataTable.stripe tbody tr.even td) {
		background-color: #1e1e1e;
	}

	:global(table.dataTable.stripe tbody tr.odd.dt-hasChild td),
	:global(table.dataTable.stripe tbody tr.even.dt-hasChild td) {
		background-color: #252525;
	}

	/* Child Row Styling */
	:global(table.dataTable tbody tr.child-row) {
		background-color: #1a1a1a;
	}

	:global(table.dataTable tbody tr > td.child) {
		padding: 0;
		background-color: #151515;
		border-left: 3px solid #0066cc;
	}

	:global(.child-row-content) {
		padding: 0.75rem 1rem;
		background-color: #151515;
	}

	:global(.child-field) {
		margin-bottom: 0.5rem;
	}

	:global(.child-field:last-child) {
		margin-bottom: 0;
	}

	:global(.child-label) {
		display: block;
		font-size: 0.7rem;
		color: #888;
		margin-bottom: 0.25rem;
		font-weight: 600;
	}

	:global(.child-value) {
		margin: 0;
		padding: 0.5rem;
		background-color: #1e1e1e;
		border: 1px solid #2a2a2a;
		border-radius: 3px;
		font-size: 0.8rem;
		color: #e0e0e0;
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 300px;
		overflow-y: auto;
		font-family:
			'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
	}

	/* Fixed Header */
	:global(.fixedHeader-floating) {
		background-color: #252525;
		border: 1px solid #3a3a3a;
	}

	:global(.fixedHeader-floating th) {
		background-color: #252525;
		border: 1px solid #3a3a3a;
		color: #e0e0e0;
	}

	/* Fixed Columns */
	:global(.dtfc-fixed-left),
	:global(.dtfc-fixed-right) {
		background-color: #252525;
		border-right: 2px solid #0066cc;
	}

	/* Scrollbar */
	:global(.dataTables_scrollBody::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}

	:global(.dataTables_scrollBody::-webkit-scrollbar-track) {
		background: #1a1a1a;
	}

	:global(.dataTables_scrollBody::-webkit-scrollbar-thumb) {
		background: #3a3a3a;
		border-radius: 4px;
	}

	:global(.dataTables_scrollBody::-webkit-scrollbar-thumb:hover) {
		background: #4a4a4a;
	}

	/* Child value scrollbar */
	:global(.child-value::-webkit-scrollbar) {
		width: 6px;
	}

	:global(.child-value::-webkit-scrollbar-track) {
		background: #1a1a1a;
	}

	:global(.child-value::-webkit-scrollbar-thumb) {
		background: #3a3a3a;
		border-radius: 3px;
	}
</style>
