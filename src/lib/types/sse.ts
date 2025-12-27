/**
 * Represents a single Server-Sent Event
 */
export interface SSEEvent {
	/** Sequential number of the event (auto-generated) */
	sequence: number;
	/** Event type (optional, browser defaults to "message" if not specified) */
	event?: string;
	/** Event data/payload */
	data: string;
	/** Event ID (if specified, used for reconnection) */
	id?: string;
	/** Retry interval in milliseconds (if specified) */
	retry?: number;
	/** Original raw text of the event (for debugging) */
	raw?: string;
	/** Parsed JSON data (if data is valid JSON) */
	parsedData?: Record<string, unknown>;
}

/**
 * Result of parsing an SSE stream
 */
export interface ParseResult {
	/** Successfully parsed events */
	events: SSEEvent[];
	/** Any errors encountered during parsing */
	errors: string[];
}
