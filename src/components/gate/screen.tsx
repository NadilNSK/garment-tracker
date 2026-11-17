import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Palette } from '@/constants/theme';

// Mock system chrome is deliberately limited to explicit Figma previews on web.
export function GateScreen({ children, footer, previewTime, offline = false, footerInset = 16 }: {
  children: ReactNode; footer?: ReactNode; previewTime?: string; offline?: boolean; footerInset?: number;
}) {
  const insets = useSafeAreaInsets();
  const preview = Platform.OS === 'web' && !!previewTime;
  return (
    <View style={styles.page}>
      <View style={[styles.frame, { paddingTop: preview ? 0 : insets.top }]}>
        {preview ? <View style={styles.systemBar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.systemText}>{previewTime}</Text><Text style={styles.systemText}>{offline ? '× ▮' : '●●● ▮'}</Text>
        </View> : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: Math.max(footerInset, preview ? 0 : insets.bottom) }]}>{footer}</View> : null}
        {preview ? <View pointerEvents="none" style={styles.homeIndicator} /> : null}
      </View>
    </View>
  );
}

export function GateButton({ label, onPress, variant = 'primary', disabled = false }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
    style={({ pressed }) => [styles.button, styles[variant], (pressed || disabled) && styles.pressed]}>
    <Text style={[styles.buttonText, variant === 'danger' && styles.white]}>{label}</Text>
    {variant === 'primary' ? <View pointerEvents="none" style={styles.buttonShadow} /> : null}
  </Pressable>;
}

export function GateHeader({ title, subtitle, onBack = () => router.replace('/gate'), trailing }: {
  title: string; subtitle?: string; onBack?: (() => void) | null; trailing?: ReactNode;
}) {
  return <View style={styles.header}>
    {onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Gate Home" style={styles.iconButton}>
      <Image source={require('@/assets/images/gate/back.svg')} style={{ width: 22, height: 22 }} />
    </Pressable> : null}
    <View style={styles.headerText}><Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}</View>
    {trailing}
  </View>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'danger' }) {
  return <View style={[styles.notice, { backgroundColor: Palette.status[tone].bg }]}>
    <Text accessibilityLiveRegion="polite" style={[styles.noticeText, { color: Palette.status[tone].fg }]}>{children}</Text>
  </View>;
}

export const gateStyles = StyleSheet.create({
  body: { paddingHorizontal: 20, gap: 12 },
  actions: { paddingHorizontal: 20, gap: 10 },
  text: { fontFamily: FontFamily.bodyRegular, fontSize: 14, lineHeight: 18, color: Palette.textSecondary },
  strong: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 18, color: Palette.textPrimary },
  mono: { fontFamily: FontFamily.mono, fontSize: 14, lineHeight: 18, color: Palette.textPrimary },
  input: { backgroundColor: Palette.bgSurface, borderWidth: 1.5, borderColor: Palette.borderDefault, borderRadius: 12, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FontFamily.bodyRegular, fontSize: 16, color: Palette.textPrimary },
});
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Palette.bgPage },
  frame: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: Palette.bgPage },
  scroll: { flex: 1, minHeight: 0 }, content: { paddingBottom: 16 },
  footer: { paddingTop: 8, backgroundColor: Palette.bgPage },
  systemBar: { height: 44, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  systemText: { fontFamily: FontFamily.body, fontSize: 15, color: Palette.textPrimary },
  homeIndicator: { position: 'absolute', width: 134, height: 5, borderRadius: 3, bottom: 8, alignSelf: 'center', backgroundColor: Palette.bgInverse },
  button: { minHeight: 64, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  primary: { backgroundColor: Palette.bgAccent },
  secondary: { backgroundColor: Palette.bgSurface, borderWidth: 2, borderColor: Palette.borderStrong },
  danger: { backgroundColor: Palette.status.danger.fg },
  buttonText: { fontFamily: FontFamily.display, fontSize: 20, lineHeight: 24, letterSpacing: 0.8, textTransform: 'uppercase', color: Palette.textPrimary, textAlign: 'center' },
  white: { color: Palette.textOnInverse }, pressed: { opacity: 0.65 },
  buttonShadow: { position: 'absolute', height: 4, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.15)' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontFamily: FontFamily.display, fontSize: 24, lineHeight: 29, letterSpacing: 0.3, color: Palette.textPrimary },
  headerSubtitle: { fontFamily: FontFamily.bodyRegular, fontSize: 13, lineHeight: 16, color: Palette.textMuted },
  iconButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.6, borderColor: Palette.borderStrong, backgroundColor: Palette.bgSurface, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  noticeText: { fontFamily: FontFamily.body, fontSize: 13, lineHeight: 16 },
});
