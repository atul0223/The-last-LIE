export type ServiceMode = 'local' | 'fake' | 'remote';

export interface ServiceConfig {
  mode: ServiceMode;
}

let activeConfig: ServiceConfig = {
  mode: 'local',
};

export function setServiceConfig(patch: Partial<ServiceConfig>): void {
  activeConfig = { ...activeConfig, ...patch };
}

export function getServiceConfig(): ServiceConfig {
  return activeConfig;
}

export function isLocalServiceActive(): boolean {
  return activeConfig.mode === 'local';
}
