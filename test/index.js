import {sequelize} from '../src/api/db';

beforeEach(async function cleanDatabase() {
  await sequelize.sync({force: true});
});
