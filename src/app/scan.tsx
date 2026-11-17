import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GateButton, GateHeader, GateScreen, gateStyles, Notice } from '@/components/gate/screen';
import { FontFamily, Palette } from '@/constants/theme';
import { useGateQueue } from '@/hooks/use-gate-queue';
import { gateApi } from '@/services/gate-api';

export default function ScanScreen() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(false);
  const [token, setToken] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const state = useGateQueue();
  const startCamera = async () => {
    try {
      const access = permission?.granted ? permission : await requestPermission();
      if (access.granted) { setCamera(true); setMessage(null); }
      else setMessage('Camera access was denied. You can paste the signed pass below, or enable camera access in device settings.');
    } catch { setMessage('The camera could not start. You can paste the signed pass below.'); }
  };
  const submit = async () => {
    if (lock.current) return;
    if (!token.trim() || !vehicle.trim()) { setMessage('Scan or paste the signed pass and enter the vehicle plate.'); return; }
    if (!/^[a-zA-Z0-9 -]{3,24}$/.test(vehicle.trim())) { setMessage('Enter a vehicle plate using letters, numbers, spaces, or hyphens.'); return; }
    lock.current = true; setBusy(true); setMessage(null);
    const id = `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    try {
      await state.queue.enqueue({ id, token: token.trim(), vehicle: vehicle.trim().toUpperCase(), scannedAt: new Date().toISOString(), transferId: token.match(/TRF-\d{4}-\d{4}/)?.[0] ?? 'Unverified pass', kind: 'Exit', quantity: '', status: 'pending' });
      await state.queue.retry();
      const saved = state.queue.getSnapshot().scans.find(scan => scan.id === id);
      if (saved?.result) router.replace({ pathname: saved.result.outcome === 'released' ? '/vehicle-released' : '/pass-rejected', params: { scanId: id } });
      else router.replace('/sync-queue');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The scan could not be saved. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const loadDemo = async (kind: 'fresh' | 'exited') => {
    try { const data = (await gateApi.demoPasses())[kind]; setToken(data.token); setVehicle(data.vehicle); setMessage('Sample pass loaded. Verify it to test the result screen.'); }
    catch { setMessage('The sample pass could not be loaded. Check that the development server is running.'); }
  };
  return <GateScreen footer={<View style={gateStyles.actions}><GateButton label={busy ? 'Verifying…' : 'Verify & release'} disabled={busy} onPress={() => void submit()} /></View>}>
    <GateHeader title="Scan Vehicle Pass" subtitle="Main Gate · Sewing Plant" />
    <View style={gateStyles.body}>
      {!state.online ? <Notice tone="warning">Offline scans are saved for verification. Do not release a vehicle until its pass is verified.</Notice> : null}
      {camera ? <View style={styles.camera}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={event => { setToken(event.data); setCamera(false); setMessage('Pass scanned. Check the vehicle plate, then verify.'); }}
          onMountError={() => { setCamera(false); setMessage('Camera unavailable. Paste the signed pass below.'); }} />
      </View> : <View style={styles.cameraPlaceholder}><Text style={styles.cameraTitle}>SCAN THE MASTER QR PASS</Text><Text style={styles.cameraText}>Position the complete QR code inside the camera.</Text></View>}
      <GateButton label={camera ? 'Close camera' : 'Open camera'} variant="secondary" onPress={() => camera ? setCamera(false) : void startCamera()} />
      <Text style={gateStyles.strong}>Signed pass</Text>
      <TextInput value={token} onChangeText={setToken} placeholder="Scan or paste the signed QR contents" accessibilityLabel="Signed pass" style={gateStyles.input} autoCapitalize="none" autoCorrect={false} multiline maxLength={2048} />
      <Text style={gateStyles.strong}>Vehicle plate</Text>
      <TextInput value={vehicle} onChangeText={setVehicle} placeholder="e.g. WP LB-4521" accessibilityLabel="Vehicle plate" style={gateStyles.input} autoCapitalize="characters" autoCorrect={false} maxLength={24} />
      {message ? <Notice tone="warning">{message}</Notice> : null}
      {__DEV__ && demo === '1' ? <><GateButton label="Load unused sample pass" variant="secondary" onPress={() => void loadDemo('fresh')} /><GateButton label="Load already-exited sample" variant="secondary" onPress={() => void loadDemo('exited')} /></> : null}
    </View>
  </GateScreen>;
}
const styles = StyleSheet.create({
  camera: { height: 240, borderRadius: 18, overflow: 'hidden', backgroundColor: Palette.bgInverse },
  cameraPlaceholder: { minHeight: 180, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: Palette.bgInverse, borderRadius: 18 },
  cameraTitle: { fontFamily: FontFamily.display, fontSize: 24, color: Palette.textAccent, textAlign: 'center' },
  cameraText: { fontFamily: FontFamily.bodyRegular, fontSize: 14, color: Palette.textOnInverse, textAlign: 'center' },
});
