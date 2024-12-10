import { utilFormat } from './utilFormat.js';

interface Newable {
  new (...args: any[]): any;
}

export function invariant<T extends Newable>(
  condition: any,
  error: T,
  ...args: ConstructorParameters<T>
): asserts condition;
export function invariant(condition: any, message: string, ...args: any[]): asserts condition;
export function invariant(condition: any, message: any, ...args: any[]): asserts condition {
  if (!condition) {
    if (typeof message === 'function') {
      throw new message(...args);
    }
    throw new Error(utilFormat(message, ...args));
  }
}

export const getThingOrThrow = <T>(thing: T | null | undefined, message: string, ...args: any[]): T => {
  invariant(thing != null, message, ...args);
  return thing;
};

export const getThingFromObjectOrThrow = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  key: K,
): NonNullable<T[K]> => {
  const value = obj[key];
  invariant(value != null, 'Object does not contain key `%s`', key);
  return value;
};
