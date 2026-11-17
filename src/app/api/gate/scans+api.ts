import { getGateDatabase } from '@/server/gate-database';
import { apiError, authorize, jsonResponse, parseScan } from '@/server/gate-http';

export function GET(request: Request) {
  try { authorize(request); return jsonResponse(getGateDatabase().result(new URL(request.url).searchParams.get('id') ?? '')); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try { authorize(request); return jsonResponse(getGateDatabase().recordScan(await parseScan(request))); }
  catch (error) { return apiError(error); }
}
