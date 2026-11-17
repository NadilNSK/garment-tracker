import * as Network from 'expo-network';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { queueSample, releasedSample } from '@/data/gate-samples';
import { getDeviceQueue } from '@/services/device-queue';
import { SyncQueue } from '@/services/sync-queue';

export function useGateQueue(preview?: 'offline' | 'synced') {
  const [queue] = useState(() => preview ? new SyncQueue({
    initial: queueSample(preview === 'synced'), online: preview === 'synced',
    now: () => new Date('2026-10-28T14:31:08+05:30'),
    storage: { load: async () => null, save: async () => {} },
    upload: async scan => ({ ...releasedSample, scanId: scan.id, transferId: scan.transferId }),
  }) : getDeviceQueue());
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  useEffect(() => {
    let active = true;
    void queue.initialize();
    if (preview) return;
    const connected = (state: Network.NetworkState) => state.isConnected === true && state.isInternetReachable !== false;
    const subscription = Network.addNetworkStateListener(state => queue.setOnline(connected(state)));
    void Network.getNetworkStateAsync().then(state => { if (active) queue.setOnline(connected(state)); }).catch(() => { if (active) queue.setOnline(false); });
    return () => { active = false; subscription.remove(); };
  }, [preview, queue]);
  return { ...snapshot, queue };
}
