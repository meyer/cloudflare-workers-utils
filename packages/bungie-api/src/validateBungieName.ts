import { invariant } from '@workers-utils/common';

const bungieNameRegex = /^(.+)#(\d{1,4})$/i;

export const validateBungieName = (name: string) => {
  const bungieNameMatches = bungieNameRegex.exec(name) as any as [string, string, string] | null;
  invariant(bungieNameMatches, 'Invalid Bungie name provided');
  const [, displayName, displayNameCodeString] = bungieNameMatches;
  const displayNameCode = parseInt(displayNameCodeString, 10);
  return { displayName, displayNameCode };
};
