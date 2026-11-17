import AsyncStorage from '@react-native-async-storage/async-storage';

import { gateApi } from './gate-api';
import { SyncQueue } from './sync-queue';

import type { QueueData } from '@/types/gate';

const STORAGE_KEY = 'trendypass.gate-queue.v1';
function readQueue(raw: string): QueueData {
  const value = JSON.parse(raw);
  if (value.version !== 1 || !Array.isArray(value.scans) || typeof value.syncedToday !== 'number' || typeof value.syncDay !== 'string' ||
      !(value.lastUpload === null || typeof value.lastUpload === 'string') ||
      !value.scans.every((scan: Record<string, unknown>) =>
        ['id', 'token', 'vehicle', 'transferId', 'scannedAt', 'quantity'].every(key => typeof scan[key] === 'string') &&
        ['pending', 'synced'].includes(String(scan.status)) && ['Exit', 'Entry'].includes(String(scan.kind)))) {
    throw new Error('Unrecognized queue data');
  }
  return value;
}
let deviceQueue: SyncQueue | undefined;
export function getDeviceQueue() {
  deviceQueue ??= new SyncQueue({
    storage: {
      load: async () => { const value = await AsyncStorage.getItem(STORAGE_KEY); return value ? readQueue(value) : null; },
      save: data => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)),
    },
    upload: gateApi.scan,
  });
  return deviceQueue;
}
