import type * as DAPI from 'discord-api-types/v10';
import { RouteBases, Routes } from 'discord-api-types/v10';

export type DiscordApiClient = ReturnType<typeof getDiscordApiClient>;

interface DiscordRestOptions {
  botToken: string;
  applicationId: string;
}

// biome-ignore lint/complexity/noBannedTypes: intentional usage
type AnyNonNullishValue = {};

/** Return a tuple containing type `T`. If all values in `T` are nullable, `T` is marked as optional. */
type MakeArgTupleForObject<T, Args extends any[] = []> = T extends void
  ? [arg?: undefined, ...args: Args]
  : {
        [K in keyof T]-?: T[K] extends AnyNonNullishValue ? K : never;
      }[keyof T] extends never
    ? [arg?: T, ...args: Args]
    : [arg: T, ...args: Args];

export class DiscordResponseError extends Error {
  constructor(
    public response: Response,
    public responseText: string,
  ) {
    super(response.status + ' ' + response.statusText + ': ' + responseText);
  }
}

// workaround for this error:
//   The inferred type of 'getDiscordApiClient' cannot be named without a reference
//   to 'packages/discord/node_modules/discord-api-types/utils/internals.js'.
//   This is likely not portable. A type annotation is necessary.
//
// I think it's because discord-api-types does not directly export `DistributiveOmit`,
// though the path starting with "packages/discord" seems awfully sus.
type PostChannelsBody = {
  [K in keyof DAPI.RESTPostAPIGuildChannelJSONBody]: DAPI.RESTPostAPIGuildChannelJSONBody[K];
};

