const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the workspace root to support monorepo packages
config.watchFolders = [workspaceRoot];

// 2. Add 'html' to asset extensions
config.resolver.assetExts.push('html');

// 3. Add 'mjs' to source extensions for shared packages using ESM
config.resolver.sourceExts.push('mjs');

// 4. Force resolution of shared packages to the workspace root to avoid duplicates
// (Optional but good practice)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
