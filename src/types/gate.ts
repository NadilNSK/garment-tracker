export type ShipmentStatus = 'in-transit' | 'received' | 'flagged' | 'awaiting-exit';

export type Shipment = {
  id: string;
  from: string;
  to: string;
  destination: string;
  vehicle: string;
  pieces: number;
  bundles: number;
  style: string;
  departed: string;
  expectedArrival: string;
  gate: string;
  status: ShipmentStatus;
  subtitle?: string;
};

export type ShipmentSummary = { total: number; inTransit: number; received: number; flagged: number };
export type ShipmentList = { shipments: Shipment[]; summary: ShipmentSummary };
export type ScanRequest = {
  id: string;
  token: string;
  vehicle: string;
  scannedAt: string;
};
export type ScanResult = {
  scanId: string;
  transferId: string;
  outcome: 'released' | 'rejected';
  signature: 'valid' | 'invalid';
  reason?: 'already-exited' | 'invalid-pass' | 'vehicle-mismatch';
  vehicle: string;
  firstExit?: string;
  shipment?: Shipment;
  recordedAt: string;
  notificationRecorded: boolean;
};
export type QueuedScan = ScanRequest & {
  transferId: string;
  kind: 'Exit' | 'Entry';
  quantity: string;
  status: 'pending' | 'synced';
  result?: ScanResult;
};
export type QueueData = {
  version: 1;
  scans: QueuedScan[];
  syncedToday: number;
  syncDay: string;
  lastUpload: string | null;
};
export type GateConfig = { supervisorPhone: string | null; sampleData: boolean };
