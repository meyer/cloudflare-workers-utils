import type { DestinyColor } from 'bungie-api-ts/destiny2';

export const destinyColorToRgba = ({ red, green, blue, alpha }: DestinyColor): string => {
  const alphaPercentage = (alpha / 255) * 100;
  return `rgba(${red}, ${green}, ${blue}, ${alphaPercentage.toFixed(0)}%)`;
};
