import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { StatusChip } from '@/components/status-chip';
import { FontFamily, Palette } from '@/constants/theme';
import type { Shipment } from '@/types/gate';
import { gateTime } from '@/utils/gate-format';

export function FeaturedShipment({ shipment }: { shipment: Shipment }) {
  return <View style={styles.card}>
    <View style={styles.top}><Text style={styles.id}>{shipment.id}</Text><StatusChip label="In transit" status="info" dot /></View>
    <View style={styles.route}>
      <View><Text style={styles.label}>FROM</Text><Text style={styles.place}>{shipment.from}</Text><Text style={styles.time}>{gateTime(shipment.departed)}</Text></View>
      <View style={styles.track} accessibilityLabel={`${shipment.from} to ${shipment.to}`}>
        <View style={styles.line} /><View style={styles.truck}><Image source={require('@/assets/images/gate/route-truck.svg')} style={{ width: 16, height: 16 }} /></View>
      </View>
      <View style={styles.destination}><Text style={styles.label}>TO</Text><Text style={styles.place}>{shipment.to}</Text><Text style={styles.time}>ETA {shipment.expectedArrival}</Text></View>
    </View>
    <View style={styles.bottom}>
      <Text style={styles.quantity}><Text style={styles.bold}>{shipment.pieces.toLocaleString('en-US')}</Text> pcs · {shipment.style}</Text>
      <Text style={styles.plate}>{shipment.vehicle}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1.6, borderColor: Palette.borderStrong, borderRadius: 14, backgroundColor: Palette.bgSurface },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  id: { fontFamily: FontFamily.mono, fontSize: 17, lineHeight: 23, color: Palette.textPrimary },
  route: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 14 },
  label: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 14, letterSpacing: 0.9, color: Palette.textMuted },
  place: { fontFamily: FontFamily.body, fontSize: 16, lineHeight: 19, color: Palette.textPrimary },
  time: { fontFamily: FontFamily.bodyRegular, fontSize: 13, lineHeight: 16, color: Palette.textMuted },
  destination: { alignItems: 'flex-end' },
  track: { flex: 1, height: 30, minWidth: 24 },
  line: { position: 'absolute', left: 0, top: 14, height: 3, width: '62%', backgroundColor: Palette.status.info.fg },
  truck: { position: 'absolute', left: '62%', marginLeft: -14, top: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: Palette.status.info.fg, alignItems: 'center', justifyContent: 'center' },
  bottom: { borderTopWidth: 1.5, borderTopColor: Palette.borderDefault, marginTop: 12, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  quantity: { fontFamily: FontFamily.bodyRegular, fontSize: 14, lineHeight: 18, color: Palette.textPrimary },
  bold: { fontFamily: FontFamily.body },
  plate: { fontFamily: FontFamily.mono, fontSize: 14, lineHeight: 18, color: Palette.textPrimary },
});
