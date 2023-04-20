import type { CoreSettingsConfiguration } from 'bungie-api-ts/core';
import { z } from 'zod';

export type ContentStackArticle = Awaited<ReturnType<typeof getLatestArticlesFromContentStack>>[number];

export type ContentStackSettings = Awaited<ReturnType<typeof getContentStackSettings>>;

const articleSchema = z
  .object({
    subtitle: z.string(),
    author: z.string(),
    date: z.string(),
    title: z.string(),
    url: z.object({
      hosted_url: z.string(),
    }),

    system: z.object({
      uid: z.string(),
      publish_details: z.object({
        time: z.string(),
      }),
    }),
  })
  .transform((item) => {
    const date = new Date(item.date.trim());

    // common article fields
    const articleWithDefaults = {
      title: item.title.trim(),
      subtitle: item.subtitle.trim(),
      url: 'https://www.bungie.net/7/en/news/article' + item.url.hosted_url.trim(),
      author: item.author.trim(),
      date,
      publishDate: item.system.publish_details.time.trim(),
      uid: item.system.uid.trim(),
      type: 'news',
    } as const;

    const dateString = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'PST',
    });

    const twabMatch = item.title.match(twabRegex);
    if (twabMatch) {
      const twabTitle = 'TWAB — ' + dateString;
      return {
        ...articleWithDefaults,
        type: 'twab',
        title: twabTitle,
      } as const;
    }

    const hotfixMatch = item.title.match(hotfixRegex);
    if (hotfixMatch) {
      const hotfixTitle = 'Destiny 2 Hotfix ' + hotfixMatch[1];
      return {
        ...articleWithDefaults,
        type: 'hotfix',
        hotfixNumber: hotfixMatch[1],
        title: hotfixTitle,
      } as const;
    }

    const updateMatch = item.title.match(updateRegex);
    if (updateMatch) {
      const updateTitle = 'Destiny 2 Update ' + updateMatch[1];
      return {
        ...articleWithDefaults,
        type: 'update',
        updateNumber: updateMatch[1],
        title: updateTitle,
      } as const;
    }

    return articleWithDefaults;
  });

const articlesSchema = z.object({
  data: z.object({
    articles: z.object({
      items: z.array(articleSchema),
    }),
  }),
});

const twabRegex = /^This Week At Bungie\b/i;
const hotfixRegex = /^Destiny 2 Hotfix ([\d+.]+)$/i;
const updateRegex = /^Destiny 2 Update ([\d+.]+)$/i;

export const getContentStackSettings = async (settings: CoreSettingsConfiguration) => {
  // ContentStack API key lives here
  const contentstackParams = settings.systems.ContentStack?.parameters;
  if (typeof contentstackParams !== 'object' || !settings.systems.ContentStack) {
    throw new Error('ContentStack params missing');
  }

  // "ApiKey": "xxxxxxxxxxxxxxxxxxxxxx",
  // "EnvPlusDeliveryToken": "{live}{xxxxxxxxxxxxxxxxxxx}"
  const { ApiKey: csApiKey, EnvPlusDeliveryToken: csEnvPlusDeliveryToken } = settings.systems.ContentStack.parameters;
  if (typeof csApiKey !== 'string' || typeof csEnvPlusDeliveryToken !== 'string') {
    throw new Error('Missing ApiKey or EnvPlusDeliveryToken');
  }

  const envPlusDeliveryTokenRegex = /^{(.+?)}{(.+?)}$/;
  const match = csEnvPlusDeliveryToken.match(envPlusDeliveryTokenRegex);
  if (!match) {
    throw new Error('EnvPlusDeliveryToken format has changed: ' + csEnvPlusDeliveryToken);
  }

  const [, csEnv, csDeliveryToken] = match;
  // these should always be set but TypeScript doesn't speak regex
  if (!csEnv || !csDeliveryToken) {
    throw new Error('envPlusDeliveryTokenRegex error');
  }

  return { csEnv, csDeliveryToken, csApiKey };
};

const runCsGraphQlQuery = async (
  settings: ContentStackSettings,
  query: string,
  variables?: Record<string, unknown>
): Promise<unknown> => {
  const csUrl = 'https://graphql.contentstack.com/stacks/' + settings.csApiKey + '?environment=' + settings.csEnv;

  const result = await fetch(csUrl, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: settings.csDeliveryToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    method: 'POST',
  });

  return await result.json();
};

export const getLatestArticlesFromContentStack = async (settings: ContentStackSettings) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const articlesResponse = await runCsGraphQlQuery(
    settings,
    `
query ($date: String) {
  articles: all_news_article(where: {date_gt: $date}) {
    items {
      title
      subtitle
      date
      author
      system {
        uid
        publish_details {
          time
        }
      }
      url {
        hosted_url
      }
    }
    total
  }
}
`,
    {
      date: oneWeekAgo.toISOString(),
    }
  ).then((data) => articlesSchema.parse(data));

  return articlesResponse.data.articles.items;
};
