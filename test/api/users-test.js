import {assert} from 'chai';
import supertest from 'supertest-as-promised';
import * as factories from '../factories';
import api from '../../src/api/api';

const app = api();

describe('POST /users', () => {
  it('responds with 201 for the first time', async () => {
    const response = await supertest(app.listen())
      .post(`/v1/users`)
      .send({
        user: {
          email: 'andrew@amccloud.com',
          password: 'HunT3r!'
        }
      });

    // TODO: Find a better way to handle this
    delete response.body.apiKey;
    delete response.body.createdAt;
    delete response.body.updatedAt;

    assert.equal(response.status, 201);
    assert.deepEqual(response.body, {
      id: 1,
      name: null,
      email: 'andrew@amccloud.com'
    });
  });

  it('responds with 200 for existing users', async () => {
    const credentials = {
      email: 'andrew@amccloud.com',
      password: '$2a$10$4QF8xoKTiWEZgE2UYZwkKOIyzZcosUZTOSCyM//81iVNa7avaf9rK'
    };

    const user = await factories.user(credentials);
    const response = await supertest(app.listen())
      .post(`/v1/users`)
      .send({user: {
        email: 'andrew@amccloud.com',
        password: 'HunT3r!'
      }});

    // TODO: Find a better way to handle this
    delete response.body.createdAt;
    delete response.body.updatedAt;

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      id: 1,
      name: null,
      email: 'andrew@amccloud.com',
      apiKey: '1234'
    });
  });
});
