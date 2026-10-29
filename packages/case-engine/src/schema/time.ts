import { z } from 'zod';

/**
 * Time is represented as minutes since 00:00 on the case day.
 * Range 0..2879 allows past midnight up to 47:59 (48-hour timeline window).
 * Example: 23:47 → 23 * 60 + 47 = 1427.
 */
export const TimeSchema = z
  .number()
  .int('Time must be an integer minute value')
  .min(0, 'Time cannot be negative')
  .max(2879, 'Time cannot exceed 2879 minutes (47:59)');

export type Time = z.infer<typeof TimeSchema>;

/**
 * Parses a "HH:MM" string into minutes since 00:00.
 * Allows hours 0..47 and minutes 0..59.
 */
export function toTime(str: string): Time {
  if (typeof str !== 'string') {
    throw new Error(`Expected time string, received ${typeof str}`);
  }
  const parts = str.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid time format '${str}', expected 'HH:MM'`);
  }
  const hoursStr = parts[0];
  const minsStr = parts[1];
  if (!hoursStr || !minsStr || hoursStr.length === 0 || minsStr.length === 0) {
    throw new Error(`Invalid time format '${str}', expected 'HH:MM'`);
  }
  const hours = Number(hoursStr);
  const mins = Number(minsStr);
  if (!Number.isInteger(hours) || !Number.isInteger(mins) || mins < 0 || mins >= 60 || hours < 0) {
    throw new Error(`Invalid time values in '${str}'`);
  }
  const total = hours * 60 + mins;
  if (total < 0 || total > 2879) {
    throw new Error(`Time '${str}' out of range 0..2879 minutes`);
  }
  return total;
}

/**
 * Formats minutes since 00:00 into "HH:MM".
 * Zero-pads hours and minutes.
 */
export function fromTime(time: Time): string {
  const parsed = TimeSchema.parse(time);
  const hours = Math.floor(parsed / 60);
  const mins = parsed % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