export const getDiscordApiClient = (options: DiscordRestOptions) => {
  const headers = {
    Authorization: `Bot ${options.botToken}`,
    'Content-Type': 'application/json',
  };

  const apiPrefix = RouteBases.api;

  const buildHandler =
    <TBody, TReturnType, TQueryParams extends Record<string, any> = never>(
      method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT',
    ) =>
    <TRouteFn extends (...params: any[]) => string>(getRoute: TRouteFn) =>
    async (
      params: Parameters<TRouteFn>,
      ...args: MakeArgTupleForObject<TBody, [queryParams?: TQueryParams]>
    ): Promise<TReturnType> => {
      const route = getRoute(...params);
      const body = args[0];
      const queryParams = args[1];

      const url = new URL(`${apiPrefix}${route}`);

      const init: RequestInit<RequestInitCfProperties> = {
        headers,
        method,
      };

      if (body) {
        if (method === 'GET') {
          for (const [key, value] of Object.entries(body)) {
            url.searchParams.set(key, value + '');
          }
        } else {
          init.body = JSON.stringify(body);
          if (queryParams) {
            for (const [key, value] of Object.entries(queryParams)) {
              url.searchParams.set(key, value + '');
            }
          }
        }
      }

      const response = await fetch(url.toString(), init);
      const responseText = await response.text();
      if (response.status < 200 || response.status > 299) {
        throw new DiscordResponseError(response, responseText);
      }

      // no content
      if (response.status === 204) {
        return null as any;
      }

      try {
        return JSON.parse(responseText);
      } catch (error) {
        console.error('JSON parse error for the following content: `' + responseText + '`');
        throw error;
      }
    };

  const deleteChannelMessage = buildHandler<void, DAPI.RESTDeleteAPIChannelMessageResult>('DELETE')(
    Routes.channelMessage,
  );

  const postWebhookMessage = buildHandler<
    DAPI.RESTPostAPIWebhookWithTokenJSONBody,
    DAPI.RESTPostAPIWebhookWithTokenResult | DAPI.RESTPostAPIWebhookWithTokenWaitResult,
    DAPI.RESTPostAPIWebhookWithTokenQuery
  >('POST')(Routes.webhook);

  const patchWebhookMessage = buildHandler<
    DAPI.RESTPatchAPIInteractionOriginalResponseJSONBody,
    DAPI.RESTPatchAPIInteractionOriginalResponseResult
  >('PATCH')(Routes.webhookMessage);

  const getWebhookMessage = buildHandler<void, DAPI.RESTGetAPIInteractionOriginalResponseResult>('GET')(
    Routes.webhookMessage,
  );

  const postFollowupWebhookMessage = buildHandler<
    DAPI.RESTPostAPIWebhookWithTokenJSONBody,
    DAPI.RESTPostAPIWebhookWithTokenResult
  >('POST')(Routes.webhook);

  const patchChannel = buildHandler<DAPI.RESTPatchAPIChannelJSONBody, DAPI.RESTPatchAPIChannelResult>('PATCH')(
    Routes.channel,
  );

  const postThreadWithMessage = buildHandler<
    DAPI.RESTPostAPIChannelMessagesThreadsJSONBody,
    DAPI.RESTPostAPIChannelMessagesThreadsResult
  >('POST')(Routes.threads);

  const postChannelMessages = buildHandler<
    DAPI.RESTPostAPIChannelMessageJSONBody,
    DAPI.RESTPostAPIChannelMessageResult
  >('POST')(Routes.channelMessages);

  const putThreadMembers = buildHandler<void, DAPI.RESTPutAPIChannelThreadMembersResult>('PUT')(Routes.threadMembers);

  const deleteThreadMember = buildHandler<void, DAPI.RESTDeleteAPIChannelThreadMembersResult>('DELETE')(
    Routes.threadMembers,
  );

  const patchChannelMessage = buildHandler<
    DAPI.RESTPatchAPIChannelMessageJSONBody,
    DAPI.RESTPatchAPIChannelMessageResult
  >('PATCH')(Routes.channelMessage);

  const getGuild = buildHandler<DAPI.RESTGetAPIGuildQuery, DAPI.RESTGetAPIGuildResult>('GET')(Routes.guild);

  const getGuilds = buildHandler<DAPI.RESTGetAPICurrentUserGuildsQuery, DAPI.RESTGetAPICurrentUserGuildsResult>('GET')(
    Routes.userGuilds,
  );

  const getChannel = buildHandler<void, DAPI.RESTGetAPIChannelResult>('GET')(Routes.channel);
  const getChannels = buildHandler<void, DAPI.RESTGetAPIGuildChannelsResult>('GET')(Routes.guildChannels);
  const postChannels = buildHandler<PostChannelsBody, DAPI.RESTPostAPIGuildChannelResult>('POST')(Routes.guildChannels);

  const getChannelWebhooks = buildHandler<void, DAPI.RESTGetAPIChannelWebhooksResult>('GET')(Routes.channelWebhooks);
  const postChannelWebhooks = buildHandler<
    DAPI.RESTPostAPIChannelWebhookJSONBody,
    DAPI.RESTPostAPIChannelWebhookResult
  >('POST')(Routes.channelWebhooks);

  const deleteChannel = buildHandler<void, DAPI.RESTDeleteAPIChannelResult>('DELETE')(Routes.channel);

  const putGuildCommands = buildHandler<
    DAPI.RESTPutAPIApplicationGuildCommandsJSONBody,
    DAPI.RESTPutAPIApplicationGuildCommandsResult
  >('PUT')(Routes.applicationGuildCommands.bind(null, options.applicationId));

  const getUser = buildHandler<void, DAPI.RESTGetAPIUserResult>('GET')(Routes.user);

  const getGuildMember = buildHandler<void, DAPI.RESTGetAPIGuildMemberResult>('GET')(Routes.guildMember);

  const getGuildMembers = buildHandler<DAPI.RESTGetAPIGuildMembersQuery, DAPI.RESTGetAPIGuildMembersResult>('GET')(
    Routes.guildMembers,
  );

  const patchGuildMember = buildHandler<DAPI.RESTPatchAPIGuildMemberJSONBody, DAPI.RESTPatchAPIGuildMemberResult>(
    'PATCH',
  )(Routes.guildMember);

  const getRoleConnectionMetadata = buildHandler<void, DAPI.RESTGetAPIApplicationRoleConnectionMetadataResult>('GET')(
    Routes.applicationRoleConnectionMetadata.bind(null, options.applicationId),
  );

  const putRoleConnectionMetadata = buildHandler<
    DAPI.RESTPutAPIApplicationRoleConnectionMetadataJSONBody,
    DAPI.RESTPutAPIApplicationRoleConnectionMetadataResult
  >('PUT')(Routes.applicationRoleConnectionMetadata.bind(null, options.applicationId));

  return {
    applicationId: options.applicationId,

    deleteChannel,
    deleteChannelMessage,
    deleteThreadMember,
    getChannel,
    getChannels,
    getChannelWebhooks,
    getGuild,
    getGuildMember,
    getGuildMembers,
    getGuilds,
    getUser,
    getRoleConnectionMetadata,
    getWebhookMessage,
    patchChannel,
    patchChannelMessage,
    patchGuildMember,
    patchWebhookMessage,
    postChannelMessages,
    postChannels,
    postChannelWebhooks,
    postFollowupWebhookMessage,
    postThreadWithMessage,
    postWebhookMessage,
    putGuildCommands,
    putRoleConnectionMetadata,
    putThreadMembers,
  };
};
