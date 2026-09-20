/** Attendance uses the school calendar in Jakarta, independent of device timezone. */
export function schoolDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now)
}
