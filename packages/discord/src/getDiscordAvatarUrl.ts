import { RouteBases } from 'discord-api-types/v10';

type ValidAvatarSize = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;

export const getDiscordAvatarUrl = (guildId: string, userId: string, hash: string, size: ValidAvatarSize) =>
  RouteBases.cdn + `/guilds/${guildId}/users/${userId}/avatars/${hash}.png?size=${size}`;
