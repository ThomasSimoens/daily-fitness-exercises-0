/**
 * Returns today's weekday as a lowercase 3-letter code.
 * At build time this is the build date. For dynamic accuracy,
 * this can be called client-side.
 */
export function getTodayWeekday(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
}