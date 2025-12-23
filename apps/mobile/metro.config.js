const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'html' to asset extensions to support loading the built editor
config.resolver.assetExts.push('html');

module.exports = config;
