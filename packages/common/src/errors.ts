import format from 'format-util';
import type { StatusCodes } from 'http-status-codes';

export class RedirectError extends Error {
  constructor(public message: string, public redirectTo: string, public isPermanent: boolean = false) {
    super(message);
  }
}

export class HttpError extends Error {
  constructor(public errorCode: StatusCodes, public message: string) {
    super('Error ' + errorCode + ': ' + message);
  }
}

export class LoginRequiredError extends Error {
  constructor() {
    super('You need to be logged in to view this page.');
  }
}

/** Throw this error for messages that can be safely displayed in the UI */
export class PublicMessageError extends Error {
  constructor(message: string, ...args: any[]) {
    super(format(message, ...args));
  }
}
