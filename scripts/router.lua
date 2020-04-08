local url = require('socket.url')
local pgmoon = require('pgmoon')
local cjson = require('cjson')

function clean_path(path)
  return path:gsub('^/', ''):gsub('/$', '')
end

function database_from_url(database_url)
  local parsed = url.parse(database_url)
  local options = {}

  for key, value in pairs(parsed) do
    if not (value == nil) then
      if key == 'path' then
        options.database = clean_path(value)
      else
        options[key] = value
      end
    end
  end

  return pgmoon.new(options)
end

function find_site_by_domain(db, domain)
  -- TODO: Check if domain is allowed
  local results = db:query(
    string.format([[
      SELECT *
      FROM "sites"
      WHERE "domain"=%s
      LIMIT 1
    ]],
      db:escape_literal(domain)
    )
  )

  return results[next(results)]
end

function find_file(db, site_id, deployment_id, key)
  local results = assert(
    db:query(
      string.format([[
        SELECT "storageUrl", "contentSha1"
        FROM "files"
        WHERE "siteId"=%s
          AND "deploymentId"=%s
          AND "key" IN (%s, %s, %s)
        LIMIT 1
      ]],
        db:escape_literal(site_id),
        db:escape_literal(deployment_id),
        db:escape_literal(key),
        db:escape_literal(clean_path(key..'/index.html')),
        db:escape_literal(clean_path(key..'.html'))
      )
    )
  )

  return results[next(results)]
end

function cache_key_for_site_id(site_id)
  return 'site-'..site_id
end

local database_url = os.getenv('DATABASE_URL')
assert(database_url, 'DATABASE_URL needs to be defined in the environment.')

local db = database_from_url(database_url)
assert(db:connect())

local path = string.sub(ngx.var.uri, 2)
local site = find_site_by_domain(db, ngx.var.host)

if site == nil then
  ngx.log(ngx.ERR, 'Could not infer site')
  ngx.exit(404)
end

local file = find_file(db, site.id, site.headDeploymentId, clean_path(path))

if (file == nil) or (file.storageUrl == nil) then
  ngx.log(ngx.ERR, 'No storage url')
  ngx.exit(404)
end

ngx.var.site_surrogate_key = cache_key_for_site_id(site.id)
ngx.var.file_storage_url = file.storageUrl
ngx.var.file_content_sha1 = file.contentSha1

assert(db:keepalive())
