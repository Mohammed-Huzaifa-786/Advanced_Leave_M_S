const cors = require('cors');

/**
 * Returns the list of permitted origins, combining safe local development defaults
 * (outside production) with environment-specified frontend URLs (CLIENT_URL and ALLOWED_ORIGINS).
 */
function getAllowedOrigins() {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultAllowedOrigins = isProduction
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

  const envOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ]
    .map((origin) => (origin ? origin.trim().replace(/\/+$/, '') : ''))
    .filter(Boolean);

  return Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));
}

/**
 * Validates whether an incoming Origin header is permitted.
 */
function isOriginAllowed(origin, customList = null) {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/+$/, '');
  const list = customList || getAllowedOrigins();
  return list.includes(normalized);
}

/**
 * CORS configuration options with explicit allowlist validation.
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Non-browser clients (e.g. curl, server-to-server, native mobile) have no Origin header
    if (!origin) {
      return callback(null, true);
    }

    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    // Disallowed origin: cleanly omit CORS headers without crashing
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Private-Network',
  ],
};

/**
 * Conditionally grants Private Network Access (Chrome PNA) ONLY to approved origins.
 */
function privateNetworkAccess(req, res, next) {
  const requestOrigin = req.headers.origin;
  if (req.headers['access-control-request-private-network']) {
    if (!requestOrigin || isOriginAllowed(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
  }
  next();
}

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  corsOptions,
  corsMiddleware: cors(corsOptions),
  corsPreflight: cors(corsOptions),
  privateNetworkAccess,
};
