# ese

ese - event stream explorer

## Getting Started

### Prerequisites

- Bun

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

### Build for Production

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── SSEInput.svelte          # Input form component
│   │   └── SSETable.svelte          # Table visualization component
│   ├── utils/
│   │   ├── sse-parser.ts            # SSE stream parser
│   │   └── sample-data.ts           # Sample data for testing
│   └── types/
│       └── sse.ts                   # TypeScript interfaces
└── routes/
    └── +page.svelte                 # Main application page
```

## Development

### Running Tests

```bash
bun run test
```

### Linting

```bash
bun run lint
```

### Formatting

```bash
bun run format
```
