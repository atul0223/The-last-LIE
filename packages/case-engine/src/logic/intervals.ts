/**
 * Interval semantics:
 * All intervals in the case engine represent half-open time ranges [from, to).
 *
 * A person or object is present/possessed at time t if:
 *   from <= t < to
 *
 * Touching intervals (e.g. [10, 20) and [20, 30), where interval A's `to` equals
 * interval B's `from`) do NOT overlap. The moment of transition `to` belongs to the
 * subsequent interval.
 */

/**
 * Returns true if half-open intervals [aFrom, aTo) and [bFrom, bTo) overlap.
 * Touching boundaries (aTo === bFrom or bTo === aFrom) do NOT overlap.
 */
export function intervalsOverlap(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  if (aFrom >= aTo || bFrom >= bTo) {
    return false;
  }
  return Math.max(aFrom, bFrom) < Math.min(aTo, bTo);
}

/**
 * Returns true if half-open interval [from, to) contains the instant `time`.
 * from <= time < to.
 */
export function intervalContains(from: number, to: number, time: number): boolean {
  return from <= time && time < to;
}
