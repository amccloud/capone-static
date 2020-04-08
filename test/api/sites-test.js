import {assert} from 'chai';
import supertest from 'supertest-as-promised';
import nock from 'nock';
import * as factories from '../factories';
import api from '../../src/api/api';
import {Site} from '../../src/api/db';

const MOCK_API_KEY = 'mockapikey';
const MOCK_FASTLY_API_KEY = 'mockfastlyapikey';
const MOCK_FASTLY_SERVICE_ID = 'mockfastlyserviceid';

const app = api();

app.on('error', (error) => {
  console.error(error.stack);
});

const agent = supertest(app.listen());

describe('PATCH /sites/:siteId', () => {
  beforeEach(async () => {
    await factories.site({
      name: 'hello',
      lastDeploymentId: 1,
      owner: {
        apiKey: MOCK_API_KEY
      }
    });

    nock('https://api.fastly.com', {
      reqheaders: {
        'Fastly-Key': MOCK_FASTLY_API_KEY
      }
    }).post(`/service/${MOCK_FASTLY_SERVICE_ID}/purge/site-1`)
      .reply(200, {
        status: 'ok'
      });
  });

  it('responds with a 401 when not authenticated', async () => {
    const response = await patchSite(null, 1);
    assert.equal(response.status, 401);
  });

  it('responds with a 403 when not authorized', async () => {
    const response = await patchSite('fakeapikey', 1);
    assert.equal(response.status, 403);
  });

  it('responds with 200', async () => {
    const response = await patchSite(MOCK_API_KEY, 1, {
      headDeploymentId: 1,
      domain: 'hello.dev'
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      id: 1,
      name: 'hello',
      domain: 'hello.dev',
      lastDeploymentId: 1,
      headDeploymentId: 1,
      ownerId: 1
    });
  });
});

async function patchSite(apiKey, siteId, attributes) {
  let request = agent.patch(`/v1/sites/${siteId}`);

  if (apiKey) {
    request = request.set('Authorization', apiKey);
  }

  return await request.send(attributes);
}
