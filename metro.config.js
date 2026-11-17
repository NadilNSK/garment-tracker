const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;
// SQLite journals and browser captures are runtime output, not source modules.
// Watching them invalidates Metro's server module graph during API requests/tests.
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /[\\/]\.data[\\/].*/,
  /[\\/]\.artifacts[\\/].*/,
];

module.exports = config;
