import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GateButton, GateHeader, GateScreen, gateStyles, Notice } from '@/components/gate/screen';
import { StatusChip } from '@/components/status-chip';
import { TabBar } from '@/components/tab-bar';
import { FontFamily, Palette } from '@/constants/theme';
import { useGateQueue } from '@/hooks/use-gate-queue';

export default function GateHomeScreen() {
  const state = useGateQueue();
  const waiting = state.scans.filter(scan => scan.status === 'pending').length;
  return <GateScreen footerInset={0} footer={<TabBar active="Home" officer />}>
    <GateHeader title="Gate Home" subtitle="Gate Officer · Sewing Plant Biyagama" onBack={null} />
    <View style={gateStyles.body}>
      <View style={styles.chips}><StatusChip label={state.online ? 'Online' : 'Offline'} status={state.online ? 'success' : 'warning'} dot /><StatusChip label="Main Gate" status="neutral" /></View>
      <View style={styles.welcome}>
        <Image source={require('@/assets/images/dispatch/tab-scan.svg')} style={{ width: 30, height: 30 }} />
        <Text style={styles.title}>READY FOR THE NEXT VEHICLE</Text>
        <Text style={gateStyles.text}>Scan the signed gate pass and check the vehicle plate before release.</Text>
      </View>
      <GateButton label="Scan vehicle pass" onPress={() => router.push('/scan')} />
      <GateButton label={`Sync queue${waiting ? ` · ${waiting} waiting` : ''}`} variant="secondary" onPress={() => router.push('/sync-queue')} />
      <GateButton label="View shipments" variant="secondary" onPress={() => router.push('/shipments')} />
      {!state.online ? <Notice tone="warning">You can keep scanning offline. Vehicles must stay at the gate until their passes are verified.</Notice> : null}
    </View>
  </GateScreen>;
}
const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8 },
  welcome: { padding: 20, gap: 12, borderWidth: 2, borderColor: Palette.borderStrong, borderRadius: 20, backgroundColor: Palette.bgAccent, marginTop: 8 },
  title: { fontFamily: FontFamily.display, fontSize: 28, lineHeight: 32, color: Palette.textPrimary },
});
