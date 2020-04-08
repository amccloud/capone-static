import {readdirSync} from 'fs';
import {join} from 'path';
import invariant from 'invariant';
import Sequelize from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL;

invariant(DATABASE_URL, 'DATABASE_URL needs to be defined in the environment.');

const sequelize = new Sequelize(DATABASE_URL, {
  timestamps: false,
  logging: (process.env.NODE_ENV === 'test') ? false : console.log // eslint-disable-line no-console
});

sequelize.sync();

const models = readdirSync(__dirname)
  .filter((file) => file !== 'index.js')
  .reduce((models, file) => {
    let Model = sequelize.import(join(__dirname, file));

    if ('associate' in Model) {
      Model.associate(db);
    }

    models[Model.name] = Model;

    return models;
  }, {});

module.exports = {
  ...models,
  sequelize
};
