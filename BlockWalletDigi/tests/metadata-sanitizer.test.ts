import { describe, it, expect } from 'vitest';
import { sanitizeUnsafeMetadata } from '../server/utils/metadata-sanitizer';

describe('sanitizeUnsafeMetadata', () => {
    describe('Scalars', () => {
        it('should handle null and undefined', () => {
            expect(sanitizeUnsafeMetadata(null)).toBeNull();
            expect(sanitizeUnsafeMetadata(undefined)).toBeNull();
        });

        it('should handle strings', () => {
            expect(sanitizeUnsafeMetadata('test string')).toBe('test string');
        });

        it('should truncate long strings', () => {
            const longString = 'a'.repeat(1001);
            const result = sanitizeUnsafeMetadata(longString);
            expect(result).toBe('a'.repeat(1000));
            expect((result as string).length).toBe(1000);
        });

        it('should handle numbers', () => {
            expect(sanitizeUnsafeMetadata(123)).toBe(123);
            expect(sanitizeUnsafeMetadata(0)).toBe(0);
            expect(sanitizeUnsafeMetadata(-123.45)).toBe(-123.45);
        });

        it('should handle infinite numbers', () => {
            expect(sanitizeUnsafeMetadata(Infinity)).toBe(0);
            expect(sanitizeUnsafeMetadata(-Infinity)).toBe(0);
            expect(sanitizeUnsafeMetadata(NaN)).toBe(0);
        });

        it('should handle booleans', () => {
            expect(sanitizeUnsafeMetadata(true)).toBe(true);
            expect(sanitizeUnsafeMetadata(false)).toBe(false);
        });

        it('should handle symbols and functions', () => {
             // sanitizeScalar returns null for types not string, number, boolean
             expect(sanitizeUnsafeMetadata(Symbol('foo'))).toBeNull();
             expect(sanitizeUnsafeMetadata(() => {})).toBeNull();
        });
    });

    describe('Arrays', () => {
        it('should handle empty arrays', () => {
            expect(sanitizeUnsafeMetadata([])).toEqual([]);
        });

        it('should handle arrays with scalars', () => {
            const input = [1, 'two', true, null];
            expect(sanitizeUnsafeMetadata(input)).toEqual([1, 'two', true, null]);
        });

        it('should truncate arrays longer than 50 items', () => {
            const input = Array.from({ length: 60 }, (_, i) => i);
            const result = sanitizeUnsafeMetadata(input);
            expect(Array.isArray(result)).toBe(true);
            expect((result as unknown[]).length).toBe(50);
            expect((result as unknown[])[0]).toBe(0);
            expect((result as unknown[])[49]).toBe(49);
        });

        it('should recursively sanitize array elements', () => {
            const input = [{ a: 1 }, [2, 3]];
            const result = sanitizeUnsafeMetadata(input);
            expect(result).toEqual([{ a: 1 }, [2, 3]]);
        });
    });

    describe('Objects', () => {
        it('should handle empty objects', () => {
            expect(sanitizeUnsafeMetadata({})).toEqual({});
        });

        it('should handle plain objects with scalar values', () => {
            const input = { a: 1, b: 'two', c: true };
            expect(sanitizeUnsafeMetadata(input)).toEqual({ a: 1, b: 'two', c: true });
        });

        it('should truncate objects with more than 50 keys', () => {
            const input: Record<string, number> = {};
            for (let i = 0; i < 60; i++) {
                input[`key${i}`] = i;
            }
            const result = sanitizeUnsafeMetadata(input) as Record<string, unknown>;
            const keys = Object.keys(result);
            expect(keys.length).toBe(50);
            expect(keys[0]).toBe('key0');
            expect(keys[49]).toBe('key49');
        });

        it('should filter blocked keys', () => {
            const input = JSON.parse(
                '{"valid": "value", "__proto__": {"hacked": true}, "prototype": {"hacked": true}, "constructor": {"hacked": true}}'
            );
            const result = sanitizeUnsafeMetadata(input);
            expect(result).toEqual({ valid: 'value' });
        });

        it('should recursively sanitize object values', () => {
            const input = {
                nested: {
                    a: 1,
                    b: [2, 3],
                },
            };
            expect(sanitizeUnsafeMetadata(input)).toEqual({
                nested: {
                    a: 1,
                    b: [2, 3],
                },
            });
        });

        it('should handle objects with null prototype', () => {
            const input = Object.create(null);
            input.a = 1;
            expect(sanitizeUnsafeMetadata(input)).toEqual({ a: 1 });
        });
    });

    describe('Non-Plain Objects', () => {
        it('should return null for class instances (Date)', () => {
            expect(sanitizeUnsafeMetadata(new Date())).toBeNull();
        });

        it('should return null for custom class instances', () => {
            class CustomClass {
                prop = 'value';
            }
            expect(sanitizeUnsafeMetadata(new CustomClass())).toBeNull();
        });

        it('should return null for RegExp', () => {
            expect(sanitizeUnsafeMetadata(/test/)).toBeNull();
        });
    });

    describe('Depth Limit', () => {
        it('should truncate deeply nested structures', () => {
            // Depth 0: { a: { ... } }
            // Depth 1: { a: { b: { ... } } }
            // ...
            // Depth 6 is the limit. Depth 7 returns '[TRUNCATED]'

            const deepObject = {
                l1: {
                    l2: {
                        l3: {
                            l4: {
                                l5: {
                                    l6: {
                                        l7: 'value',
                                    },
                                },
                            },
                        },
                    },
                },
            };

            const result = sanitizeUnsafeMetadata(deepObject) as any;
            // l1 (depth 1) -> l2 (depth 2) -> ... -> l6 (depth 6) -> l7 (depth 7)
            // Wait, the function definition:
            // function sanitizeUnsafeMetadata(value: unknown, depth = 0): unknown
            // if (depth > 6) return '[TRUNCATED]';

            // value = deepObject, depth = 0
            // result = { l1: sanitizeUnsafeMetadata(l1_val, 1) }
            // ...
            // recursive call for l6_val (depth 6)
            // result = { ... l6: sanitizeUnsafeMetadata(l6_val, 6) }
            // inside: depth is 6, not > 6. So it processes l6_val (object {l7: 'value'})
            // result = { ... l6: { l7: sanitizeUnsafeMetadata('value', 7) } }
            // inside: depth is 7, > 6. Returns '[TRUNCATED]'.

            expect(result.l1.l2.l3.l4.l5.l6.l7).toBe('[TRUNCATED]');
        });

        it('should handle arrays at max depth', () => {
             const deepArray = [[[[[[['value']]]]]]];
             // depth 0: array
             // depth 1: array
             // ...
             // depth 6: array containing 'value'
             // depth 7: 'value' -> truncated?

             // sanitize(arr, 0) -> map(entry => sanitize(entry, 1))
             // ...
             // sanitize(arr_l6, 6) -> map(entry => sanitize(entry, 7))
             // inside sanitize(entry, 7): returns '[TRUNCATED]'

             // So expected: [[[[[[['[TRUNCATED]']]]]]]]

             const result = sanitizeUnsafeMetadata(deepArray) as any;
             expect(result[0][0][0][0][0][0][0]).toBe('[TRUNCATED]');
        });
    });

    describe('Circular References', () => {
        it('should handle circular references by depth truncation', () => {
            const circular: any = { a: 1 };
            circular.self = circular;

            const result = sanitizeUnsafeMetadata(circular) as any;

            // At depth 6, objects are created but their properties are sanitized at depth 7,
            // resulting in '[TRUNCATED]' for all properties.
            let current = result;
            // Traverse up to depth 5 (result -> depth 0 ... depth 5 -> depth 6 object)
            // i=0: check current (depth 0), move to depth 1
            // ...
            // i=5: check current (depth 5), move to depth 6
            for (let i = 0; i < 6; i++) {
                expect(current.a).toBe(1);
                current = current.self;
            }
            // Now current is the object at depth 6.
            // Its properties should be truncated because sanitize calls happen at depth 7.
            expect(current.a).toBe('[TRUNCATED]');
            expect(current.self).toBe('[TRUNCATED]');
        });
    });
});
