import type { QueueData, ScanResult, Shipment, ShipmentList } from '../types/gate';

// Figma fixtures only. UI previews never write these scans to the real queue or API.
export const releasedShipment: Shipment = {
  id: 'TRF-2610-0418', from: 'Biyagama', to: 'Katunayake',
  destination: 'Washing Plant – Katunayake', vehicle: 'WP LB-4521',
  pieces: 1500, bundles: 30, style: 'ST-7781', departed: '2026-10-28T09:41:12+05:30',
  expectedArrival: '11:20', gate: 'Main Gate · Sewing Plant', status: 'in-transit',
};
export const shipmentSamples: ShipmentList = {
  summary: { total: 23, inTransit: 6, received: 16, flagged: 1 },
  shipments: [
    releasedShipment,
    { ...releasedShipment, id: 'TRF-2610-0411', from: 'Katunayake', to: 'Kandy', vehicle: 'CP-6630', status: 'flagged', subtitle: 'Katunayake → Kandy · CP-6630' },
    { ...releasedShipment, id: 'TRF-2610-0416', to: 'Embroidery Sub.', vehicle: 'WP NB-7810', pieces: 600, status: 'in-transit', subtitle: 'Biyagama → Embroidery Sub. · 600 pcs' },
    { ...releasedShipment, id: 'TRF-2610-0415', from: 'Embroidery Sub.', to: 'Biyagama', vehicle: 'WP NB-2210', pieces: 800, status: 'received', subtitle: 'Embroidery Sub. → Biyagama · 800/800' },
  ],
};
export const releasedSample: ScanResult = {
  scanId: 'preview-released', transferId: releasedShipment.id, outcome: 'released',
  signature: 'valid', vehicle: releasedShipment.vehicle, shipment: releasedShipment,
  recordedAt: releasedShipment.departed, notificationRecorded: true,
};
export const rejectedSample: ScanResult = {
  ...releasedSample, scanId: 'preview-rejected', outcome: 'rejected',
  reason: 'already-exited', vehicle: 'WP CAB-1123', firstExit: releasedShipment.departed,
};
export function queueSample(synced = false): QueueData {
  return {
    version: 1, syncedToday: synced ? 23 : 20, syncDay: '2026-10-28',
    lastUpload: `2026-10-28T${synced ? '14:31:08' : '13:48:00'}+05:30`,
    scans: synced ? [] : [
      { id: 'preview-0431', token: 'preview-only', transferId: 'TRF-2610-0431', kind: 'Exit', vehicle: 'WP CAB-7712', quantity: '1,200 pcs', scannedAt: '2026-10-28T13:55:00+05:30', status: 'pending' },
      { id: 'preview-0429', token: 'preview-only', transferId: 'TRF-2610-0429', kind: 'Entry', vehicle: 'LH-8890', quantity: '640/640 pcs', scannedAt: '2026-10-28T13:51:00+05:30', status: 'pending' },
      { id: 'preview-0427', token: 'preview-only', transferId: 'TRF-2610-0427', kind: 'Exit', vehicle: 'WP LB-3304', quantity: '900 pcs', scannedAt: '2026-10-28T13:49:00+05:30', status: 'pending' },
      { id: 'preview-0425', token: 'preview-only', transferId: 'TRF-2610-0425', kind: 'Exit', vehicle: 'WP NB-2210', quantity: '1,000 pcs', scannedAt: '2026-10-28T13:46:00+05:30', status: 'synced' },
    ],
  };
}
