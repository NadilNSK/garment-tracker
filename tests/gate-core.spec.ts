import { expect, test } from '@playwright/test';

import { queueSample, releasedSample } from '../src/data/gate-samples';
import { GateDatabase } from '../src/server/gate-database';
import { SyncQueue } from '../src/services/sync-queue';
import type { QueueData } from '../src/types/gate';

test('backend aggregate totals, route search and vehicle search', () => {
  const db = new GateDatabase(':memory:');
  try {
    expect(db.shipments().summary).toEqual({ total: 23, inTransit: 6, received: 16, flagged: 1 });
    expect(db.shipments('wp lb4521').shipments[0].id).toBe('TRF-2610-0418');
    expect(db.shipments('Katunayake Kandy').shipments.map(s => s.id)).toEqual(['TRF-2610-0411']);
  } finally { db.close(); }
});
test('backend idempotency, replay detection, invalid signatures and plate validation', () => {
  const db = new GateDatabase(':memory:');
  try {
    const { fresh, exited } = db.createDemoPasses();
    const input = { id: 'test-scan-0001', ...fresh, scannedAt: new Date().toISOString() };
    const released = db.recordScan(input);
    expect(released.outcome).toBe('released');
    expect(db.recordScan(input)).toEqual(released);
    expect(() => db.recordScan({ ...input, vehicle: 'WRONG-123' })).toThrow(/different scan data/);
    expect(db.recordScan({ ...input, id: 'test-scan-0002' })).toMatchObject({ signature: 'valid', reason: 'already-exited', outcome: 'rejected' });
    expect(db.recordScan({ ...input, ...exited, id: 'test-scan-0003' })).toMatchObject({ signature: 'valid', reason: 'already-exited', vehicle: 'WP CAB-1123' });
    expect(db.recordScan({ ...input, id: 'test-scan-0004', token: `${fresh.token}tampered` })).toMatchObject({ signature: 'invalid', outcome: 'rejected' });
    const other = db.createDemoPasses().fresh;
    expect(db.recordScan({ ...input, ...other, id: 'test-scan-0005', vehicle: 'WP WRONG-1' })).toMatchObject({ signature: 'valid', reason: 'vehicle-mismatch' });
  } finally { db.close(); }
});
test('concurrent queue retries share uploads and keep pending records on partial failure', async () => {
  let saved: QueueData | null = null;
  const calls: string[] = [];
  let fail = true;
  const queue = new SyncQueue({
    initial: queueSample(), online: true,
    storage: { load: async () => saved, save: async data => { saved = structuredClone(data); } },
    upload: async scan => {
      calls.push(scan.id);
      await new Promise(resolve => setTimeout(resolve, 10));
      if (scan.id === 'preview-0429' && fail) throw new Error('Connection lost');
      return { ...releasedSample, scanId: scan.id };
    },
  });
  await Promise.all([queue.retry(), queue.retry(), queue.retry()]);
  expect(calls).toEqual(['preview-0431', 'preview-0429']);
  expect(queue.getSnapshot().scans.filter(s => s.status === 'pending')).toHaveLength(2);
  fail = false;
  await Promise.all([queue.retry(), queue.retry()]);
  expect(calls.filter(id => id === 'preview-0431')).toHaveLength(1);
  expect(queue.getSnapshot().scans.filter(s => s.status === 'pending')).toHaveLength(0);
  const restored = new SyncQueue({ storage: { load: async () => saved, save: async () => {} }, online: true, upload: async () => { throw new Error('Must not upload acknowledged scans'); } });
  await restored.retry();
  expect(restored.getSnapshot().scans.filter(s => s.status === 'pending')).toHaveLength(0);
});
test('offline, bad acknowledgment and storage failure preserve pending scans', async () => {
  let calls = 0;
  const queue = new SyncQueue({ initial: queueSample(), storage: { load: async () => null, save: async () => {} }, upload: async () => { calls++; return releasedSample; } });
  await queue.retry(); await queue.retry();
  expect(calls).toBe(0);
  expect(queue.getSnapshot().scans.filter(s => s.status === 'pending')).toHaveLength(3);
  queue.setOnline(true); await queue.retry();
  expect(queue.getSnapshot().scans.filter(s => s.status === 'pending')).toHaveLength(3);
  const broken = new SyncQueue({ storage: { load: async () => { throw new Error('Storage denied'); }, save: async () => {} }, upload: async () => releasedSample });
  await broken.initialize();
  expect(broken.getSnapshot().ready).toBe(false);
  expect(broken.getSnapshot().message).toContain('have not been changed');
});

test('scan outcomes and signing keys survive reopening the database', () => {
  const path = test.info().outputPath('persistence.sqlite');
  const first = new GateDatabase(path);
  const pass = first.createDemoPasses().fresh;
  const scan = { id: 'persistent-scan-0001', ...pass, scannedAt: new Date().toISOString() };
  const result = first.recordScan(scan);
  first.close();
  const reopened = new GateDatabase(path);
  try {
    expect(reopened.result(scan.id)).toEqual(result);
    expect(reopened.recordScan(scan)).toEqual(result);
    expect(reopened.recordScan({ ...scan, id: 'persistent-scan-0002' })).toMatchObject({ signature: 'valid', reason: 'already-exited' });
  } finally { reopened.close(); }
});
