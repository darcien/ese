import { describe, it, expect } from 'vitest';
import { safeJSONParse, formatValueForDisplay } from './json-utils';

describe('safeJSONParse', () => {
	it('should parse valid JSON object', () => {
		const result = safeJSONParse('{"name": "John", "age": 30}');
		expect(result).toEqual({ name: 'John', age: 30 });
	});

	it('should return null for invalid JSON', () => {
		const result = safeJSONParse('not json');
		expect(result).toBeNull();
	});

	it('should return null for JSON arrays', () => {
		const result = safeJSONParse('[1, 2, 3]');
		expect(result).toBeNull();
	});

	it('should return null for JSON primitives', () => {
		expect(safeJSONParse('"string"')).toBeNull();
		expect(safeJSONParse('42')).toBeNull();
		expect(safeJSONParse('true')).toBeNull();
		expect(safeJSONParse('null')).toBeNull();
	});

	it('should parse nested objects', () => {
		const result = safeJSONParse('{"user": {"name": "John"}}');
		expect(result).toEqual({ user: { name: 'John' } });
	});

	it('should return null for empty string', () => {
		const result = safeJSONParse('');
		expect(result).toBeNull();
	});
});

describe('formatValueForDisplay', () => {
	it('should format null as string', () => {
		expect(formatValueForDisplay(null)).toBe('null');
	});

	it('should format undefined as dash', () => {
		expect(formatValueForDisplay(undefined)).toBe('-');
	});

	it('should format boolean true', () => {
		expect(formatValueForDisplay(true)).toBe('true');
	});

	it('should format boolean false', () => {
		expect(formatValueForDisplay(false)).toBe('false');
	});

	it('should format numbers', () => {
		expect(formatValueForDisplay(42)).toBe('42');
		expect(formatValueForDisplay(3.14)).toBe('3.14');
		expect(formatValueForDisplay(0)).toBe('0');
	});

	it('should format strings as-is', () => {
		expect(formatValueForDisplay('hello')).toBe('hello');
		expect(formatValueForDisplay('')).toBe('');
	});

	it('should stringify objects', () => {
		const obj = { name: 'John' };
		expect(formatValueForDisplay(obj)).toBe('{"name":"John"}');
	});

	it('should stringify arrays', () => {
		const arr = [1, 2, 3];
		expect(formatValueForDisplay(arr)).toBe('[1,2,3]');
	});
});
