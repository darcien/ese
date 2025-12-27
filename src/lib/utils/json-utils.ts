/**
 * Safely parses JSON string, returns null if invalid
 */
export function safeJSONParse(str: string): Record<string, unknown> | null {
	try {
		const parsed = JSON.parse(str);
		// Only accept objects, not primitives or arrays
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Formats a value for display in a table cell
 */
export function formatValueForDisplay(value: unknown): string {
	if (value === null) {
		return 'null';
	}
	if (value === undefined) {
		return '-';
	}
	if (typeof value === 'boolean') {
		return value.toString();
	}
	if (typeof value === 'number') {
		return value.toString();
	}
	if (typeof value === 'string') {
		return value;
	}
	// For objects/arrays that somehow made it through, stringify
	return JSON.stringify(value);
}
