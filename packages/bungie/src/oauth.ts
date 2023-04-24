const BUNGIE_OAUTH_TOKEN_URL = 'https://www.bungie.net/platform/app/oauth/token/';
const BUNGIE_OAUTH_AUTHORIZE_URL = 'https://www.bungie.net/en/OAuth/Authorize';

interface BungieOauthUrlOptions {
  clientId: string;
  secret: string;
}

/** Build the URL that kicks off the Bungie OAuth flow */
export const buildBungieOauthUrl = (options: BungieOauthUrlOptions) => {
  const bungieOauthUrl = new URL(BUNGIE_OAUTH_AUTHORIZE_URL);
  bungieOauthUrl.searchParams.set('response_type', 'code');
  bungieOauthUrl.searchParams.set('client_id', options.clientId);
  bungieOauthUrl.searchParams.set('state', options.secret);
  return bungieOauthUrl.toString();
};

export interface BungieOauthTokenResponse {
  access_token: string;
  /** "Bearer" */
  token_type: string;
  /** 3600 (1 day) */
  expires_in: number;
  refresh_token: string;
  /** 7776000 (90 days) */
  refresh_expires_in: number;
  membership_id: string;
}

interface BungieOauthTokenOptions extends BungieOauthUrlOptions {
  apiKey: string;
  apiOrigin: string;
}

/**
 * Fetch an auth token from the Bungie API
 *
 * https://github.com/Bungie-net/api/wiki/OAuth-Documentation#access-token-request
 */
export const getBungieOauthToken = async (
  options: BungieOauthTokenOptions,
  authorizationCode: string
): Promise<BungieOauthTokenResponse> => {
  const result = await fetch(BUNGIE_OAUTH_TOKEN_URL, {
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: options.clientId,
      client_secret: options.secret,
    }),
    headers: {
      'X-API-Key': options.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: options.apiOrigin,
    },
    method: 'POST',
    redirect: 'follow',
  });

  const responseText = await result.text();
  if (result.status !== 200) {
    throw new Error(result.status + ' ' + result.statusText + ': ' + responseText);
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error('Could not parse response text to JSON: `' + responseText + '`');
  }
};

/**
 * Get a newly-refreshed auth token from the Bungie API
 *
 * https://github.com/Bungie-net/api/wiki/OAuth-Documentation#refreshing-the-access-token
 */
export const refreshBungieOauthToken = async (
  options: BungieOauthTokenOptions,
  oldRefreshToken: string
): Promise<BungieOauthTokenResponse> => {
  const result = await fetch(BUNGIE_OAUTH_TOKEN_URL, {
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: oldRefreshToken,
      client_id: options.clientId,
      client_secret: options.secret,
    }),
    headers: {
      'X-API-Key': options.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: options.apiOrigin,
    },
    method: 'POST',
    redirect: 'follow',
  });

  const responseText = await result.text();
  if (result.status !== 200) {
    throw new Error(result.status + ' ' + result.statusText + ': ' + responseText);
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error('Could not parse response text to JSON: `' + responseText + '`');
  }
};
