import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FeaturedShipment } from '@/components/gate/featured-shipment';
import { GateScreen, gateStyles, Notice } from '@/components/gate/screen';
import { ShipmentRowCard } from '@/components/shipment-row-card';
import { TabBar } from '@/components/tab-bar';
import { FontFamily, Palette } from '@/constants/theme';
import { shipmentSamples } from '@/data/gate-samples';
import { gateApi } from '@/services/gate-api';
import type { ShipmentList } from '@/types/gate';
import { matchesShipment } from '@/utils/gate-format';

export default function ShipmentsScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [data, setData] = useState<ShipmentList | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (preview) return;
    let active = true;
    const timer = setTimeout(() => {
      gateApi.shipments(query).then(value => { if (active) { setData(value); setError(false); } }).catch(() => { if (active) setError(true); });
    }, query ? 150 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [preview, query]);
  const current = preview ? shipmentSamples : data;
  const shipments = current?.shipments.filter(item => matchesShipment(query, item)) ?? [];
  const stats = [
    { label: 'In transit', value: current?.summary.inTransit ?? '—', status: 'info' },
    { label: 'Received', value: current?.summary.received ?? '—', status: 'success' },
    { label: 'Flagged', value: current?.summary.flagged ?? '—', status: 'danger' },
  ] as const;
  return <GateScreen previewTime={preview ? '10:15' : undefined} footerInset={0} footer={<TabBar active="Shipments" officer />}>
    <View style={styles.header}>
      <View style={styles.titleGroup}><Text accessibilityRole="header" style={styles.title}>Shipments</Text><Text style={styles.subtitle}>Today · {current?.summary.total ?? '—'} transfers</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? 'Close search' : 'Search shipments'} accessibilityState={{ expanded: searchOpen }}
        onPress={() => { setSearchOpen(!searchOpen); setQuery(''); }} style={styles.searchButton}>
        <Image source={require('@/assets/images/gate/search.svg')} style={{ width: 22, height: 22 }} />
      </Pressable>
    </View>
    <View style={gateStyles.body}>
      {searchOpen ? <View style={styles.searchRow}><TextInput autoFocus value={query} onChangeText={setQuery} accessibilityLabel="Search by transfer ID, route, or vehicle" placeholder="Transfer ID, route, or vehicle" placeholderTextColor={Palette.textMuted} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={[gateStyles.input, styles.searchInput]} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><Text style={gateStyles.strong}>Clear</Text></Pressable> : null}
      </View> : null}
      <View style={styles.stats}>{stats.map(stat => <View key={stat.label} style={[styles.stat, { backgroundColor: Palette.status[stat.status].bg }]}>
        <Text style={[styles.statLabel, { color: Palette.status[stat.status].fg }]}>{stat.label}</Text><Text style={[styles.statValue, { color: Palette.status[stat.status].fg }]}>{stat.value}</Text>
      </View>)}</View>
      {error ? <Notice tone="warning">Shipments could not be refreshed. Check your connection and try again.</Notice> : null}
      <View style={styles.list}>
        {shipments.map(item => item.id === 'TRF-2610-0418' && item.status === 'in-transit' ? <FeaturedShipment key={item.id} shipment={item} /> :
          <ShipmentRowCard key={item.id} compact id={item.id} subtitle={item.subtitle ?? `${item.from} → ${item.to} · ${item.vehicle}`}
            status={item.status === 'flagged' ? 'warning' : item.status === 'received' ? 'success' : 'info'}
            statusLabel={item.status === 'flagged' ? 'Overdue' : item.status === 'received' ? 'Received' : item.status === 'awaiting-exit' ? 'Awaiting exit' : 'In transit'} />)}
        {current && shipments.length === 0 ? <View accessibilityLiveRegion="polite" style={styles.empty}><Text style={styles.emptyTitle}>No shipments found</Text><Text style={gateStyles.text}>Try a different transfer ID, route, or vehicle plate.</Text></View> : null}
        {!current && !error ? <Text style={gateStyles.text}>Loading shipments…</Text> : null}
      </View>
    </View>
  </GateScreen>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleGroup: { flex: 1 }, title: { fontFamily: FontFamily.display, fontSize: 30, lineHeight: 36, letterSpacing: 0.3, color: Palette.textPrimary },
  subtitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 13, lineHeight: 16, color: Palette.textMuted },
  searchButton: { width: 48, height: 48, borderWidth: 1.6, borderColor: Palette.borderStrong, backgroundColor: Palette.bgSurface, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 8 }, stat: { flex: 1, minHeight: 66, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  statLabel: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 15, letterSpacing: 0.9, textTransform: 'uppercase' },
  statValue: { fontFamily: FontFamily.display, fontSize: 30, lineHeight: 30 },
  list: { gap: 10, paddingTop: 4 }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { flex: 1, minWidth: 0 },
  clear: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
  empty: { paddingVertical: 24, gap: 8 }, emptyTitle: { fontFamily: FontFamily.display, fontSize: 24, color: Palette.textPrimary },
});
