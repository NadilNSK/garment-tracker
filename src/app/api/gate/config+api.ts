import { apiError, authorize, jsonResponse } from '@/server/gate-http';
import { shouldSeedSampleData } from '@/server/gate-database';

export function GET(request: Request) {
  try {
    authorize(request);
    const phone = process.env.GATE_SUPERVISOR_PHONE?.trim();
    return jsonResponse({ supervisorPhone: phone && /^\+?[\d ()-]{6,24}$/.test(phone) ? phone : null, sampleData: shouldSeedSampleData() });
  } catch (error) { return apiError(error); }
}
