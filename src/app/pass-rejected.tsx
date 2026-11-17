import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DetailCard, ResultHeading } from '@/components/gate/result';
import { GateButton, GateScreen, gateStyles, Notice } from '@/components/gate/screen';
import { StatusChip } from '@/components/status-chip';
import { useGateResult } from '@/hooks/use-gate-result';
import { gateApi } from '@/services/gate-api';
import { gateTime } from '@/utils/gate-format';

export default function PassRejectedScreen() {
  const { result, preview, error } = useGateResult('rejected');
  const [phone, setPhone] = useState(process.env.EXPO_PUBLIC_GATE_SUPERVISOR_PHONE || null);
  const [callMessage, setCallMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    gateApi.config().then(config => { if (active && config.supervisorPhone) setPhone(config.supervisorPhone); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const callSupervisor = async () => {
    if (!phone) { setCallMessage('No supervisor number is configured. Contact your site supervisor directly.'); return; }
    try { await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`); }
    catch { setCallMessage(`Call your supervisor on ${phone}. This device could not open the dialer.`); }
  };
  const alreadyExited = result?.reason === 'already-exited';
  return <GateScreen previewTime={preview ? '09:52' : undefined} footer={<View style={gateStyles.actions}>
    {callMessage ? <Notice tone="warning">{callMessage}</Notice> : null}
    <GateButton label="Call supervisor" variant="danger" onPress={() => void callSupervisor()} />
    <GateButton label="Scan again" variant="secondary" onPress={() => router.replace('/scan')} />
  </View>}>
    <View style={gateStyles.body}>
      {result ? <>
        <ResultHeading danger title="PASS REJECTED" description={alreadyExited ? 'This gate pass has already been used. Do not release the vehicle.' : result.reason === 'vehicle-mismatch' ? 'The vehicle does not match this gate pass. Do not release the vehicle.' : 'This gate pass could not be verified. Do not release the vehicle.'} />
        <DetailCard danger rows={[
          { label: 'Scanned ID', value: result.transferId, mono: true },
          { label: 'Signature', value: <StatusChip label={result.signature === 'valid' ? 'Valid' : 'Invalid'} status={result.signature === 'valid' ? 'success' : 'danger'} /> },
          { label: 'Pass status', value: <StatusChip label={alreadyExited ? 'Already exited' : result.reason === 'vehicle-mismatch' ? 'Wrong vehicle' : 'Invalid pass'} status="danger" dot /> },
          { label: 'First exit', value: result.firstExit ? `${gateTime(result.firstExit)} · Main Gate` : '—' },
          { label: 'Vehicle now', value: result.vehicle, mono: true, danger: true },
        ]} />
        <Notice tone="warning">{preview ? 'Possible re-used or copied pass. Your security supervisor and the logistics manager have been alerted.' : 'Do not release this vehicle. A security alert has been recorded. Call your supervisor for assistance.'}</Notice>
      </> : <Notice tone="warning">{error ?? 'Loading the scan record…'}</Notice>}
    </View>
  </GateScreen>;
}
