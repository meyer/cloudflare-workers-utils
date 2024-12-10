import { utilFormat } from './utilFormat.js';
import { describe, expect, test } from 'vitest';

describe('utilFormat', () => {
  test('works', () => {
    const result = utilFormat('Hello %s', 'world');
    expect(result).toMatchInlineSnapshot(`"Hello world"`);
  });
});
