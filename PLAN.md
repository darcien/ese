# SSE Stream Viewer - Project Plan

## Overview

A web app to visualize and explore completed Server-Sent Events (SSE) streams in a human-readable format.

---

## Core Features

### Dense TUI-like Interface

- **Full-height layout** - Application fills entire viewport (100vh)
- **Collapsible left panel** - Input area can be collapsed to maximize table space
  - Text area for pasting raw SSE stream data (monospace font)
  - **Minimum width: 80 characters** - Standard terminal width for monospace content
  - **Sample dropdown + Load button** to select from multiple sample streams
  - Displays parsing errors (if any) below the input
  - Collapse/expand toggle button
  - When collapsed, shows minimal vertical bar with expand button
- **Right Panel: Live Table View (DataTables)**
  - **Uses DataTables API** for rich table functionality
  - Takes remaining horizontal space (expands when left panel collapses)
  - Updates automatically as you type (with 300ms debounce)
  - Displays parsed SSE events with columns:
    - **Sequence #** - Auto-incrementing row number (client-side only, for easy reference)
    - **Event Type** - The `event:` field (optional, shows "(default)" when not specified)
    - **Data/Payload** - The actual content from `data:` field
    - **ID** - Event ID if present (`id:` field, used by server for reconnection)
    - **Retry** - Retry interval if specified
  - DataTables extensions (installed):
    - **FixedHeader** - Keep header visible while scrolling
    - **ColReorder** - Drag and drop column reordering
    - **FixedColumns** - Pin columns to left/right while scrolling horizontally
    - **Buttons** - Multi-column visibility controls
    - **ColumnControl** - Advanced column visibility management
  - DataTables features:
    - Sorting on all columns
    - Searching/filtering
    - Scrollable body with fixed header
    - Column reordering via drag-and-drop
    - Multi-column visibility toggling via buttons
  - Shows empty state when no input is provided
  - Shows parsing indicator while processing

- **Status Bar (bottom)** - Always visible at the bottom of the viewport
  - **Auto-hide empty columns** checkbox (moved from table)
  - **Parse data as JSON** checkbox (when JSON detected)
  - **Pretty print JSON** checkbox (checked by default) - formats JSON values with indentation
  - Event count and parsing status
  - Compact, information-dense design

---

## Technical Architecture

### File Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── SSEInput.svelte          # Input form component
│   │   ├── SSETable.svelte          # Table visualization component
│   │   └── EventRow.svelte          # Individual event row (optional)
│   ├── utils/
│   │   ├── sse-parser.ts            # Parse raw SSE text into structured data
│   │   └── sample-data.ts           # Sample SSE stream data
│   └── types/
│       └── sse.ts                   # TypeScript interfaces for SSE events
└── routes/
    └── +page.svelte                 # Main page orchestrating the app
