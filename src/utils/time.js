/**
 * Convert 24h time string (HH:mm or H:mm) to 12h display format.
 * @param {string} time24 - e.g. "23:00", "08:30", "14:00"
 * @returns {string} - e.g. "11:00 PM", "8:30 AM", "2:00 PM"
 */
export function formatTime12h(time24) {
  if (!time24) return '—';
  const [h, m] = time24.split(':').map(Number);
  const hours = h ?? 0;
  const mins = m ?? 0;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const mStr = mins > 0 ? `:${String(mins).padStart(2, '0')}` : '';
  return `${h12}${mStr} ${period}`;
}

/**
 * Get current time in 24h format for storage (HH:mm).
 */
export function getTimeNow24h() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convert minutes since midnight to 24h time string (HH:mm).
 */
export function minutesToTime24(minutes) {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes)));
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Snap minutes to nearest 15-minute interval.
 */
export function snapTo15Minutes(minutes) {
  return Math.round(minutes / 15) * 15;
}

const MINS_PER_DAY = 24 * 60;

/**
 * Add days to a date string (YYYY-MM-DD).
 */
export function addDaysToDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Convert raw minutes (can be negative or > 24*60) to { date, minutes }.
 * dateStr is the event's current date.
 */
export function rawMinutesToDateAndTime(dateStr, rawMinutes) {
  let dayOffset = Math.floor(rawMinutes / MINS_PER_DAY);
  let mins = rawMinutes - dayOffset * MINS_PER_DAY;
  if (mins < 0) {
    mins += MINS_PER_DAY;
    dayOffset -= 1;
  }
  const date = addDaysToDate(dateStr, dayOffset);
  const snapped = snapTo15Minutes(Math.max(0, Math.min(MINS_PER_DAY - 1, mins)));
  return { date, minutes: snapped };
}

/**
 * Get total 15-min slots from refDate 00:00 to the given date+minutes.
 */
export function toAbsoluteSlots(refDateStr, dateStr, minutes) {
  const [ry, rm, rd] = refDateStr.split('-').map(Number);
  const [y, m, d] = dateStr.split('-').map(Number);
  const refDate = new Date(ry, rm - 1, rd);
  const date = new Date(y, m - 1, d);
  const dayDiff = Math.round((date - refDate) / (24 * 60 * 60 * 1000));
  return dayDiff * (MINS_PER_DAY / 15) + Math.round(minutes / 15);
}

/**
 * Convert absolute 15-min slots back to { date, minutes }.
 */
export function fromAbsoluteSlots(refDateStr, slots) {
  const slotsPerDay = MINS_PER_DAY / 15;
  const dayOffset = Math.floor(slots / slotsPerDay);
  const slotInDay = ((slots % slotsPerDay) + slotsPerDay) % slotsPerDay;
  const minsInDay = slotInDay * 15;
  const date = addDaysToDate(refDateStr, dayOffset);
  return { date, minutes: Math.min(MINS_PER_DAY - 1, Math.max(0, minsInDay)) };
}

/**
 * Parse 24h time string to minutes since midnight (for sorting).
 */
export function parseTimeToMinutes(time24) {
  if (!time24) return 0;
  const [h, m] = time24.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Get event end time in minutes (start + duration).
 */
export function getEventEndMinutes(event) {
  const { startMinutes, durationMinutes } = getEventStartAndDuration(event);
  return startMinutes + durationMinutes;
}

/**
 * Get the visible segment of an overnight sleep event for a given view date.
 * Returns { startMinutes, endMinutes } or null if sleep doesn't touch that day.
 */
export function getSleepSegmentForDay(event, viewDateStr) {
  if (event.type !== 'sleep' || !event.startTime || !event.endTime) return null;
  const start = parseTimeToMinutes(event.startTime);
  let end = parseTimeToMinutes(event.endTime);
  if (end <= start) end += MINS_PER_DAY;
  const eventDate = event.date;
  const nextDate = addDaysToDate(eventDate, 1);

  if (viewDateStr === eventDate) {
    const segEnd = Math.min(end, MINS_PER_DAY);
    return { startMinutes: start, endMinutes: segEnd };
  }
  if (viewDateStr === nextDate && end > MINS_PER_DAY) {
    const segEnd = end - MINS_PER_DAY;
    return { startMinutes: 0, endMinutes: segEnd };
  }
  return null;
}

/**
 * Get event start (minutes from midnight) and duration (minutes).
 * For sleep: uses startTime and endTime (handles overnight).
 * For exercise: uses time + duration.
 * For others: uses time, default 30 min duration.
 */
export function getEventStartAndDuration(event) {
  const MINS_PER_DAY = 24 * 60;
  const DEFAULT_DURATION = 30;

  if (event.type === 'sleep' && event.startTime && event.endTime) {
    const start = parseTimeToMinutes(event.startTime);
    let end = parseTimeToMinutes(event.endTime);
    if (end <= start) end += MINS_PER_DAY; // overnight
    return { startMinutes: start, durationMinutes: end - start };
  }

  if (event.type === 'exercise' && event.duration) {
    const start = parseTimeToMinutes(event.time ?? event.startTime ?? '00:00');
    return { startMinutes: start, durationMinutes: event.duration };
  }

  const start = parseTimeToMinutes(event.time ?? event.startTime ?? '00:00');
  return { startMinutes: start, durationMinutes: DEFAULT_DURATION };
}
