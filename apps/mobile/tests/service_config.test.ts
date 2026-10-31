import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getServiceConfig,
  setServiceConfig,
  resetServiceConfig,
  isLocalServiceActive,
  isDevBadgeVisible,
  isProduction,
} from '../src/services/config';
import { getGameService, resetGameServiceInstances } from '../src/services';
import { RemoteGameService } from '../src/services/remote/RemoteGameService';
import { LocalGameService } from '../src/services/local/LocalGameService';

describe('WP-43: Service Config & Production Build Guards', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    resetGameServiceInstances();
    resetServiceConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    // @ts-expect-error reset global
    globalThis.__DEV__ = true;
    resetGameServiceInstances();
    resetServiceConfig();
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      // @ts-expect-error dev flag
      globalThis.__DEV__ = true;
      process.env.NODE_ENV = 'development';
      delete process.env.EXPO_PUBLIC_GAME_SERVICE;
      resetServiceConfig();
    });

    it('identifies non-production environment', () => {
      expect(isProduction()).toBe(false);
    });

    it('defaults to local mode in dev when EXPO_PUBLIC_GAME_SERVICE is unset', () => {
      expect(getServiceConfig().mode).toBe('local');
      expect(isLocalServiceActive()).toBe(true);
      expect(isDevBadgeVisible()).toBe(true);
      const service = getGameService();
      expect(service).toBeInstanceOf(LocalGameService);
    });

    it('selects remote mode when EXPO_PUBLIC_GAME_SERVICE=remote', () => {
      process.env.EXPO_PUBLIC_GAME_SERVICE = 'remote';
      resetServiceConfig();

      expect(getServiceConfig().mode).toBe('remote');
      expect(isLocalServiceActive()).toBe(false);
      expect(isDevBadgeVisible()).toBe(false);
      const service = getGameService();
      expect(service).toBeInstanceOf(RemoteGameService);
    });

    it('allows changing mode via setServiceConfig in development', () => {
      setServiceConfig({ mode: 'remote' });
      expect(getServiceConfig().mode).toBe('remote');
      expect(isLocalServiceActive()).toBe(false);

      setServiceConfig({ mode: 'local' });
      expect(getServiceConfig().mode).toBe('local');
      expect(isLocalServiceActive()).toBe(true);
    });
  });

  describe('Production Environment Guards', () => {
    beforeEach(() => {
      // Set production flags
      // @ts-expect-error production flag
      globalThis.__DEV__ = false;
      process.env.NODE_ENV = 'production';
      resetServiceConfig();
    });

    it('identifies production environment accurately', () => {
      expect(isProduction()).toBe(true);
    });

    it('strictly forces remote mode in production', () => {
      const config = getServiceConfig();
      expect(config.mode).toBe('remote');
    });

    it('makes local service and dev badge impossible in production', () => {
      expect(isLocalServiceActive()).toBe(false);
      expect(isDevBadgeVisible()).toBe(false);
    });

    it('throws error if attempting to set service mode to local in production', () => {
      expect(() => {
        setServiceConfig({ mode: 'local' });
      }).toThrow(/Cannot select|Invalid service mode/i);

      expect(() => {
        setServiceConfig({ mode: 'fake' });
      }).toThrow(/Cannot select|Invalid service mode/i);

      expect(getServiceConfig().mode).toBe('remote');
      expect(isLocalServiceActive()).toBe(false);
    });

    it('strictly provides RemoteGameService in production even if env attempted local', () => {
      process.env.EXPO_PUBLIC_GAME_SERVICE = 'local';
      resetServiceConfig();
      resetGameServiceInstances();

      expect(getServiceConfig().mode).toBe('remote');
      expect(isLocalServiceActive()).toBe(false);
      expect(isDevBadgeVisible()).toBe(false);

      const service = getGameService();
      expect(service).toBeInstanceOf(RemoteGameService);
    });
  });
});
