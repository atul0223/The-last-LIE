import type { GameService } from './GameService';
import { FakeGameService } from './FakeGameService';
import { LocalGameService } from './local/LocalGameService';
import { getServiceConfig } from './config';

export * from './GameService';
export * from './FakeGameService';
export * from './local';
export * from './config';

const fakeServiceInstance = new FakeGameService();
let localServiceInstance: LocalGameService | null = null;

export function getGameService(): GameService {
  const config = getServiceConfig();

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
