/**
 * Pure streak computation functions.
 * Invariant: Missing a day resets the active streak counter to 0,
 * but NEVER removes XP, mastery score, detective rank, or unlocked cases.
 */

/**
 * Returns previous calendar date in YYYY-MM-DD format.
 */
export function getPreviousDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year!, month! - 1, day!));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0]!;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  playedToday: boolean;
  totalDailySolves: number;
}

/**
 * Computes the daily streak from a list of completion timestamps or date strings.
 *
 * @param completionDates Array of ISO timestamps or YYYY-MM-DD strings of submitted daily cases.
 * @param nowUtc Optional current UTC date string or Date object (defaults to current UTC date).
 */
export function computeDailyStreak(
  completionDates: string[],
  nowUtc?: string | Date,
): StreakInfo {
  if (!completionDates || completionDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, playedToday: false, totalDailySolves: 0 };
  }

  const nowIso = typeof nowUtc === 'string' ? nowUtc : nowUtc ? nowUtc.toISOString() : new Date().toISOString();
  const today = nowIso.split('T')[0]!;
  const yesterday = getPreviousDate(today);

  // Normalize dates into unique sorted set
  const uniqueDates = new Set<string>();
  for (const raw of completionDates) {
    if (!raw) continue;
    const datePart = raw.includes('T') ? raw.split('T')[0]! : raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      uniqueDates.add(datePart);
    }
  }

  const totalDailySolves = uniqueDates.size;
  const playedToday = uniqueDates.has(today);

  // Compute longest streak across all history
  const sortedDates = Array.from(uniqueDates).sort();
  let longestStreak = 0;
  let running = 0;
  let prev: string | null = null;
  for (const date of sortedDates) {
    if (!prev) {
      running = 1;
    } else if (getPreviousDate(date) === prev) {
      running++;
    } else {
      running = 1;
    }
    prev = date;
    if (running > longestStreak) {
      longestStreak = running;
    }
  }

  // Determine starting point for current streak count
  let checkDate: string | null = null;
  if (playedToday) {
    checkDate = today;
  } else if (uniqueDates.has(yesterday)) {
    // Player hasn't played today yet, but streak is active from yesterday
    checkDate = yesterday;
  } else {
    // Streak broken or no solves
    return { currentStreak: 0, longestStreak, playedToday: false, totalDailySolves };
  }

  let streak = 0;
  while (checkDate && uniqueDates.has(checkDate)) {
    streak++;
    checkDate = getPreviousDate(checkDate);
  }

  return {
    currentStreak: streak,
    longestStreak: Math.max(longestStreak, streak),
    playedToday,
    totalDailySolves,
  };
}
