import invariant from 'invariant';
import Application from './application';
import Router from './router';
import sentry from './middleware/sentry';
import api from './middleware/api';
import requireAuth from './middleware/requireAuth';
import {gatherFiles, createDeployment, uploadFiles, updateSite} from './data';

const app = new Application();
const router = new Router();

app.use(sentry('https://7161c1b55e0a49e3aa9c47955a2efe9f@app.getsentry.com/66033'))
app.use(api({prefix: 'https://api.caponeapp.com/v1'}));
app.use(requireAuth());
app.use(
  router.get('/deploy', async function(context) {
    const concurrency = 20;
    const {site, domain} = context.query;

    invariant(site, '--site=<name> required');

    context.write('Gathering files\n');
    const files = await gatherFiles(context);

    context.write('Creating new deployment\n');
    const deployment = await createDeployment(context, {files, siteName: site});
    context.write(`Deployment #${deployment.id} created\n`);

    try {
      const uploadedFiles = await uploadFiles(context, deployment.missingFiles, {concurrency});
    } catch (error) {
      context.end(`Aborting deployment #${deployment.id}\n${error.stack}\n`);
      throw error;
    }

    const newSite = {headDeploymentId: deployment.id};

    if (domain) {
      newSite.domain = domain;
    }

    context.write(`Publishing deployment #${deployment.id}\n`);
    await updateSite(context, deployment.siteId, newSite);

    context.end('Done!\n');
  })
);

export default app;
