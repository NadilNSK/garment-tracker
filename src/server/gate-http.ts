import { timingSafeEqual } from 'node:crypto';

import { GateError } from './gate-database';
import type { ScanRequest } from '../types/gate';

export function authorize(request: Request) {
  // Local development works immediately. Production must be connected to officer auth.
  if (process.env.NODE_ENV !== 'production') return;
  const token = process.env.GATE_API_TOKEN;
  if (!token) throw new GateError('Officer authentication is not configured.', 503);
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(token);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new GateError('Officer authentication required.', 401);
}
export function apiError(error: unknown) {
  return Response.json({ error: error instanceof GateError ? error.message : 'The gate service could not complete this request.' }, { status: error instanceof GateError ? error.status : 500 });
}
export function jsonResponse(data: unknown) { return Response.json(data, { headers: { 'Cache-Control': 'no-store' } }); }
export async function parseScan(request: Request): Promise<ScanRequest> {
  if (Number(request.headers.get('Content-Length')) > 8192) throw new GateError('Scan is too large.', 413);
  const raw = await request.text();
  if (raw.length > 8192) throw new GateError('Scan is too large.', 413);
  let body;
  try { body = JSON.parse(raw); } catch { throw new GateError('Invalid scan JSON.'); }
  if (!body || typeof body !== 'object' ||
    typeof body.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.id) ||
    typeof body.token !== 'string' || body.token.length < 1 || body.token.length > 2048 ||
    typeof body.vehicle !== 'string' || !/^[a-zA-Z0-9 -]{3,24}$/.test(body.vehicle) ||
    typeof body.scannedAt !== 'string' || !Number.isFinite(Date.parse(body.scannedAt))) throw new GateError('Provide a scan ID, pass, vehicle plate, and scan time.');
  if (request.headers.get('Idempotency-Key') !== body.id) throw new GateError('Idempotency key must match the scan ID.');
  return { id: body.id, token: body.token, vehicle: body.vehicle, scannedAt: body.scannedAt };
}
