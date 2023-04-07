import type { APIMessage } from 'discord-api-types/v10';
import { RouteBases } from 'discord-api-types/v10';

export const getUrlForMessage = (guildId: string, message: Pick<APIMessage, 'channel_id' | 'id'>) => {
  return `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
};

export const getUrlForChannel = (guildId: string, channelId: string) => {
  return `https://discord.com/channels/${guildId}/${channelId}`;
};

type ValidAvatarSize = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;

export const getDiscordAvatarUrl = (guildId: string, userId: string, hash: string, size: ValidAvatarSize) =>
  RouteBases.cdn + `/guilds/${guildId}/users/${userId}/avatars/${hash}.png?size=${size}`;
