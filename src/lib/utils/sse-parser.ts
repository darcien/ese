import type { SSEEvent, ParseResult } from '$lib/types/sse';
import { safeJSONParse } from './json-utils';

/**
 * Parses raw SSE stream text into structured SSEEvent objects
 *
 * SSE format rules:
 * - Lines starting with ':' are comments (ignored)
 * - Empty lines separate events
 * - Fields: event, data, id, retry
 * - 'data:' can appear multiple times (concatenated with \n)
 * - Default event type is "message" if not specified
 */
export function parseSSEStream(rawStream: string): ParseResult {
	const events: SSEEvent[] = [];
	const errors: string[] = [];

	if (!rawStream || rawStream.trim().length === 0) {
		errors.push('Empty stream provided');
		return { events, errors };
	}

	const lines = rawStream.split('\n');
	let currentEvent: Partial<SSEEvent> & { dataLines: string[] } = {
		dataLines: []
	};
	let rawEventLines: string[] = [];
	let sequence = 1;

	const commitEvent = () => {
		// Only commit if we have data
		if (currentEvent.dataLines && currentEvent.dataLines.length > 0) {
			const dataString = currentEvent.dataLines.join('\n');
			const parsedData = safeJSONParse(dataString);

			const event: SSEEvent = {
				sequence,
				event: currentEvent.event,
				data: dataString,
				id: currentEvent.id,
				retry: currentEvent.retry,
				raw: rawEventLines.join('\n'),
				parsedData: parsedData || undefined
			};
			events.push(event);
			sequence++;
		}

		// Reset for next event
		currentEvent = { dataLines: [] };
		rawEventLines = [];
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Empty line = event boundary
		if (line.trim() === '') {
			commitEvent();
			continue;
		}

		// Comment line (ignore)
		if (line.startsWith(':')) {
			continue;
		}

		rawEventLines.push(line);

		// Parse field
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			// Invalid line without colon
			continue;
		}

		const field = line.substring(0, colonIndex);
		// Remove optional space after colon
		let value = line.substring(colonIndex + 1);
		if (value.startsWith(' ')) {
			value = value.substring(1);
		}

		switch (field) {
			case 'event':
				currentEvent.event = value;
				break;

			case 'data':
				currentEvent.dataLines!.push(value);
				break;

			case 'id':
				currentEvent.id = value;
				break;

			case 'retry': {
				const retryNum = parseInt(value, 10);
				if (!isNaN(retryNum)) {
					currentEvent.retry = retryNum;
				} else {
					errors.push(`Invalid retry value at line ${i + 1}: ${value}`);
				}
				break;
			}

			default:
				// Unknown field, ignore
				break;
		}
	}

	// Commit any remaining event
	commitEvent();

	if (events.length === 0 && errors.length === 0) {
		errors.push('No valid events found in stream');
	}

	return { events, errors };
}

/**
 * Validates if a string looks like valid SSE format
 */
export function isValidSSEFormat(text: string): boolean {
	if (!text || text.trim().length === 0) {
		return false;
	}

	const lines = text.split('\n');
	let hasDataField = false;

	for (const line of lines) {
		// Skip empty lines and comments
		if (line.trim() === '' || line.startsWith(':')) {
			continue;
		}

		// Check if line has colon (field: value format)
		if (line.includes(':')) {
			const field = line.substring(0, line.indexOf(':'));
			if (field === 'data') {
				hasDataField = true;
			}
		}
	}

	return hasDataField;
}

/**
 * Checks if all events in the array have valid JSON data
 * Returns true if at least 50% of events have parsedData
 */
export function shouldAutoEnableJSONParsing(events: SSEEvent[]): boolean {
	if (events.length === 0) {
		return false;
	}

	const eventsWithJSON = events.filter((event) => event.parsedData !== undefined).length;
	const percentage = eventsWithJSON / events.length;

	// Auto-enable if at least 50% of events have valid JSON
	return percentage >= 0.5;
}
