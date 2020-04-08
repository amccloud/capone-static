import {User, Site, File} from '../src/api/db';

export async function user(attributes) {
  const row = await User.create({
    email: 'andrew@example.org',
    password: 'password',
    apiKey: '1234',
    ...attributes
  })

  return row.toJSON();
}

export async function site(attributes) {
  const {id: ownerId} = await user(attributes.owner);
  const row = await Site.create({
    lastDeploymentId: 0,
    ownerId,
    ...attributes
  });

  return row.toJSON();
}

export async function file(attributes) {
  const {id: siteId} = await site(attributes.site);
  const row = await File.create({
    siteId,
    ...attributes
  });

  return row.toJSON();
}