```

### Data Structure

```typescript
interface SSEEvent {
	sequence: number; // auto-generated client-side counter
	event?: string; // optional, browser defaults to "message" if not present
	data: string;
	id?: string; // server-provided, used for reconnection
	retry?: number;
	raw?: string; // original raw text for debugging
}
```

---

## Implementation Steps

### Phase 1: Core Functionality (Basic) ✅ COMPLETED

1. **Create TypeScript types** (`lib/types/sse.ts`)
   - Define the `SSEEvent` interface
   - Export any helper types

2. **Create SSE parser utility** (`lib/utils/sse-parser.ts`)
   - Function to parse raw SSE stream text into `SSEEvent[]`
   - Handle multi-line data fields (SSE allows `data:` to span multiple lines)
   - Handle comments (lines starting with `:`)
   - Handle empty lines (event delimiters)
   - 22 comprehensive unit tests (all passing)

3. **Create sample data** (`lib/utils/sample-data.ts`)
   - Multiple sample options: Data Only, Basic, Chat, Notifications, E-commerce, Multi-line JSON, Retry examples, OpenAI API, Comprehensive
   - Each sample demonstrates different SSE features
   - Structured as array of SampleOption objects

4. **Build SSEInput component** (`lib/components/SSEInput.svelte`)
   - Textarea with controlled input
   - Dropdown to select from multiple samples
   - "Load" button to load selected sample
   - Bindable value prop for parent state management
   - Minimal instructions (help page planned separately)

5. **Build SSETable component** (`lib/components/SSETable.svelte`)
   - Basic table with all SSE event fields
   - Display all columns: sequence, event type, data, id, retry
   - Auto-hide empty columns feature (Event Type, ID, Retry) with checkbox toggle
   - Shows "(default)" for events without event type when column is visible
   - Responsive styling with hover effects

6. **Wire up main page** (`routes/+page.svelte`)
   - State management using Svelte 5 runes (`$state`)
   - Real-time parsing with 300ms debouncing
   - Side-by-side layout (input left, table right)
   - Empty states and loading indicators
   - Error display below input area

### Phase 2: Dense TUI-like Layout & Polish

- **Full-height viewport layout** - Make app fill 100vh with no scrolling on main container
- **Collapsible left panel** - Add toggle button to collapse/expand input area
  - Smooth transitions for collapse/expand
  - Icon indicator (e.g., chevron) for collapse state
  - Left panel width: minimum 80 characters wide (monospace) when expanded, ~40px when collapsed
  - Calculate width based on: `80ch + padding` for monospace text
- **DataTables extensions configuration** - Leverage all installed extensions
  - ✅ DataTables with FixedHeader and ColReorder already integrated
  - ✅ Sorting, searching, and pagination working
  - **FixedHeader**: Pin table headers
  - **FixedColumns**: Pin specific column when scrolling horizontally
  - **Buttons**: Add column visibility controls
  - **ColumnControl**: Advanced column visibility management UI
  - Ensure all extensions work together in full-height layout
- **Flexible table layout** - Table expands to fill remaining horizontal space
  - DataTables scrollY and scrollX for proper viewport-based scrolling
  - FixedColumns for pinned columns during horizontal scroll
- **Status bar at bottom** - Always pinned to bottom of viewport
  - Move "Auto-hide empty columns" checkbox here
  - Add event count display
  - Add parsing status indicator
  - Compact height (e.g., 32-40px)
- **Dense spacing** - Reduce padding/margins throughout for information density
  - Tighter table row height
  - Compact form controls
  - Minimal whitespace between sections
- **TUI-inspired aesthetics**
  - Monospace fonts for data display
  - Border characters or lines for section separation
  - Muted color palette with strategic highlights
  - High contrast for readability

### Phase 3: Collapsible Table Rows

- **Collapsible rows using DataTables child rows API**
  - Default state: all rows collapsed for scannable overview
  - Individual row expand/collapse via toggle icon
  - Global "Expand all" checkbox in status bar
  
- **Row display modes**
  - **Collapsed (default)**: Shows compact preview
    - First line or first ~100 chars of data (whichever shorter)
    - No pretty-printing in preview (saves space)
    - Single-line height for easy scanning
  - **Expanded**: Full content in child row
    - Pretty-printed JSON when enabled
    - Full multi-line content visible
    - Slightly different background to distinguish from main row

- **Toggle column**
  - New first column with expand/collapse icon (▶/▼)
  - Click to toggle individual row
  - Pin this column along with sequence # column

- **Global control**
  - "Expand all" checkbox in status bar (unchecked by default)
  - Toggles all rows at once
  - Individual row toggles still work independently after global toggle

- **Implementation details**
  - Use DataTables `row().child()` API for native integration
  - Track expanded state per row (by sequence number)
  - Child row styling: darker background, proper padding
  - Preserve search/sort functionality on main row data

---

## Nice-to-Have Enhancements (Future)

- 🔍 **Search/Filter** - Filter events by type or search in payload
- 📊 **Statistics** - Count of events, event types breakdown
- 🎨 **Syntax highlighting** - Pretty-print JSON payloads
- 📥 **Export** - Download event stream as text
- ⏱️ **Timing visualization** - Show gaps between events
- 🔄 **Multi-view modes** - Timeline view
- 🔗 **URL state** - Save/share streams via URL
- 💾 **Local storage** - Remember last loaded stream

---


## Current Status

- [x] Phase 1: Core Functionality ✅
  - [x] TypeScript types (standard SSE fields only)
  - [x] SSE parser with 21 comprehensive tests (all passing)
  - [x] Multiple sample datasets (9 different examples including OpenAI streaming API)
  - [x] SSEInput component with dropdown sample selection
  - [x] SSETable component (sequence, event, data, id, retry columns)
  - [x] Auto-hide empty columns feature (enabled by default)
  - [x] Main page with side-by-side layout
  - [x] Debounced parsing (300ms)
  - [x] Basic styling and layout
  - [x] Error handling and display
  - [x] Empty states with concise messaging
  - [x] Spec-compliant: supports all standard SSE fields per WHATWG spec
  - [x] Minimal UI text (detailed help planned for separate page)
  - [x] JSON parsing shows only top-level keys (no flattened nested keys)
  - [x] Pretty print JSON option (checked by default) for better readability
- [x] Phase 3: Collapsible Table Rows ✅
  - [x] Add toggle column with expand/collapse icons (▶/▼)
  - [x] Implement DataTables child rows for expanded content
  - [x] Collapsed state: show first line/100 chars preview (no pretty-print)
  - [x] Expanded state: full content with pretty-print if enabled
  - [x] Add "Expand all" checkbox to status bar
  - [x] Track individual row expanded state using SvelteSet
  - [x] Checkbox properly reflects state (checked/unchecked/indeterminate)
  - [x] Pin toggle and sequence columns with FixedColumns (left: 2)
  - [x] Style child rows (darker background, blue left border)
  - [x] Use DataTables native arrow styling (CSS borders)
- [x] Phase 2: Dense TUI-like Layout & Polish ✅
  - [x] Full-height viewport layout (100vh, no main container scrolling)
  - [x] Collapsible left panel for input area
    - [x] Toggle button with smooth transitions
    - [x] Collapse icon indicator
    - [x] Width: 80ch (80 characters) minimum when expanded
    - [x] Width: ~40px when collapsed (just toggle button visible)
  - [x] DataTables integration ✅
    - [x] DataTables library installed with all extensions
    - [x] SSETable component using DataTables API
    - [x] Columns, sorting, searching configured
    - [x] Dynamic data updates working
  - [x] DataTables extensions configuration ✅
    - [x] **FixedHeader** (fully configured)
      - [x] Configure scrollY for viewport-based vertical scrolling
      - [x] Test fixed header behavior in full-height layout
      - [x] Verify FixedHeader works with scrollable container
    - [x] **ColReorder** (fully enabled)
      - [x] Drag-and-drop column reordering working
      - [x] Works with dynamic column changes (JSON parsing mode)
    - [x] **FixedColumns**
      - [x] Enable FixedColumns extension
      - [x] Pin sequence (#) column to left
      - [x] Configure scrollX for horizontal scrolling
      - [x] Works with many JSON columns
    - [x] **Buttons**
      - [x] Enable Buttons extension
      - [x] Add multi-column visibility button
      - [x] Style buttons to match TUI aesthetic
      - [x] Position buttons in table toolbar
    - [ ] **ColumnControl** (not yet implemented)
      - [ ] Enable ColumnControl extension
      - [ ] Integrate with "Hide empty columns" functionality
      - [ ] Allow per-column show/hide controls
      - [ ] Sync with existing column visibility logic
  - [x] Flexible table layout
    - [x] Table expands to fill remaining space
  - [x] Status bar always at bottom
    - [x] Move auto-hide checkbox to status bar
    - [x] Add event count display
    - [x] Add parsing status indicator
  - [x] Dense spacing throughout (tighter rows, compact controls)
  - [x] TUI-inspired aesthetics (monospace, borders, muted palette)
- [ ] Future Enhancements
- [ ] Separate Help/Documentation Page
