import koa from 'koa';
import koaBody from 'koa-body';
import koaRouter from 'koa-router';

import {
  userForApiKey,
  userForCredentials,
  siteForNextDeployment,
  buildNewFiles,
  createFiles,
  updateFile,
  updateSite,
  buildMissingFiles,
  purgeSiteCache
} from './data';

function* requireAuth(next) {
  const apiKey = this.get('Authorization');

  if (!apiKey) {
    return this.status = 401;
  }

  try {
    this.user = yield userForApiKey(apiKey);
  } catch (error) {
    return this.status = 403;
  }

  yield next;
}

export default function api() {
  const router = koaRouter();

  router.post('/v1/users', function* postUser() {
    const {email, password} = this.request.body.user;
    const [user, created] = yield userForCredentials({email, password});
    this.status = (created) ? 201 : 200;
    this.body = user;
  });

  router.post('/v1/deployments', requireAuth, function* postDeployment() {
    const site = yield siteForNextDeployment(this.user.id, this.request.body.siteName);
    const newFiles = yield buildNewFiles(site, this.request.body.files);
    const createdFiles = yield createFiles(newFiles);
    const missingFiles = yield buildMissingFiles(createdFiles);
    this.status = 201;
    this.body = {
      id: site.lastDeploymentId,
      siteId: site.id,
      missingFiles: missingFiles
    };
  });

  router.patch('/v1/files/:fileId', requireAuth, function* patchFile() {
    this.body = yield updateFile(this.user.id, this.params.fileId, {
      storageUrl: this.request.body.storageUrl
    });
  });

  router.patch('/v1/sites/:siteId', requireAuth, function* patchSite() {
    const {siteId} = this.params;
    const {headDeploymentId, domain} = this.request.body;
    const attributes = {headDeploymentId};

    if (domain) {
      attributes.domain = domain;
    }

    this.body = yield updateSite(this.user.id, siteId, attributes);

    // TODO: Add domain to fastly (limit 200)

    yield purgeSiteCache(siteId);
  });

  const app = koa();

  app.use(koaBody({jsonLimit: '10mb'}));
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
