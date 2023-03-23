type TimestampFormat = keyof typeof timestampFormats;

const timestampFormats = {
  relative: 'R',
  shortDate: 'd',
  longDate: 'D',
  shortDateTime: 'f',
  longDateTime: 'F',
  time: 't',
  timeWithSeconds: 'T',
};

export const getDiscordTimestamp = (date: Date | null, format: TimestampFormat) => {
  return date ? `<t:${Math.floor(date.valueOf() / 1000)}:${timestampFormats[format]}>` : 'never';
};
