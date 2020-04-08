# TODO

- Error handling!
- Landing page
- Start a blog
  - http://www.yes-www.org
  - https://news.ycombinator.com/user?id=tedkimble
  - https://news.ycombinator.com/user?id=programminggeek
  - http://jekyllthemes.io/
  - https://wrapbootstrap.com/
- Purge cache for only the files that changed
- Reorganize project

# Painlessly deploy static sites built with ________

[Get Started]

Getting started is simple:

# Install capone-cli
```bash
npm install -g capone-cli
```

# Deploy your static site in seconds
```bash
cd ~/hello-world
capone deploy --site=hello-world --domain capone.amccloud.com
open http://capone.amccloud.com
```

[View capone-cli documentation] for more information.

~ or ~

Deploy from GitHub

~ or ~

(Drag and drop static site folder)

--------------------------------------------------------------------------------

- Instant Deploys
- Instant Rollback
- CDN
- Continuous Deployment
- Custom Error Pages
- Custom Domain
- Custom HTTP Headers
- Password Protection
- SSL
- Webhooks?

--------------------------------------------------------------------------------

Capone works with all popular static site generators.

- Jekyll
- Middleman
- Metalsmith
- Etc.

--------------------------------------------------------------------------------

Getting started is simple. Be up and running in minutes. [Get Started]

--------------------------------------------------------------------------------

Proudly hosted by Capone

--------------------------------------------------------------------------------
# Competitors
- http://netlify.com
- http://surge.sh
- https://www.firebase.com/hosting.html

# Capone vs. Github Pages
- Git not necessary

# Capone vs. Surge
- Actual CDN

# Capone vs. Netlify
- Does not rewrite your html
- Faster?

--------------------------------------------------------------------------------

# Expenses
- Storage is $0.005/gb/m
- BW is $0.06/gb
- Payment is 2.9% + $0.30

# Pricing
- Hobbyist
  - Free
  - 100mb 1gb/m/s
  - no custom domain
  - github public

- Small
  - $10/m/s
  - 5gb 50gb/m/s
  - custom domains
  - github private

- Medium
  - $25/m/s
  - 100gb 100gb/m/s
  - custom domains
  - github private

- Large
  - $50/m/s
  - 100gb 1tb/m/s
  - custom domains
  - github private

--------------------------------------------------------------------------------
# Marketing Ideas

- B2 Featured Application?
- Envato Themes?
- Blog post "How I Almost Didn't Launch"

--------------------------------------------------------------------------------
# Topology
- .caponeapp.com > global-nossl.fastly.net > nginx router > b2 storage
- custom > capone.map.fastly.net > nginx router > b2 storage

# Todo
- Explore CNAME .caponeapp.com > global-nossl.fastly.net

# API
```
>>> POST /sites/{siteId}/deployments
{
  "files": {
    "/index.html": {
      "contentSha1": "hash",
      "contentLength": "400"
    }
  }
}

  >>> GET https://apiNNN.backblaze.com/b2api/v1/b2_get_upload_url
  Authorization: {b2AuthToken}
  {
    "bucketId": "{site.bucketId}"
  }

  <<< {
    "bucketId" : "4a48fe8875c6214145260818",
    "uploadUrl" : "https://pod-000-1005-03.backblaze.com/b2api/v1/b2_upload_file?cvt=c001_v0001005_t0027&bucket=4a48fe8875c6214145260818",
    "authorizationToken" : "2_20151009170037_f504a0f39a0f4e657337e624_9754dde94359bd7b8f1445c8f4cc1a231a33f714_upld"
  }

  >>> INSERT INTO deployments VALUES ({site.id});
  <<< {"id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "siteId": {site.id}}

  >>> INSERT INTO files VALUES (
        {site.id},
        {file.contentSha1},
        {contentType},
        {file.contentLength}
      ) ON CONFLICT (siteId, contentSha1) DO NOTHING;

  <<< SELECT id FROM files WHERE siteId={site.id} AND contentSha1 IN (files.map(&:contentSha1));
  >>> []

  >>> INSERT INTO deploymentFiles VALUES ({deployment.id}, {file.id}, {key});

<<< {
  "id": "1",
  "publishUrl": "/sites/{siteId}/deployments/1/publish",
  "missingFiles": {
    "/index.html": {
      "uploadUrl": "{uploadUrl}",
      "authorizationToken": "{authorizationToken}",
      "contentSha1": "hash",
      "contentType": "text/html",
      "contentLength": 400
    }
  }
}

>>> POST {uploadUrl}

Authorization: {authorizationToken}
X-Bz-File-Name: {key}
X-Bz-Content-Sha1: {contentSha1}
Content-Type: {contentType}
Content-Length: {contentLength}

@FILE_CONTENTS@

<<<
>>> POST {publishUrl}

  >>> POST https://api.fastly.com/service/{FASTLY_SERVICE_ID}/purge/site-{site.id}-head
  Fastly-Key: {FASTLY_API_KEY}

  <<< {
    "status":"ok"
  }
<<<

```

## Edge Cases

- Large project
- Filename with to extensions
- Long filename
