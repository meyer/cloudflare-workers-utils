import format from 'format-util';

/** Throw this error for messages that can be safely displayed in the UI */
export class PublicMessageError extends Error {
  constructor(message: string, ...args: any[]) {
    super(format(message, ...args));
  }
}
