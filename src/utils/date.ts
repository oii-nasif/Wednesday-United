/**
 * Date and Time utilities for Wednesday United
 * Time Zone: Asia/Dhaka (UTC+6)
 */

export const DHAKA_TIMEZONE = 'Asia/Dhaka';

/**
 * Creates an ISO UTC string from a Dhaka date string (YYYY-MM-DD) and time string (HH:mm)
 */
export function createDhakaTimestamp(dateStr: string, timeStr: string): string {
  // Format: YYYY-MM-DDTHH:mm:00+06:00
  const isoLocal = `${dateStr}T${timeStr}:00+06:00`;
  const date = new Date(isoLocal);
  return date.toISOString();
}

/**
 * Formats an ISO string or Date into Dhaka time
 */
export function formatDhakaDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DHAKA_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDhakaTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DHAKA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDhakaDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DHAKA_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Checks if the given kickoffAt timestamp is within 24 hours of now.
 * According to BR-05:
 * Cutoff is the moment 24 hours before kickoff.
 * If remaining hours < 24 and > 0, self-cancellation is locked!
 */
export function getCutoffStatus(kickoffAtIso: string, now: Date = new Date()) {
  const kickoff = new Date(kickoffAtIso).getTime();
  const current = now.getTime();
  const diffMs = kickoff - current;
  const hoursUntilKickoff = diffMs / (1000 * 60 * 60);

  const isPast = diffMs <= 0;
  const isInsideCutoff = hoursUntilKickoff <= 24 && !isPast;
  const hoursRemainingBeforeCutoff = Math.max(0, hoursUntilKickoff - 24);

  return {
    isPast,
    isInsideCutoff,
    hoursUntilKickoff: Math.max(0, hoursUntilKickoff),
    hoursRemainingBeforeCutoff,
    cutoffPassed: hoursUntilKickoff <= 24,
  };
}

/**
 * Formats relative time (e.g. "in 3 days", "2 hours ago")
 */
export function formatTimeUntil(targetIso: string, now: Date = new Date()): string {
  const target = new Date(targetIso).getTime();
  const current = now.getTime();
  const diffMs = target - current;

  if (diffMs <= 0) return 'Passed';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return `${diffDays}d ${remHours}h`;
  }
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHours}h ${diffMins}m`;
}
