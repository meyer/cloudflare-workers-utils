import { StatusCodes } from 'http-status-codes';

export class JsonResponse extends Response {
  constructor(data: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json;charset=UTF-8');
    super(JSON.stringify(data), { ...init, headers });
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
