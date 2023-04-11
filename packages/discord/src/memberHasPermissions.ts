import type { APIInteractionGuildMember } from 'discord-api-types/v10';
import { PermissionFlagsBits } from 'discord-api-types/v10';

type PermissionName = keyof typeof PermissionFlagsBits;

export const memberHasPermissions = (member: APIInteractionGuildMember, permissions: PermissionName[]) => {
  return permissions.some((permissionName) => {
    const permissionBit = PermissionFlagsBits[permissionName];
    const userPermissions = BigInt(member.permissions);
    return (permissionBit & userPermissions) === permissionBit;
  });
};
