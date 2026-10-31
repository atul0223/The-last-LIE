const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Allow hierarchical lookup for pnpm symlinks
config.resolver.disableHierarchicalLookup = false;

// 4. Handle TypeScript ESM relative imports ending in .js in workspace packages
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@babel/runtime/regenerator' || moduleName.startsWith('@babel/runtime/regenerator')) {
    return {
      filePath: require.resolve('regenerator-runtime'),
      type: 'sourceFile',
    };
  }

  if (moduleName.endsWith('.js') && (moduleName.startsWith('./') || moduleName.startsWith('../'))) {
    try {
      const tsModuleName = moduleName.slice(0, -3) + '.ts';
      return (defaultResolveRequest || context.resolveRequest)(context, tsModuleName, platform);
    } catch {
      try {
        const tsxModuleName = moduleName.slice(0, -3) + '.tsx';
        return (defaultResolveRequest || context.resolveRequest)(context, tsxModuleName, platform);
      } catch {
        // fallback
      }
    }
  }
  return (defaultResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
