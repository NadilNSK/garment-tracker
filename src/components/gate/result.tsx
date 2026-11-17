import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette } from '@/constants/theme';

export function ResultHeading({ title, description, danger = false }: { title: string; description: string; danger?: boolean }) {
  return <View style={styles.result}>
    <View style={styles.badgeSlot}>
      <Image source={danger ? require('@/assets/images/gate/rejected-badge.svg') : require('@/assets/images/gate/released-badge.svg')} style={styles.badge} />
    </View>
    <Text accessibilityRole="header" style={[styles.title, { color: Palette.status[danger ? 'danger' : 'success'].fg }]}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>;
}
export type Detail = { label: string; value: ReactNode; mono?: boolean; danger?: boolean };
export function DetailCard({ rows, danger = false }: { rows: Detail[]; danger?: boolean }) {
  return <View style={[styles.card, danger && styles.dangerCard]}>
    {rows.map((row, index) => <View key={row.label} style={[styles.row, index < rows.length - 1 && !danger && styles.divider]}>
      <Text style={styles.label}>{row.label}</Text>
      {typeof row.value === 'string' || typeof row.value === 'number' ? <Text style={[styles.value, row.mono && styles.mono, row.danger && styles.dangerText]}>{row.value}</Text> : row.value}
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  result: { alignItems: 'center', gap: 10, paddingTop: 28, paddingBottom: 8 },
  badgeSlot: { width: 104, height: 104 },
  badge: { width: 124, height: 124, position: 'absolute', left: -10, top: -10 },
  title: { fontFamily: FontFamily.display, fontSize: 28, lineHeight: 34, letterSpacing: 0.3, textAlign: 'center' },
  description: { fontFamily: FontFamily.bodyRegular, fontSize: 14, lineHeight: 17, color: Palette.textSecondary, textAlign: 'center', alignSelf: 'stretch' },
  card: { backgroundColor: Palette.bgSurface, borderWidth: 1.5, borderColor: Palette.borderDefault, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4 },
  dangerCard: { backgroundColor: Palette.status.danger.bg, borderColor: Palette.status.danger.fg },
  row: { minHeight: 44, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: Palette.borderSubtle },
  label: { fontFamily: FontFamily.bodyRegular, fontSize: 14, lineHeight: 18, color: Palette.textMuted, flexShrink: 1 },
  value: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 18, color: Palette.textPrimary, textAlign: 'right', flexShrink: 1 },
  mono: { fontFamily: FontFamily.mono }, dangerText: { color: Palette.status.danger.fg },
});
