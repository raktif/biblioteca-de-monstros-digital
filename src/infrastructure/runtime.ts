import { invoke, isTauri } from '@tauri-apps/api/core';

export interface RuntimeInfo {
  environment: 'desktop' | 'browser';
  appVersion: string;
}

export async function initializeRuntime(): Promise<RuntimeInfo> {
  if (isTauri()) {
    return invoke<RuntimeInfo>('app_initialize');
  }

  return {
    environment: 'browser',
    appVersion: '0.1.0',
  };
}
