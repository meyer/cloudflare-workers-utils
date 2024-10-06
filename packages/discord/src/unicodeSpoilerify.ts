const spoilerRegex = /(\|\|)(.+?)(\|\|)/g;

const spoilerTagReplaceCallback = (...matches: any[]) =>
  // `\u2588` is the unicode FULL BLOCK character.
  '\u2588'.repeat(
    Math.floor(
      // FULL BLOCK is almost two regular characters long, so we divide character length by 2.
      matches[2].length / 2,
    ),
  );

/** Replace Discord-formatted spoiler-wrapped text with something that can be used in more restrictive places (example: thread titles) */
export const unicodeSpoilerify = (content: string): string => content.replace(spoilerRegex, spoilerTagReplaceCallback);
