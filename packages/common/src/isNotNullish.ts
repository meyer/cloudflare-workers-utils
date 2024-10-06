/** Narrow a thing to the non-nullish version of the thing */
export function isNotNullish<T>(value: T | false | null | undefined): value is T {
  return value !== false && value != null;
}
