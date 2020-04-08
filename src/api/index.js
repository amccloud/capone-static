import api from './api';
import raven from 'raven';

const app = api();
const sentry = new raven.Client();

app.on('error', (error) => {
  sentry.captureException(error);
  console.error(error.stack); // eslint-disable-line no-console
});

app.listen(process.env.PORT || 3000);
