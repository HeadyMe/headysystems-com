/*
 * (c) 2026 Heady Systems LLC.
 * Production server for headysystems-com -- Static files + API proxy + health check
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 8080;
const API_TARGET = process.env.API_TARGET || 'https://manager.headysystems.com';
const DIST = path.join(__dirname, 'dist');
const SERVICE_NAME = 'headysystems-com';
const STARTED_AT = Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const COMPRESSIBLE = new Set([
  'text/html', 'text/css', 'application/javascript', 'application/json',
  'image/svg+xml', 'text/plain', 'application/xml', 'application/manifest+json'
]);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

const DEFAULT_ALLOWED_ORIGINS = [
  'https://headyme.com',
  'https://headysystems.com',
  'https://headyconnection.org',
  'https://headybuddy.org',
  'https://headymcp.com',
  'https://headyio.com',
  'https://headyai.com'
];

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

function log(level, message, extra = {}) {
  process.stdout.write(JSON.stringify({
    level,
    service: SERVICE_NAME,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  }) + '\n');
}

function buildCsp() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "font-src 'self' https://fonts.gstatic.com",
    "form-action 'self' mailto:",
    "frame-ancestors 'self'",
    "img-src 'self' data: https:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "connect-src 'self' " + API_TARGET,
    "upgrade-insecure-requests"
  ].join('; ');
}

function getSecurityHeaders() {
  return {
    ...SECURITY_HEADERS,
    'Content-Security-Policy': buildCsp(),
  };
}

function getCacheControl(ext) {
  if (ext === '.html' || ext === '') return 'public, max-age=300, must-revalidate';
  if (['.js', '.css', '.mjs'].includes(ext)) return 'public, max-age=86400, must-revalidate';
  if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) return 'public, max-age=31536000, immutable';
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'].includes(ext)) return 'public, max-age=604800';
  return 'public, max-age=3600';
}

function getAllowedOrigin(origin) {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    if (parsed.protocol !== 'https:') return null;
    if (host.endsWith('.headysystems.com') || host.endsWith('.headyme.com') || host.endsWith('.headyconnection.org')) return origin;
  } catch (_error) {
    return null;
  }
  return null;
}

function withCors(headers, origin) {
  const allowedOrigin = getAllowedOrigin(origin);
  if (!allowedOrigin) return headers;
  return {
    ...headers,
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Heady-API-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': headers['Vary'] ? headers['Vary'] + ', Origin' : 'Origin',
  };
}

function compressAndSend(req, res, statusCode, headers, data) {
  const contentType = (headers['Content-Type'] || '').split(';')[0].trim();
  if (COMPRESSIBLE.has(contentType) && data.length > 1024) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (error, compressed) => {
        if (error) {
          res.writeHead(statusCode, headers);
          res.end(data);
          return;
        }
        res.writeHead(statusCode, { ...headers, 'Content-Encoding': 'gzip', 'Vary': headers['Vary'] ? headers['Vary'] + ', Accept-Encoding' : 'Accept-Encoding' });
        res.end(compressed);
      });
      return;
    }
  }
  res.writeHead(statusCode, headers);
  res.end(data);
}

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      filePath = path.join(DIST, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        res.writeHead(404, withCors({ 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() }, req.headers.origin));
        res.end('Not Found');
        return;
      }
      const headers = withCors({
        'Content-Type': contentType,
        'Cache-Control': getCacheControl(ext),
        ...getSecurityHeaders(),
      }, req.headers.origin);
      compressAndSend(req, res, 200, headers, data);
    });
  });
}

function proxyToApi(req, res) {
  const targetUrl = new URL(req.url, API_TARGET);
  const client = targetUrl.protocol === 'https:' ? https : http;
  const proxyRequest = client.request({
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + (targetUrl.search || ''),
    method: req.method,
    headers: { ...req.headers, host: targetUrl.host },
    timeout: 30000,
  }, (proxyResponse) => {
    const headers = withCors({
      ...proxyResponse.headers,
      ...getSecurityHeaders(),
    }, req.headers.origin);
    res.writeHead(proxyResponse.statusCode || 502, headers);
    proxyResponse.pipe(res);
  });

  proxyRequest.on('error', (error) => {
    log('error', 'api_proxy_failed', { error: error.message });
    const body = Buffer.from(JSON.stringify({ ok: false, error: 'API proxy failed' }));
    res.writeHead(502, withCors({ 'Content-Type': 'application/json; charset=utf-8', ...getSecurityHeaders() }, req.headers.origin));
    res.end(body);
  });

  proxyRequest.on('timeout', () => {
    proxyRequest.destroy();
    const body = Buffer.from(JSON.stringify({ ok: false, error: 'API proxy timeout' }));
    res.writeHead(504, withCors({ 'Content-Type': 'application/json; charset=utf-8', ...getSecurityHeaders() }, req.headers.origin));
    res.end(body);
  });

  req.pipe(proxyRequest);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, withCors(getSecurityHeaders(), req.headers.origin));
    res.end();
    return;
  }

  if (req.url === '/health') {
    const body = Buffer.from(JSON.stringify({
      ok: true,
      service: SERVICE_NAME,
      uptime_seconds: Math.round(process.uptime()),
      started_at: new Date(STARTED_AT).toISOString(),
      coherence: 0.92,
      api_target: API_TARGET,
    }));
    res.writeHead(200, withCors({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...getSecurityHeaders() }, req.headers.origin));
    res.end(body);
    return;
  }

  if (req.url.startsWith('/api/') || req.url.startsWith('/api-docs')) {
    proxyToApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  log('info', 'server_started', { port: PORT, api_target: API_TARGET });
});

function shutdown(signal) {
  log('info', 'shutdown_started', { signal });
  server.close(() => {
    log('info', 'shutdown_complete');
    process.exit(0);
  });
  setTimeout(() => {
    log('error', 'shutdown_forced');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
