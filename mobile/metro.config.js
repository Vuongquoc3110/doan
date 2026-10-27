const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const enhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  return (req, res, nextHandler) => {
    // ngrok can append its protocol to an existing forwarded header from Expo Go.
    // Metro expects one protocol when constructing the bundle request URL.
    const forwarded = req.headers['x-forwarded-proto'];
    if (forwarded) {
      const protocol = String(Array.isArray(forwarded) ? forwarded[0] : forwarded)
        .split(',')[0].trim().toLowerCase();
      if (protocol === 'http' || protocol === 'https') {
        req.headers['x-forwarded-proto'] = protocol;
      } else {
        delete req.headers['x-forwarded-proto'];
      }
    }
    return next(req, res, nextHandler);
  };
};

module.exports = config;
