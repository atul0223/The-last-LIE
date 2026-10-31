import type { GameService } from './GameService';
import { FakeGameService } from './FakeGameService';
import { LocalGameService } from './local/LocalGameService';
import { RemoteGameService } from './remote/RemoteGameService';
import { getServiceConfig, isProduction } from './config';

export * from './GameService';
export * from './FakeGameService';
export * from './local';
export * from './remote';
export * from './config';

const fakeServiceInstance = new FakeGameService();
let localServiceInstance: LocalGameService | null = null;
let remoteServiceInstance: RemoteGameService | null = null;

export function resetGameServiceInstances(): void {
  localServiceInstance = null;
  remoteServiceInstance = null;
}

export function getGameService(): GameService {
  const config = getServiceConfig();

  // In production builds, only remote service is permitted
  if (isProduction() || config.mode === 'remote') {
    if (!remoteServiceInstance) {
      remoteServiceInstance = new RemoteGameService();
    }
    return remoteServiceInstance;
  }

  switch (config.mode) {
    case 'local':
      if (!localServiceInstance) {
        localServiceInstance = new LocalGameService();
      }
      return localServiceInstance;
    case 'fake':
    default:
      return fakeServiceInstance;
  }
}
