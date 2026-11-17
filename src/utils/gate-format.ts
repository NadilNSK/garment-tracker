export const gateTime = (value: string, seconds = false) => new Date(value).toLocaleTimeString('en-GB', {
  timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}),
});
export const gateDay = (value: string | Date) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
export const departureLabel = (value: string) => `${gateTime(value, true)} · ${new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short' })}`;
export function matchesShipment(query: string, shipment: { id: string; from: string; to: string; vehicle: string }) {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return normalize(`${shipment.id} ${shipment.from} ${shipment.to} ${shipment.vehicle}`).includes(normalize(query));
}
