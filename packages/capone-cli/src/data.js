import {join as pathJoin} from 'path';
import {readFile, createReadStream, statSync} from 'fs';
import globHashes from 'files-hash';
import fetch from 'node-fetch';
import {Promise as BluebirdPromise} from 'bluebird';
import {sample} from 'lodash';
import {createHash} from 'crypto';

const STORAGE_HOSTNAME = 'https://f000.backblazeb2.com';

export async function gatherFiles({cwd}) { // TODO: Slow?
  const hashes = await globHashes('**/*', {
    cwd: cwd,
    ignore: [
      '.*',
      '**/node_modules/**/*',
      '**/bower_components/**/*'
    ]
  });

  return Object.keys(hashes).map((key) => {
    return {
      key: key,
      contentSha1: hashes[key],
      contentLength: statSync(key).size
    };
  });
}

export function createDeployment({api}, attributes) {
  return api(`/deployments`, {
    method: 'post',
    body: JSON.stringify(attributes)
  });
}

const readFilePromise = BluebirdPromise.promisify(readFile);

async function uploadFile(context, file) {
  context.write(`Uploading ${file.key}\n`);
  const {uploadUrl, authorizationToken} = sample(file.uploadUrls);
  const localKey = pathJoin(context.cwd, file.key);
  const data = createReadStream(localKey);
  const response = await fetch(uploadUrl, {
    timeout: 30 * 1000,
    method: 'post',
    body: data,
    headers: {
      'Authorization': authorizationToken,
      'Content-Type': file.contentType,
      'Content-Length': file.contentLength,
      'X-Bz-Content-Sha1': file.contentSha1,
      'X-Bz-File-Name': file.storageKey
    },
  });

  const storage = await response.json();

  if (storage.status && storage.status !== 200) {
    throw new Error(storage.message);
  }

  return context.api(`/files/${file.id}`, {
    method: 'patch',
    body: JSON.stringify({
      storageUrl: `${STORAGE_HOSTNAME}/b2api/v1/b2_download_file_by_id?fileId=${storage.fileId}`
    })
  });
}

export function uploadFiles(context, files, {concurrency}) {
  return BluebirdPromise.map(
    files,
    (file) => uploadFile(context, file),
    {concurrency}
  );
}

export function updateSite({api}, siteId, attributes) {
  return api(`/sites/${siteId}`, {
    method: 'patch',
    body: JSON.stringify(attributes)
  });
}
