import { describe, it, expect } from 'vitest';
import { parseSSEStream, isValidSSEFormat, shouldAutoEnableJSONParsing } from './sse-parser';
import { SAMPLE_SSE_STREAM, MINIMAL_SAMPLE } from './sample-data';

describe('parseSSEStream', () => {
	it('should parse a simple SSE event', () => {
		const input = `data: Hello, world!\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0]).toMatchObject({
			sequence: 1,
			event: undefined,
			data: 'Hello, world!',
			id: '1'
		});
		expect(result.errors).toHaveLength(0);
	});

	it('should parse multiple events', () => {
		const input = `data: First\nid: 1\n\ndata: Second\nid: 2\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(2);
		expect(result.events[0].data).toBe('First');
		expect(result.events[1].data).toBe('Second');
	});

	it('should parse custom event types', () => {
		const input = `event: notification\ndata: Alert!\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].event).toBe('notification');
	});

	it('should concatenate multiple data lines', () => {
		const input = `data: Line 1\ndata: Line 2\ndata: Line 3\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].data).toBe('Line 1\nLine 2\nLine 3');
	});

	it('should ignore comment lines', () => {
		const input = `: This is a comment\ndata: Hello\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].data).toBe('Hello');
	});

	it('should parse retry field as number', () => {
		const input = `data: Hello\nretry: 5000\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].retry).toBe(5000);
	});

	it('should handle invalid retry values', () => {
		const input = `data: Hello\nretry: invalid\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].retry).toBeUndefined();
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('should strip optional space after colon', () => {
		const input = `data: With space\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].data).toBe('With space');
	});

	it('should handle data without space after colon', () => {
		const input = `data:No space\nid:1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].data).toBe('No space');
		expect(result.events[0].id).toBe('1');
	});

	it('should return error for empty stream', () => {
		const result = parseSSEStream('');

		expect(result.events).toHaveLength(0);
		expect(result.errors).toContain('Empty stream provided');
	});

	it('should return error for stream with no valid events', () => {
		const input = `: Only comments\n: Nothing else\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(0);
		expect(result.errors).toContain('No valid events found in stream');
	});

	it('should parse the sample SSE stream', () => {
		const result = parseSSEStream(SAMPLE_SSE_STREAM);

		expect(result.events.length).toBeGreaterThan(0);
		expect(result.events[0].event).toBe('user-connected');
		expect(result.events[0].data).toContain('user123');
	});

	it('should parse the minimal sample', () => {
		const result = parseSSEStream(MINIMAL_SAMPLE);

		expect(result.events).toHaveLength(4);
		expect(result.events[0].event).toBeUndefined();
		expect(result.events[1].event).toBeUndefined();
		expect(result.events[2].event).toBeUndefined();
		expect(result.events[3].event).toBe('custom');
	});

	it('should assign sequential sequence numbers', () => {
		const input = `data: First\n\ndata: Second\n\ndata: Third\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].sequence).toBe(1);
		expect(result.events[1].sequence).toBe(2);
		expect(result.events[2].sequence).toBe(3);
	});

	it('should store raw event text', () => {
		const input = `event: test\ndata: Hello\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events[0].raw).toContain('event: test');
		expect(result.events[0].raw).toContain('data: Hello');
	});
});

describe('isValidSSEFormat', () => {
	it('should return true for valid SSE format', () => {
		const input = `data: Hello\n\n`;
		expect(isValidSSEFormat(input)).toBe(true);
	});

	it('should return false for empty string', () => {
		expect(isValidSSEFormat('')).toBe(false);
	});

	it('should return false for whitespace only', () => {
		expect(isValidSSEFormat('   \n\n  ')).toBe(false);
	});

	it('should return false for text without data field', () => {
		const input = `event: test\nid: 1\n\n`;
		expect(isValidSSEFormat(input)).toBe(false);
	});

	it('should return true if at least one data field exists', () => {
		const input = `event: test\ndata: content\n\n`;
		expect(isValidSSEFormat(input)).toBe(true);
	});

	it('should ignore comments when validating', () => {
		const input = `: comment\ndata: Hello\n\n`;
		expect(isValidSSEFormat(input)).toBe(true);
	});
});

describe('JSON parsing', () => {
	it('should parse valid JSON data', () => {
		const input = `data: {"name": "John", "age": 30}\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].parsedData).toBeDefined();
		expect(result.events[0].parsedData).toEqual({ name: 'John', age: 30 });
	});

	it('should not parse invalid JSON', () => {
		const input = `data: Not JSON data\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].parsedData).toBeUndefined();
	});

	it('should parse multi-line JSON', () => {
		const input = `data: {\ndata:   "name": "John",\ndata:   "age": 30\ndata: }\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].parsedData).toBeDefined();
		expect(result.events[0].parsedData).toEqual({ name: 'John', age: 30 });
	});

	it('should not parse JSON arrays as parsedData', () => {
		const input = `data: [1, 2, 3]\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].parsedData).toBeUndefined();
	});

	it('should not parse JSON primitives as parsedData', () => {
		const input = `data: "just a string"\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].parsedData).toBeUndefined();
	});

	it('should parse nested JSON objects', () => {
		const input = `data: {"user": {"name": "John", "age": 30}, "active": true}\nid: 1\n\n`;
		const result = parseSSEStream(input);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].parsedData).toBeDefined();
		expect(result.events[0].parsedData).toEqual({
			user: { name: 'John', age: 30 },
			active: true
		});
	});
});

describe('shouldAutoEnableJSONParsing', () => {
	it('should return true when all events have JSON', () => {
		const input = `data: {"a": 1}\n\ndata: {"b": 2}\n\ndata: {"c": 3}\n\n`;
		const result = parseSSEStream(input);

		expect(shouldAutoEnableJSONParsing(result.events)).toBe(true);
	});

	it('should return true when 50% or more events have JSON', () => {
		const input = `data: {"a": 1}\n\ndata: plain text\n\n`;
		const result = parseSSEStream(input);

		expect(shouldAutoEnableJSONParsing(result.events)).toBe(true);
	});

	it('should return false when less than 50% events have JSON', () => {
		const input = `data: {"a": 1}\n\ndata: plain text\n\ndata: more text\n\n`;
		const result = parseSSEStream(input);

		expect(shouldAutoEnableJSONParsing(result.events)).toBe(false);
	});

	it('should return false for empty events array', () => {
		expect(shouldAutoEnableJSONParsing([])).toBe(false);
	});

	it('should return false when no events have JSON', () => {
		const input = `data: plain text\n\ndata: more text\n\n`;
		const result = parseSSEStream(input);

		expect(shouldAutoEnableJSONParsing(result.events)).toBe(false);
	});
});
