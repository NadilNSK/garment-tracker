import { getGateDatabase } from '@/server/gate-database';
import { apiError, jsonResponse } from '@/server/gate-http';

export function POST() {
  if (process.env.NODE_ENV === 'production') return Response.json({ error: 'Not found.' }, { status: 404 });
  try { return jsonResponse(getGateDatabase().createDemoPasses()); }
  catch (error) { return apiError(error); }
}
