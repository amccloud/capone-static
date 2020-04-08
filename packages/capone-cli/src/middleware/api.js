import fetch from 'node-fetch';

export default function api({prefix}) {
  return async function api(context, next) {
    prefix = context.query.api || prefix;

    context.api = async (resource, options) => {
      const response = await fetch(prefix + resource, {
        timeout: 30 * 1000,
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        },
      });

      const body = await response.text();

      try {
        return JSON.parse(body);
      } catch (error) {
        throw new Error(`${error.message}:\n\n${body}`);
      }
    };

    await next(context);
  }
}