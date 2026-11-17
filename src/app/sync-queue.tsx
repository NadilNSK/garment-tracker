import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DetailCard, ResultHeading } from '@/components/gate/result';
import { GateButton, GateHeader, GateScreen, gateStyles, Notice } from '@/components/gate/screen';
import { ShipmentRowCard } from '@/components/shipment-row-card';
import { StatusChip } from '@/components/status-chip';
import { FontFamily, Palette } from '@/constants/theme';
import { useGateQueue } from '@/hooks/use-gate-queue';
import { gateTime } from '@/utils/gate-format';

export default function SyncQueueRoute() {
  const params = useLocalSearchParams<{ preview?: string }>();
  const preview = params.preview === 'offline' || params.preview === 'synced' ? params.preview : undefined;
  return <SyncQueueScreen key={preview ?? 'live'} preview={preview} />;
}
function SyncQueueScreen({ preview }: { preview?: 'offline' | 'synced' }) {
  const state = useGateQueue(preview);
  const pending = state.scans.filter(scan => scan.status === 'pending');
  const rejected = state.scans.filter(scan => scan.result?.outcome === 'rejected');
  const allSynced = state.ready && state.online && pending.length === 0;
  const subtitle = preview ? (allSynced ? 'Last synced 14:31 · just now' : 'Last synced 13:48 · 14 min ago')
    : state.lastUpload ? `Last synced ${gateTime(state.lastUpload)}` : 'No uploads yet';
  return <GateScreen offline={!state.online} previewTime={preview ? (allSynced ? '14:31' : '14:02') : undefined}
    footerInset={allSynced ? 16 : 40} footer={<View style={gateStyles.actions}>
      {state.message ? <Notice tone="warning">{state.message}</Notice> : null}
      <GateButton label="Keep scanning" onPress={() => router.replace('/scan')} />
      {!allSynced ? <GateButton label={state.syncing ? 'Syncing…' : 'Retry sync now'} variant="secondary" disabled={state.syncing} onPress={() => void state.queue.retry()} /> : null}
    </View>}>
    {!state.online ? <View style={styles.offlineBanner}><Image source={require('@/assets/images/gate/offline.svg')} style={{ width: 20, height: 20 }} />
      <Text style={styles.offlineText}>No connection — scans are saved on device</Text></View> : null}
    <View style={!allSynced ? styles.queueHeader : undefined}><GateHeader title="Sync Queue" subtitle={subtitle} /></View>
    <View style={gateStyles.body}>
      {allSynced ? <>
        <ResultHeading title="ALL SCANS SYNCED" description="Nothing is waiting. New scans upload instantly while you're online." />
        <DetailCard rows={[
          { label: 'Connection', value: <StatusChip label="Online" status="success" dot /> },
          { label: 'Synced today', value: `${state.syncedToday} scans` },
          { label: 'Last upload', value: state.lastUpload ? gateTime(state.lastUpload, true) : '—' },
          { label: 'Waiting', value: 0 },
        ]} />
        {!preview && rejected.length > 0 ? <>
          <Notice tone="danger">{rejected.length} synced {rejected.length === 1 ? 'scan was' : 'scans were'} rejected. Do not release these vehicles.</Notice>
          {rejected.map(scan => <GateButton key={scan.id} label={`Review ${scan.transferId}`} variant="secondary" onPress={() => router.push({ pathname: '/pass-rejected', params: { scanId: scan.id } })} />)}
        </> : null}
      </> : <>
        <View style={styles.waitingPanel}>
          <Text style={styles.waitingCount}>{pending.length}</Text>
          <View style={styles.waitingCopy}><Text style={styles.waitingTitle}>SCANS WAITING</Text><Text style={styles.waitingDescription}>Will upload automatically when signal returns</Text></View>
        </View>
        <View style={styles.rows}>
          {state.scans.map(scan => <Pressable key={scan.id} disabled={!scan.result || !!preview}
            accessibilityRole={scan.result && !preview ? 'button' : undefined}
            accessibilityLabel={scan.result ? `Open ${scan.transferId} scan result` : undefined}
            onPress={() => router.push({ pathname: scan.result?.outcome === 'released' ? '/vehicle-released' : '/pass-rejected', params: { scanId: scan.id } })}
            style={scan.status === 'synced' ? styles.muted : undefined}>
            <ShipmentRowCard compact id={scan.transferId} subtitle={`${scan.kind} · ${scan.vehicle}${scan.quantity ? ` · ${scan.quantity}` : ''} · ${gateTime(scan.scannedAt)}`}
              status={scan.status === 'pending' ? 'warning' : scan.result?.outcome === 'rejected' ? 'danger' : 'success'}
              statusLabel={scan.status === 'pending' ? 'Queued' : scan.result?.outcome === 'rejected' ? 'Rejected' : 'Synced'} dot={scan.status === 'pending'} />
          </Pressable>)}
          {!state.ready ? <Notice tone="warning">{state.message ?? 'Loading saved scans…'}</Notice> : null}
        </View>
      </>}
    </View>
  </GateScreen>;
}
const styles = StyleSheet.create({
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.status.warning.fg, paddingHorizontal: 20, paddingVertical: 10 },
  offlineText: { flex: 1, fontFamily: FontFamily.body, fontSize: 16, lineHeight: 20, color: Palette.textOnInverse },
  queueHeader: { paddingTop: 6 },
  waitingPanel: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 14, backgroundColor: Palette.bgInverse },
  waitingCount: { fontFamily: FontFamily.display, fontSize: 56, lineHeight: 56, color: Palette.textAccent },
  waitingCopy: { flex: 1 },
  waitingTitle: { fontFamily: FontFamily.display, fontSize: 20, lineHeight: 24, color: Palette.textOnInverse },
  waitingDescription: { fontFamily: FontFamily.bodyRegular, fontSize: 14, lineHeight: 17, color: Palette.textInverseMuted },
  rows: { gap: 10, paddingTop: 4 }, muted: { opacity: 0.6 },
});
