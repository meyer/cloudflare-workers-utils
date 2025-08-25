import type { StatusCodes } from 'http-status-codes';

import { utilFormat } from './utilFormat.js';

export class RedirectError extends Error {
  constructor(
    public statusText: string,
    public redirectTo: string,
    public isPermanent = false,
  ) {
    super(statusText);
  }
}

export class HttpError extends Error {
  constructor(
    public status: StatusCodes,
    public statusText: string,
    public responseText: string,
    public failedRequestUrl?: string,
  ) {
    super(`Error ${status}: ${statusText}`);
  }
}

export class LoginRequiredError extends Error {
  constructor() {
    super('You need to be logged in to view this page.');
  }
}

/** Throw this error for messages that can be safely displayed in the UI */
export class PublicMessageError extends Error {
  constructor(message: string, ...args: unknown[]) {
    super(utilFormat(message, ...args));
  }
}
