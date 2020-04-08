import {Client} from 'raven';

export default function sentry(dsn) {
  const client = new Client(dsn);

  return async function sentry(context, next) {
    try {
      await next(context);
    } catch (error) {
      client.captureException(error, (result) => {
        context.end(`Uh-oh!: ${client.getIdent(result)}\n`);
      });
    }
  }
}
