import type { HttpClientConfig, ServerResponse } from 'bungie-api-ts/destiny2';
import { PlatformErrorCodes } from 'bungie-api-ts/destiny2';

export class BungieApiError extends Error {
  constructor(
    public errorCode: PlatformErrorCodes,
    public errorStatus: string,
    public apiResponse: ServerResponse<unknown>,
  ) {
    super(errorCode + ': ' + errorStatus);
  }
}

export const getNiceMessageFromBungieError = (error: BungieApiError) => {
  if (error.errorCode === PlatformErrorCodes.SystemDisabled) {
    return 'The Bungie API is currently disabled.';
  }
  return `${error.errorCode} ${error.errorStatus}`;
};

export interface BungieHttpClientOptions {
  apiKey: string;
  apiOrigin: string;
  accessToken?: string;
  cf?: RequestInitCfProperties;
}

export const getBungieHttpClient = (options: BungieHttpClientOptions) => {
  const copiedOptions = { ...options };

  const client = async (config: HttpClientConfig): Promise<any> => {
    const headers: Record<string, string> = {
      'X-API-Key': copiedOptions.apiKey,
      Origin: copiedOptions.apiOrigin,
    };
    if (copiedOptions.accessToken) {
      headers.Authorization = `Bearer ${copiedOptions.accessToken}`;
    }

    const url = new URL(config.url);
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        url.searchParams.set(key, value);
      }
    }

    console.log(config.method, url.toString());

    const result = await fetch(url.toString(), {
      method: config.method,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      cf: copiedOptions.cf,
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

  client.injectAccessToken = (accessToken: string) => {
    copiedOptions.accessToken = accessToken;
  };

  return client;
};
