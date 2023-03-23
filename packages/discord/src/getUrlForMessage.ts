import type { APIMessage } from 'discord-api-types/v10';

export const getUrlForMessage = (guildId: string, message: APIMessage) => {
  return `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
};
