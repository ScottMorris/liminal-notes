import { Reminder, TimeTrigger } from './types';
import { localToUtcIso, utcToLocalIso, nowISO, getLocalTimezone } from './time';
import { addDays, addWeeks, addMonths, parseISO, isAfter } from 'date-fns';

export function computeNextFireAt(reminder: Reminder, nowUtcIso: string = nowISO()): string | undefined {
  if (reminder.trigger.type !== 'time') return undefined; // Only time triggers for now

  const trigger = reminder.trigger as TimeTrigger;
  const timezone = trigger.timezone || getLocalTimezone();

  // Base start time in UTC
  const startUtc = localToUtcIso(trigger.at, timezone);
  if (!startUtc) return undefined;

  const nowDate = parseISO(nowUtcIso);
  const startDate = parseISO(startUtc);

  // If one-shot
  if (!trigger.repeat) {
    if (isAfter(startDate, nowDate)) {
        return applyQuietHours(startUtc, reminder.quietHours, timezone);
    }
    return undefined;
  }

  // Repeating
  // Find the next occurrence strictly after now
  // Optimization: If startDate > now, then startDate is the next occurrence.
  if (isAfter(startDate, nowDate)) {
      return applyQuietHours(startUtc, reminder.quietHours, timezone);
  }

  // Start date is in past. Calculate next occurrence.
  let nextDate = startDate;

  // Safety break
  let iterations = 0;
  // Limit for safety, though for interval/daily it might not be enough if catchup is huge.
  // Ideally use math for fixed intervals.

  const repeat = trigger.repeat;

  if (repeat.kind === 'interval') {
      const minutes = repeat.minutes;
      // Calculate how many intervals have passed
      const diffMinutes = (nowDate.getTime() - startDate.getTime()) / (1000 * 60);
      const intervalsPassed = Math.floor(diffMinutes / minutes);
      // Next is intervalsPassed + 1
      const nextTime = startDate.getTime() + (intervalsPassed + 1) * minutes * 60 * 1000;
      nextDate = new Date(nextTime);
  } else if (repeat.kind === 'daily') {
      const interval = repeat.interval || 1;
      const diffDays = (nowDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const intervalsPassed = Math.floor(diffDays / interval);
      // Rough estimation using addDays to handle DST correctly via date-fns
      // We start from startDate and add (intervalsPassed + 1) * interval days
      nextDate = addDays(startDate, (intervalsPassed + 1) * interval);

      // If still before now (due to DST shifts or rough calc), add one more interval
      while (!isAfter(nextDate, nowDate) && iterations < 10) {
          nextDate = addDays(nextDate, interval);
          iterations++;
      }
  } else if (repeat.kind === 'weekly') {
      // Simplification: just add 1 week for now if interval=1 and no byWeekday
      // Ideally implement full RRULE or similar, but for MVP:
      const interval = repeat.interval || 1;
      nextDate = addWeeks(startDate, 1);
      while (!isAfter(nextDate, nowDate) && iterations < 1000) {
          nextDate = addWeeks(nextDate, interval);
          iterations++;
      }
  } else if (repeat.kind === 'monthly') {
      const interval = repeat.interval || 1;
      nextDate = addMonths(startDate, 1);
      while (!isAfter(nextDate, nowDate) && iterations < 1000) {
          nextDate = addMonths(nextDate, interval);
          iterations++;
      }
  }

  if (isAfter(nextDate, nowDate)) {
      return applyQuietHours(nextDate.toISOString(), reminder.quietHours, timezone);
  }

  return undefined;
}

export function applyQuietHours(
  fireAtUtcIso: string,
  quietHours: Reminder['quietHours'],
  timezone: string
): string {
  if (!quietHours || !quietHours.enabled) return fireAtUtcIso;

  const fireDateUtc = parseISO(fireAtUtcIso);
  // Convert to local time to check against "HH:mm" strings
  const localIso = utcToLocalIso(fireAtUtcIso, timezone);
  if (!localIso) return fireAtUtcIso; // Should not happen

  // Extract HH:mm from localIso
  const timePart = localIso.split('T')[1].substring(0, 5); // HH:mm

  // Simple string comparison for HH:mm works
  const start = quietHours.startLocal;
  const end = quietHours.endLocal;

  // Check if inside quiet hours
  // Case 1: Start < End (e.g. 22:00 to 23:00)
  // Case 2: Start > End (e.g. 22:00 to 07:00)

  let isInside = false;
  if (start < end) {
      isInside = timePart >= start && timePart < end;
  } else {
      isInside = timePart >= start || timePart < end;
  }

  if (isInside) {
      // Move to end time
      // We need to determine WHICH "end time".
      // If today's time < end, it's today's end time.
      // If today's time >= start, it's tomorrow's end time (if start > end).

      // Actually, simplest is: construct a date with "endLocal" time on the *same day* as localIso
      // If that resulting time is before fireDate, add 1 day.

      // Let's take the fire date's YYYY-MM-DD
      const datePart = localIso.split('T')[0];
      const tentativeEndLocal = `${datePart}T${end}:00.000`;
      const tentativeEndUtc = localToUtcIso(tentativeEndLocal, timezone);

      if (!tentativeEndUtc) return fireAtUtcIso;

      let newFireDate = parseISO(tentativeEndUtc);

      // If newFireDate is before or equal to original fireDate, it means the "end" is the next day
      // (or we are in the "late night" part of a span like 22:00-07:00 and current is 02:00, so 07:00 is same day.
      // But if current is 23:00, 07:00 is next day).

      // Let's logic it out better.
      // If we are in quiet hours, we must wait until they end.
      // The end time is the next occurrence of `endLocal`.

      // If timePart < end (morning of a night-spanning range), then today's end is valid.
      // If timePart >= start (evening of a night-spanning range), then tomorrow's end is valid.
      // If start < end and we are inside, then today's end is valid.

      if (start > end && timePart >= start) {
          // Night spanning, we are in the pre-midnight part. End is tomorrow.
          newFireDate = addDays(newFireDate, 1);
      }

      // Verify newFireDate > fireDateUtc
      if (!isAfter(newFireDate, fireDateUtc)) {
           // Should not happen with above logic, but safety:
           // If we calculated an end time that is somehow before the trigger, push it.
           newFireDate = addDays(newFireDate, 1);
      }

      return newFireDate.toISOString();
  }

  return fireAtUtcIso;
}
