import type { QueueData, QueuedScan, ScanResult } from '../types/gate';
import { gateDay } from '../utils/gate-format';

export type QueueStorage = { load: () => Promise<QueueData | null>; save: (data: QueueData) => Promise<void> };
export type QueueSnapshot = QueueData & { online: boolean; ready: boolean; syncing: boolean; message: string | null };
export const emptyQueue = (): QueueData => ({ version: 1, scans: [], syncedToday: 0, syncDay: gateDay(new Date()), lastUpload: null });

/** One controller per device queue. Both automatic and manual retries share one flight. */
export class SyncQueue {
  private snapshot: QueueSnapshot;
  private listeners = new Set<() => void>();
  private flight: Promise<void> | null = null;
  private initialization: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private storage: QueueStorage;
  private upload: (scan: QueuedScan) => Promise<ScanResult>;
  private now: () => Date;

  constructor(options: { storage: QueueStorage; upload: (scan: QueuedScan) => Promise<ScanResult>; initial?: QueueData; online?: boolean; now?: () => Date }) {
    this.storage = options.storage;
    this.upload = options.upload;
    this.now = options.now ?? (() => new Date());
    this.snapshot = { ...(options.initial ?? emptyQueue()), online: options.online ?? false, ready: false, syncing: false, message: null };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<QueueSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private persist() {
    const { version, scans, syncedToday, syncDay, lastUpload } = this.snapshot;
    const write = this.writes.catch(() => {}).then(() => this.storage.save({ version, scans, syncedToday, syncDay, lastUpload }));
    this.writes = write;
    return write;
  }
  initialize() {
    if (this.initialization) return this.initialization;
    this.initialization = (async () => {
      try {
        const saved = await this.storage.load();
        if (saved) this.update(saved);
        if (this.snapshot.syncDay !== gateDay(this.now())) this.update({ syncedToday: 0, syncDay: gateDay(this.now()) });
        this.update({ ready: true });
      } catch {
        this.initialization = null;
        this.update({ message: 'Device storage could not be read. Your saved scans have not been changed.' });
      }
    })();
    return this.initialization;
  }
  setOnline(online: boolean) {
    this.update({ online });
    if (online) void this.retry();
  }
  async enqueue(scan: QueuedScan) {
    await this.initialize();
    if (!this.snapshot.ready) throw new Error('Device storage is unavailable. Please try again.');
    if (this.snapshot.scans.some(item => item.id === scan.id)) return;
    const previous = this.snapshot.scans;
    this.update({ scans: [scan, ...previous], message: null });
    try { await this.persist(); }
    catch {
      this.update({ scans: this.snapshot.scans.filter(item => item.id !== scan.id), message: 'This scan could not be saved. Keep the pass and try again.' });
      throw new Error('This scan could not be saved. Keep the pass and try again.');
    }
  }
  retry = (): Promise<void> => {
    if (this.flight) return this.flight;
    this.flight = this.flush().finally(() => { this.flight = null; });
    return this.flight;
  };
  private async flush() {
    await this.initialize();
    if (!this.snapshot.ready) return;
    if (!this.snapshot.online) {
      this.update({ message: 'Still offline. All pending scans are safely saved on this device.' });
      return;
    }
    this.update({ syncing: true, message: null });
    try {
      // Pick from the latest state so scans added during an upload join the same flight.
      while (this.snapshot.online) {
        const scan = this.snapshot.scans.find(item => item.status === 'pending');
        if (!scan) break;
        const result = await this.upload(scan);
        if (result.scanId !== scan.id) throw new Error('Upload acknowledgment did not match this scan.');
        const day = gateDay(this.now());
        this.update({
          scans: this.snapshot.scans.map(item => item.id === scan.id ? { ...item, status: 'synced', result } : item),
          lastUpload: this.now().toISOString(), syncDay: day,
          syncedToday: (this.snapshot.syncDay === day ? this.snapshot.syncedToday : 0) + 1,
        });
        await this.persist();
      }
    } catch {
      // A lost response is retried with the SAME id. The API returns its stored result.
      this.update({ message: 'Sync could not finish. Your scans are saved; retry when the connection is available.' });
    } finally { this.update({ syncing: false }); }
  }
}
