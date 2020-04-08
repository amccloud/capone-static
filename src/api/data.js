import {randomBytes} from 'crypto';
import {hashSync, compareSync} from 'bcrypt';
import memoize from 'memoizee';
import B2 from 'backblaze-b2';
import Fastly from 'fastly';
import {lookup as mimeLookup} from 'mime-types';
import {User, Site, File, sequelize} from './db';

const {
  CAPONE_HOSTNAME,
  B2_ACCOUNT_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_ID,
  FASTLY_API_KEY,
  FASTLY_SERVICE_ID
} = process.env;

// TODO: Make sure all environment variables are set

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

const b2 = new B2({
  accountId: B2_ACCOUNT_ID,
  applicationKey: B2_APPLICATION_KEY
});

const fastly = Fastly(FASTLY_API_KEY);

export async function userForApiKey(apiKey) {
  const row = await User.find({
    where: {
      apiKey: apiKey
    }
  })

  return row.toJSON();
}

export async function userForCredentials({email, password}) {
  const [row, created] = await User.findOrCreate({
    where: {
      email: email
    },
    defaults: {
      password: hashSync(password, 10),
      apiKey: randomBytes(32).toString('hex')
    }
  });

  const {password:passwordHash, ...user} = row.toJSON();

  if (!created && !compareSync(password, passwordHash)) {
    throw new Error('Invalid credentials');
  }

  return [user, created];
}

export async function siteForNextDeployment(ownerId, siteName) {
  const attributes = {ownerId, name: siteName};
  const [prevSite, created] = await Site.findOrCreate({
    where: attributes,
    defaults: {
      domain: `${siteName}.${CAPONE_HOSTNAME}`
    }
  });

  const nextSite = await prevSite.increment('lastDeploymentId');

  return nextSite.toJSON();
}

export async function buildNewFiles(site, files) {
  const existingFiles = await findExistingFiles(site.id, files);
  return files.map((file) => {
    const existingFile = existingFiles[file.contentSha1];

    return {
      ...file,
      siteId: site.id,
      deploymentId: site.lastDeploymentId,
      contentType: mimeLookup(file.key) || DEFAULT_CONTENT_TYPE,
      storageUrl: (existingFile && existingFile.storageUrl) || null
    };
  });
}

export async function createFiles(files) {
  const fileRows = await File.bulkCreate(files, {returning: true});
  return fileRows.map((file) => file.toJSON());
}

export async function updateFile(userId, fileId, attributes) {
  const allowedSiteIds = await Site.findAll({
    where: {
      ownerId: userId
    }
  }).map((site) => site.id);

  const results = await File.update(attributes, {
    returning: true,
    where: {
      id: fileId,
      siteId: allowedSiteIds // Pre-condition?
    }
  });

  return results[1][0].toJSON();
}

export async function updateSite(userId, siteId, attributes) {
  const results = await Site.update(attributes, {
    returning: true,
    where: {
      id: siteId,
      ownerId: userId // Pre-condition?
    }
  });

  return results[1][0].toJSON();
}

export function buildMissingFiles(files) {
  return Promise.all(
    files
      .filter((file) => !file.storageUrl)
      .map(toMissingFile)
  );
}

export async function toMissingFile(file) {
  await b2AuthorizationFromCache();
  const uploadUrls = await getUploadUrls(2);
  return {
    ...file,
    storageKey: `${file.siteId}/${file.contentSha1}`,
    uploadUrls: uploadUrls.map(({uploadUrl, authorizationToken}) => {
      return {uploadUrl, authorizationToken};
    })
  };
}

export function purgeSiteCache(siteId) {
  const cacheKey = cacheKeyForSiteId(siteId);

  return new Promise((resolve, reject) => {
    fastly.purgeKey(FASTLY_SERVICE_ID, cacheKey, (error, response) => {
      if (error) { return reject(error); }
      resolve(response);
    });
  });
}

function cacheKeyForSiteId(siteId) {
  return `site-${siteId}`;
}

async function findExistingFiles(siteId, files) {
  const existingFileRows = await File.findAll({
    attributes: ['contentSha1', 'storageUrl'],
    where: {
      siteId: siteId,
      contentSha1: files.map((file) => file.contentSha1),
      storageUrl: {
        $ne: null
      }
    }
  });

  // Create index by contentSha1
  return existingFileRows
    .map((file) => file.toJSON())
    .reduce(
      (index, {contentSha1, ...file}) => {
        index[contentSha1] = file;
        return index;
      },
    {});
}

async function getUploadUrls(count) {
  return await Promise.all(
    Array(count).fill().map(() => {
      return b2.getUploadUrl(B2_BUCKET_ID);
    })
  );
}


async function b2Authorization() {
  return await b2.authorize();
}

const b2AuthorizationFromCache = memoize(b2Authorization, {
  maxAge: 1000 * 60 * 60, // 1-hour,
  preFetch: true
});
