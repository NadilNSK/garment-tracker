import { fetch } from 'expo/fetch';

import type { GateConfig, ScanRequest, ScanResult, ShipmentList } from '@/types/gate';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_GATE_API_URL ?? ''}/api/gate/${path}`, {
    ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The gate service is unavailable. Please try again.');
  return body as T;
}
export const gateApi = {
  shipments: (query = '') => request<ShipmentList>(`shipments?q=${encodeURIComponent(query)}`),
  config: () => request<GateConfig>('config'),
  scan: (scan: ScanRequest) => request<ScanResult>('scans', { method: 'POST', body: JSON.stringify(scan), headers: { 'Idempotency-Key': scan.id } }),
  result: (id: string) => request<ScanResult>(`scans?id=${encodeURIComponent(id)}`),
  demoPasses: () => request<{ fresh: { token: string; vehicle: string }; exited: { token: string; vehicle: string } }>('demo', { method: 'POST' }),
};
