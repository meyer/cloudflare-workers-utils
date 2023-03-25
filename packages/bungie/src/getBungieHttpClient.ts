import type { HttpClient, ServerResponse } from 'bungie-api-ts/destiny2';
import { PlatformErrorCodes } from 'bungie-api-ts/destiny2';

export class BungieApiError extends Error {
  constructor(
    public errorCode: PlatformErrorCodes,
    public errorStatus: string,
    public apiResponse: ServerResponse<unknown>
  ) {
    super(errorCode + ': ' + errorStatus);
  }
}

export const getNiceMessageFromBungieError = (error: BungieApiError) => {
  if (error.errorCode === PlatformErrorCodes.SystemDisabled) {
    return 'The Bungie API is currently disabled.';
  } else {
    return `${error.errorCode} ${error.errorStatus}`;
  }
};

export interface BungieHttpClientOptions {
  apiKey: string;
  apiOrigin: string;
  accessToken?: string;
}

export const getBungieHttpClient = (options: BungieHttpClientOptions): HttpClient => {
  const { apiKey, apiOrigin, accessToken } = options;
  return async (config) => {
    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
      Origin: apiOrigin,
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const url = new URL(config.url);
    if (config.params) {
      for (const key in config.params) {
        url.searchParams.set(key, config.params[key]);
      }
    }

    console.log(config.method, url.toString());

    const result = await fetch(url.toString(), {
      method: config.method,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const jsonResponse = (await result.json()) as ServerResponse<unknown>;

    if (
      typeof jsonResponse === 'object' &&
      'ErrorCode' in jsonResponse &&
      'ErrorStatus' in jsonResponse &&
      jsonResponse.ErrorCode !== PlatformErrorCodes.Success
    ) {
      throw new BungieApiError(jsonResponse.ErrorCode, jsonResponse.ErrorStatus, jsonResponse);
    }

    if (result.status < 200 || result.status > 299) {
      throw new Error(result.status + ' ' + result.statusText + ': ' + JSON.stringify(jsonResponse));
    }

    return jsonResponse;
  };
};
