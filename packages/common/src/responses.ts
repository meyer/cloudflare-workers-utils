import { StatusCodes } from 'http-status-codes';

export class JsonResponse extends Response {
  constructor(data: unknown, init?: ResponseInit) {
    super(JSON.stringify(data), init);
  }
}

export class RedirectResponse extends Response {
  constructor(redirectTo: string) {
    super(null, {
      status: StatusCodes.TEMPORARY_REDIRECT,
      headers: {
        Location: redirectTo,
      },
    });
  }
}
