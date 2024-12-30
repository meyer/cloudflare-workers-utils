import { utilFormat } from './utilFormat.js';
import { describe, expect, test } from 'vitest';

describe('utilFormat', () => {
  test('works', () => {
    const result = utilFormat('Hello %s %o', 'world', 123, 'abc', {});
    expect(result).toMatchInlineSnapshot(`"Hello world 123 abc [object Object]"`);
  });
});
