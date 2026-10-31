export type ServiceMode = 'local' | 'fake' | 'remote';

export interface ServiceConfig {
  mode: ServiceMode;
}

/**
 * Returns true if running in a production bundle / environment.
 * Evaluates __DEV__ if defined, falling back to process.env.NODE_ENV === 'production'.
 */
export function isProduction(): boolean {
  if (typeof __DEV__ !== 'undefined') {
    return !__DEV__;
  }
  return process.env.NODE_ENV === 'production';
}

export function resolveDefaultServiceMode(): ServiceMode {
  if (isProduction()) {
    return 'remote';
  }

  const envMode = process.env.EXPO_PUBLIC_GAME_SERVICE;
  if (envMode === 'remote') {
    return 'remote';
  }
  if (envMode === 'fake') {
    return 'fake';
  }
  return 'local';
}

let activeConfig: ServiceConfig = {
  mode: resolveDefaultServiceMode(),
};

/**
 * Updates the active service configuration.
 * In production builds, attempting to select 'local' or 'fake' throws an error.
 */
export function setServiceConfig(patch: Partial<ServiceConfig>): void {
  if (patch.mode && patch.mode !== 'remote' && isProduction()) {
    throw new Error(
      `[ServiceConfig] Invalid service mode '${patch.mode}' in production. Production builds strictly require 'remote' mode.`,
    );
  }
  activeConfig = { ...activeConfig, ...patch };
}

export function resetServiceConfig(): void {
  activeConfig = {
    mode: resolveDefaultServiceMode(),
  };
}

export function getServiceConfig(): ServiceConfig {
  if (isProduction() && activeConfig.mode !== 'remote') {
    activeConfig.mode = 'remote';
  }
  return activeConfig;
}

/**
 * Indicates whether local game service is active.
 * Always returns false in production builds.
 */
export function isLocalServiceActive(): boolean {
  if (isProduction()) {
    return false;
  }
  return activeConfig.mode === 'local';
}

/**
 * Indicates whether the DEV badge is permitted to render.
 * Always returns false in production builds.
 */
export function isDevBadgeVisible(): boolean {
  if (isProduction()) {
    return false;
  }
  return isLocalServiceActive();
}
