import {assert} from 'chai';
import supertest from 'supertest-as-promised';
import * as factories from '../factories';
import api from '../../src/api/api';

const MOCK_API_KEY = 'mockapikey';
const MOCK_STORAGE_URL = 'https://f000.backblaze.com/b2api/v1/b2_download_file_by_id?fileId=4_z321eb51bacdae214581c0d1d_f1189dc406f02d42d_d20151227_m090601_c000_v0001014_t0004';

const app = api();

app.on('error', (error) => {
  console.error(error.stack);
});

const agent = supertest(app.listen());

describe('PATCH /files/:fileId', () => {
  beforeEach(async () => {
    const owner = await factories.user({apiKey: MOCK_API_KEY});
    await factories.file({
      site: {
        ownerId: owner.id
      }
    });
  });

  it('responds with a 401 when not authenticated', async () => {
    const response = await patchFile(null, 1);
    assert.equal(response.status, 401);
  });

  it('responds with a 403 when not authorized', async () => {
    const response = await patchFile('fakeapikey', 1);
    assert.equal(response.status, 403);
  });

  it('responds with 200', async () => {
    const response = await patchFile(MOCK_API_KEY, 1, {
      storageUrl: MOCK_STORAGE_URL
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.storageUrl, MOCK_STORAGE_URL);
  });
});

async function patchFile(apiKey, fileId, attributes) {
  let request = agent.patch(`/v1/files/${fileId}`);

  if (apiKey) {
    request = request.set('Authorization', apiKey);
  }

  return await request.send(attributes);
}
