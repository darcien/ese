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

	function formatValueForDisplay(value: unknown, prettyPrint: boolean = false): string {
		if (value === null) return 'null';
		if (value === undefined) return '-';
		if (typeof value === 'boolean') return value.toString();
		if (typeof value === 'number') return value.toString();
		if (typeof value === 'string') return value;
		return prettyPrint ? JSON.stringify(value, null, 2) : JSON.stringify(value);
	}

	interface Props {
		events: SSEEvent[];
		hideEmptyColumns?: boolean;
		parseJSON: boolean;
		prettyPrintJSON?: boolean;
	}

	let {
		events,
		hideEmptyColumns = $bindable(true),
		parseJSON,
		prettyPrintJSON = $bindable(true)
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
		jsonColumns
	});

	// Build columns configuration from current config
	function buildColumns(config: typeof tableConfig): ConfigColumns[] {
		const cols: ConfigColumns[] = [
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
							return formatValueForDisplay(row.parsedData[col], config.prettyPrintJSON);
						}
						return '-';
					}
				});
			}
		} else {
			cols.push({
				title: 'Data',
				data: (row: SSEEvent) => row.data,
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

	// Svelte action for DataTable - handles lifecycle tied to DOM element
	function datatable(node: HTMLTableElement, config: typeof tableConfig) {
		let dt: Api<SSEEvent> | null = null;

		function init(cfg: typeof tableConfig) {
			if (cfg.events.length === 0) return;

			// Calculate available height from container
			const container = node.closest('.table-container') as HTMLElement | null;
			const availableHeight = container ? container.clientHeight - 60 : 400; // 60px for search box + padding

			try {
				const dtConfig: Config = {
					data: cfg.events,
					columns: buildColumns(cfg),
					paging: false,
					order: [[0, 'asc']],
					autoWidth: false,
					scrollY: `${availableHeight}px`,
					scrollX: true,
					scrollCollapse: false,
					deferRender: true,
					dom: '<"top"f>rt',
					colReorder: true,
					fixedHeader: {
						header: true,
						headerOffset: 48
					},
					fixedColumns: {
						left: 1
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
			} catch (error) {
				console.error('Failed to initialize DataTable:', error);
			}
		}

		function destroy() {
			if (dt) {
				try {
					dt.destroy(true);
				} catch (error) {
					console.error('Error destroying DataTable:', error);
				}
				dt = null;
			}
		}

		// Initial setup
		init(config);

		return {
			update(newConfig: typeof tableConfig) {
				// Destroy and reinitialize on any config change
				destroy();
				init(newConfig);
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
					<tr>
						<th>#</th>
					</tr>
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
		white-space: pre-wrap;
		word-wrap: break-word;
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

	:global(table.dataTable.stripe tbody tr.odd td) {
		background-color: #1a1a1a;
	}

	:global(table.dataTable.stripe tbody tr.even td) {
		background-color: #1e1e1e;
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
</style>
