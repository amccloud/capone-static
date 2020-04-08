import {assert} from 'chai';
import supertest from 'supertest-as-promised';
import nock from 'nock';
import * as factories from '../factories';
import api from '../../src/api/api';
import {Site} from '../../src/api/db';

const MOCK_API_KEY = 'mockapikey';
const MOCK_AUTH_TOKEN = 'mockb2authtoken';
const MOCK_UPLOAD_URL = 'https://localhost';
const MOCK_STORAGE_URL = 'https://f000.backblaze.com/b2api/v1/b2_download_file_by_id?fileId=4_z321eb51bacdae214581c0d1d_f1189dc406f02d42d_d20151227_m090601_c000_v0001014_t0004';

const app = api();

app.on('error', (error) => {
  console.error(error.stack);
});

const agent = supertest(app.listen());

describe('POST /deployments', () => {
  beforeEach(async () => {
    await factories.user({apiKey: MOCK_API_KEY});
  });

  it('responds with a 401 when not authenticated', async () => {
    const response = await postDeployment(null);
    assert.equal(response.status, 401);
  });

  it('responds with a 403 when not authorized', async () => {
    const response = await postDeployment('fakeapikey');
    assert.equal(response.status, 403);
  });

  it('responds with all files missing for first deployment', async () => {
    const response = await postDeployment(MOCK_API_KEY, {
      siteName: 'hello',
      files: [{
        key: 'andrew.png',
        contentSha1: '95ab51ddc6a72a62527760b5e6b67eadcde86372',
        contentLength: 1000
      }]
    });

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, {
      id: 1,
      siteId: 1,
      missingFiles: [{
        id: 1,
        key: 'andrew.png',
        contentSha1: '95ab51ddc6a72a62527760b5e6b67eadcde86372',
        contentType: 'image/png',
        contentLength: 1000,
        storageKey: `1/95ab51ddc6a72a62527760b5e6b67eadcde86372`,
        storageUrl: null,
        uploadUrls: [
          {uploadUrl: MOCK_UPLOAD_URL, authorizationToken: MOCK_AUTH_TOKEN},
          {uploadUrl: MOCK_UPLOAD_URL, authorizationToken: MOCK_AUTH_TOKEN}
        ],
        deploymentId: 1,
        siteId: 1
      }]
    });
  });

  it('responds with unknown files missing', async () => {
    const {body: firstDeployment} = await postDeployment(MOCK_API_KEY, {
      siteName: 'hello',
      files: [{
        key: 'added.png',
        contentSha1: '95ab51ddc6a72a62527760b5e6b67eadcde86372',
        contentLength: 1000
      }]
    });

    await completeDeployment(MOCK_API_KEY, firstDeployment);

    const response = await postDeployment(MOCK_API_KEY, {
      siteName: 'hello',
      files: [{
        key: 'added.png',
        contentSha1: '95ab51ddc6a72a62527760b5e6b67eadcde86372',
        contentLength: 1000
      }, {
        key: 'added-duplicate.png',
        contentSha1: '95ab51ddc6a72a62527760b5e6b67eadcde86372',
        contentLength: 1000
      }, {
        key: 'added-unique.png',
        contentSha1: 'dcde8637272ae6b6795a60b56aeab51ddc625277',
        contentLength: 1000
      }]
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.missingFiles.length, 1);
    assert.equal(response.body.missingFiles[0].key, 'added-unique.png');
  });

  it('sets domain to default', async () => { // TODO: move me?
    await postDeployment(MOCK_API_KEY, {siteName: 'hello', files: []});
    const found = await Site.count({where: {domain: 'hello.caponeapp.dev'}});
    assert.equal(found, 1);
  });
});

async function postDeployment(apiKey, attributes) {
  nock('https://api.backblaze.com', {
    reqheaders: {
      'Authorization': 'Basic bW9ja2IyYWNjb3VudGlkOm1vY2tiMmFwcGxpY2F0aW9ua2V5'
    }
  }).get('/b2api/v1/b2_authorize_account')
    .reply(200, {
      accountId: '123456',
      apiUrl: 'https://api000.backblaze.com',
      authorizationToken: MOCK_AUTH_TOKEN,
      downloadUrl: 'https://f000.backblaze.com'
    });

  nock('https://api000.backblaze.com', {
    reqheaders: {
      'Authorization': MOCK_AUTH_TOKEN
    }
  }).post('/b2api/v1/b2_get_upload_url')
    .times(2)
    .reply(200, {
      authorizationToken: MOCK_AUTH_TOKEN,
      bucketId: 'mockb2bucketid',
      uploadUrl: MOCK_UPLOAD_URL
    });

  let request = agent.post('/v1/deployments');

  if (apiKey) {
    request = request.set('Authorization', apiKey);
  }

  return await request.send(attributes);
}

function completeDeployment(apiKey, deployment) {
  return Promise.all(deployment.missingFiles.map(async (missingFile) => {

    let request = agent.patch(`/v1/files/${missingFile.id}`);

    if (apiKey) {
      request = request.set('Authorization', apiKey);
    }

    return await request.send({storageUrl: MOCK_STORAGE_URL});
  }));
}
