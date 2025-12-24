import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { isValid, parseISO } from 'date-fns';

export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Converts a local time string (e.g. "2023-10-27T10:00:00") in a specific timezone
 * to a UTC ISO string.
 */
export function localToUtcIso(localIso: string, timezone: string): string | undefined {
  try {
    // Treat localIso as a simplified ISO string without offset
    // We assume localIso is "YYYY-MM-DDTHH:mm:ss" or similar
    // date-fns-tz fromZonedTime takes a string or date and a timezone.
    // If we pass a string without offset, it treats it as local time in that timezone.
    const date = fromZonedTime(localIso, timezone);
    if (!isValid(date)) return undefined;
    return date.toISOString();
  } catch (e) {
    return undefined;
  }
}

/**
 * Converts a UTC ISO string to a local time string in the target timezone.
 * Returns in format "yyyy-MM-dd'T'HH:mm:ss.SSS" (no offset).
 */
export function utcToLocalIso(utcIso: string, timezone: string): string | undefined {
  try {
    const date = parseISO(utcIso);
    if (!isValid(date)) return undefined;
    // Format it in the timezone
    return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS");
  } catch (e) {
    return undefined;
  }
}

/**
 * Returns the current local time in the specified timezone as ISO (no offset).
 */
export function nowLocalIso(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS");
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
