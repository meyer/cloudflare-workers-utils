import { invariant } from '@workers-utils/common';

/**
 * Converts an object of string names keyed by hashes into a function that,
 * given a number, returns an object with each of those string keys with
 * a boolean value for each.
 */
export const bitwiseSplit = <T extends string>(hashObject: Record<number, T>) => {
  // validate all keys
  for (const key of Object.keys(hashObject)) {
    const keyInt = Number.parseInt(key, 10);
    invariant(
      // power of two check. it also lets zero through but that's ok, zero is a valid key.
      (keyInt & (keyInt - 1)) === 0,
      'Key `%s` must be zero or a power of 2',
      key,
    );
  }
  return (hash: number): { [K in T]?: true } => {
    return hash
      .toString(2)
      .split('')
      .reverse()
      .reduce<Record<string, boolean>>((prev, item, index) => {
        const num = 2 ** index;
        const name = hashObject[num];
        if (name && item === '1') {
          prev[name] = true;
        }
        return prev;
      }, {}) as any;
  };
};
