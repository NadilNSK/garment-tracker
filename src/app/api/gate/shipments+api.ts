import { getGateDatabase } from '@/server/gate-database';
import { apiError, authorize, jsonResponse } from '@/server/gate-http';

export function GET(request: Request) {
  try {
    authorize(request);
    return jsonResponse(getGateDatabase().shipments(new URL(request.url).searchParams.get('q')?.slice(0, 100) ?? ''));
  } catch (error) { return apiError(error); }
}
