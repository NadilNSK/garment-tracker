import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { rejectedSample, releasedSample } from '@/data/gate-samples';
import { gateApi } from '@/services/gate-api';
import type { ScanResult } from '@/types/gate';

export function useGateResult(outcome: 'released' | 'rejected') {
  const { scanId, preview } = useLocalSearchParams<{ scanId?: string; preview?: string }>();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (preview) return;
    if (!scanId) return;
    gateApi.result(scanId).then(value => { if (active) { setResult(value); setError(null); } })
      .catch(() => { if (active) setError('This scan could not be loaded. Return home and open it from Sync Queue.'); });
    return () => { active = false; };
  }, [scanId, preview]);
  const current = preview ? (outcome === 'released' ? releasedSample : rejectedSample) : (result?.scanId === scanId ? result : null);
  return { result: current?.outcome === outcome ? current : null, preview: !!preview, error: error ?? (!scanId && !preview ? 'No scan selected.' : null) };
}
