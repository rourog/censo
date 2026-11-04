/* Seasonal Engine 2.0 - deterministic date matching in the hospital timezone. */
export const SEASON_TIMEZONE = 'America/Chihuahua';

export function localCalendarDate(date = new Date(), timeZone = SEASON_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const read = type => Number(parts.find(part => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day') };
}

export function isSeasonInRange(schedule, date = new Date()) {
  if (!schedule) return false;
  const {year,month,day}=localCalendarDate(date,schedule.timezone || SEASON_TIMEZONE);
  if (schedule.year != null && year !== schedule.year) return false;
  const current=month*100+day;
  const start=Number(schedule.start.replace('-',''));
  const end=Number(schedule.end.replace('-',''));
  return start<=end ? current>=start && current<=end : current>=start || current<=end;
}
