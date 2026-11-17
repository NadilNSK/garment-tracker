// Imported only by +api routes and backend tests. Never import this from a screen.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { shipmentSamples } from '../data/gate-samples';
import type { ScanRequest, ScanResult, Shipment, ShipmentList } from '../types/gate';
import { matchesShipment } from '../utils/gate-format';

export class GateError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export class GateDatabase {
  private db: DatabaseSync;
  private secret: string;
  constructor(path: string, seed = true) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS shipments (id TEXT PRIMARY KEY, data TEXT NOT NULL, position INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, delivered_at TEXT);`);
    this.db.prepare('INSERT OR IGNORE INTO meta VALUES (?, ?)').run('signing-secret', randomBytes(32).toString('hex'));
    this.secret = process.env.GATE_PASS_SECRET || String(this.db.prepare('SELECT value FROM meta WHERE key = ?').get('signing-secret')!.value);
    if (seed && !this.db.prepare('SELECT id FROM shipments LIMIT 1').get()) this.seed();
  }
  close() { this.db.close(); }
  private putShipment(shipment: Shipment, position = 100) {
    this.db.prepare('INSERT INTO shipments VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(shipment.id, JSON.stringify(shipment), position);
  }
  private seed() {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      shipmentSamples.shipments.forEach((item, index) => this.putShipment(item, index));
      // The other 19 transfers make the daily totals real aggregate queries.
      for (let i = 0; i < 19; i++) this.putShipment({
        ...shipmentSamples.shipments[0], id: `TRF-2610-${String(380 + i).padStart(4, '0')}`,
        status: i < 4 ? 'in-transit' : 'received',
        subtitle: `Biyagama → Katunayake · ${i < 4 ? '1,500 pcs' : '1,500/1,500'}`,
      }, i + 4);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  shipments(query = ''): ShipmentList {
    const all = this.db.prepare('SELECT data FROM shipments ORDER BY position, id').all().map(row => JSON.parse(String(row.data)) as Shipment);
    return {
      shipments: all.filter(item => matchesShipment(query, item)).slice(0, query.trim() ? 100 : 4),
      summary: {
        total: all.length,
        inTransit: all.filter(item => item.status === 'in-transit').length,
        received: all.filter(item => item.status === 'received').length,
        flagged: all.filter(item => item.status === 'flagged').length,
      },
    };
  }
  signPass(id: string, expires = Date.now() + 86400000) {
    const payload = `TP1.${id}.${expires}`;
    return `${payload}.${createHmac('sha256', this.secret).update(payload).digest('hex')}`;
  }
  private verify(token: string) {
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'TP1' || !/^TRF-\d{4}-\d{4}$/.test(parts[1]) || !/^\d{13}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return null;
    const expected = createHmac('sha256', this.secret).update(parts.slice(0, 3).join('.')).digest();
    if (!timingSafeEqual(expected, Buffer.from(parts[3], 'hex')) || Number(parts[2]) < Date.now()) return null;
    return parts[1];
  }
  result(id: string): ScanResult {
    const row = this.db.prepare('SELECT result FROM scans WHERE id = ?').get(id);
    if (!row) throw new GateError('Scan not found.', 404);
    return JSON.parse(String(row.result));
  }
  recordScan(input: ScanRequest): ScanResult {
    const fingerprint = createHash('sha256').update(JSON.stringify([input.token, input.vehicle, input.scannedAt])).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT fingerprint, result FROM scans WHERE id = ?').get(input.id);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new GateError('This scan ID was already used for different scan data.', 409);
        this.db.exec('COMMIT');
        return JSON.parse(String(existing.result));
      }
      const transferId = this.verify(input.token);
      const row = transferId ? this.db.prepare('SELECT data FROM shipments WHERE id = ?').get(transferId) : null;
      const shipment: Shipment | undefined = row ? JSON.parse(String(row.data)) : undefined;
      const now = new Date().toISOString();
      const result: ScanResult = {
        scanId: input.id, transferId: transferId ?? 'Unrecognized pass', vehicle: input.vehicle,
        recordedAt: now, outcome: 'rejected', signature: transferId ? 'valid' : 'invalid',
        reason: 'invalid-pass', shipment, notificationRecorded: true,
      };
      if (shipment) {
        if (shipment.status !== 'awaiting-exit') {
          result.reason = 'already-exited'; result.firstExit = shipment.departed;
        } else if (shipment.vehicle.replace(/\s/g, '').toUpperCase() !== input.vehicle.replace(/\s/g, '').toUpperCase()) {
          result.reason = 'vehicle-mismatch';
        } else {
          result.outcome = 'released'; delete result.reason;
          result.shipment = { ...shipment, status: 'in-transit', departed: now };
          this.putShipment(result.shipment);
        }
      }
      this.db.prepare('INSERT INTO scans VALUES (?, ?, ?)').run(input.id, fingerprint, JSON.stringify(result));
      this.db.prepare('INSERT INTO notifications (id, kind, payload) VALUES (?, ?, ?)').run(input.id, result.outcome === 'released' ? 'receiving-gate' : 'security-alert', JSON.stringify(result));
      this.db.exec('COMMIT');
      return result;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  createDemoPasses(): { fresh: { token: string; vehicle: string }; exited: { token: string; vehicle: string } } {
    // This method is exposed by the development-only /demo endpoint.
    const id = `TRF-2610-${String(5000 + Math.floor(Math.random() * 4000))}`;
    if (this.db.prepare('SELECT id FROM shipments WHERE id = ?').get(id)) return this.createDemoPasses();
    this.putShipment({ ...shipmentSamples.shipments[0], id, status: 'awaiting-exit', departed: '' });
    return {
      fresh: { token: this.signPass(id), vehicle: 'WP LB-4521' },
      exited: { token: this.signPass('TRF-2610-0418'), vehicle: 'WP CAB-1123' },
    };
  }
}

let database: GateDatabase | undefined;
export function getGateDatabase() {
  database ??= new GateDatabase(resolve(process.env.GATE_DATABASE_PATH || '.data/gate.sqlite'), shouldSeedSampleData());
  return database;
}
export function shouldSeedSampleData() {
  return process.env.GATE_SEED_SAMPLE_DATA === 'true' || (process.env.NODE_ENV !== 'production' && process.env.GATE_SEED_SAMPLE_DATA !== 'false');
}
