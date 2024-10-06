import { PublicMessageError } from './errors.js';

export const getPublicMessageFromError = async (
  error: unknown,
  fallbackMessage = 'Something went wrong',
): Promise<string> => {
  try {
    if (error instanceof PublicMessageError) {
      return error.message;
    }

    if (error instanceof Response) {
      console.error('URL `%s` responded with a non-200 error code: %s %s', error.url, error.status, error.statusText);
      if (!error.bodyUsed) {
        console.error('Response text: %s', await error.text());
      }
    } else if (error instanceof Error) {
      console.error('%s: %s', error.name, error.message, { cause: error.cause || null, stack: error.stack });
    } else {
      console.error('A weird error occurred: %s', error, error);
    }
  } catch {
    //
  }
  return fallbackMessage;
};
