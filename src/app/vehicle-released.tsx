import { router } from 'expo-router';
import { View } from 'react-native';

import { DetailCard, ResultHeading } from '@/components/gate/result';
import { GateButton, GateScreen, gateStyles, Notice } from '@/components/gate/screen';
import { StatusChip } from '@/components/status-chip';
import { useGateResult } from '@/hooks/use-gate-result';
import { departureLabel } from '@/utils/gate-format';

export default function VehicleReleasedScreen() {
  const { result, preview, error } = useGateResult('released');
  const shipment = result?.shipment;
  return <GateScreen previewTime={preview ? '09:41' : undefined} footer={<View style={gateStyles.actions}>
    <GateButton label="Scan next vehicle" onPress={() => router.replace('/scan')} />
    <GateButton label="Back to home" variant="secondary" onPress={() => router.replace('/gate')} />
  </View>}>
    <View style={gateStyles.body}>
      {shipment ? <>
        <ResultHeading title="VEHICLE RELEASED" description={`${shipment.id} is now in transit to ${shipment.destination}.`} />
        <DetailCard rows={[
          { label: 'Status', value: <StatusChip label="In transit" status="info" dot /> },
          { label: 'Departed', value: departureLabel(shipment.departed) },
          { label: 'Gate', value: shipment.gate },
          { label: 'Vehicle', value: shipment.vehicle, mono: true },
          { label: 'Pieces', value: `${shipment.pieces.toLocaleString('en-US')} · ${shipment.bundles} bundles` },
          { label: 'Expected arrival', value: shipment.expectedArrival },
        ]} />
        <Notice>{preview ? 'Receiving gate at Washing Plant has been notified. Shortages on arrival are flagged automatically.' : 'The departure is recorded. A receiving-gate notification is queued for delivery.'}</Notice>
      </> : <Notice tone="warning">{error ?? 'Loading the release record…'}</Notice>}
    </View>
  </GateScreen>;
}
