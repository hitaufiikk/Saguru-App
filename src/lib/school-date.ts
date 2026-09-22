/** Attendance uses the school calendar in Jakarta, independent of device timezone. */
export function schoolDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export interface BannerTimeInfo {
  line1: string
  line2: string
  semester: string
  tahunAjaran: string
  dateStr: string
  timeStr: string
}

/**
 * Calculates academic semester, school year, localized date, and realtime clock
 * strictly evaluated in the "Asia/Jakarta" timezone.
 *
 * Rules:
 * - Months 7-12 (July - Dec)  -> Semester Ganjil, Tahun Ajaran {year}/{year+1}
 * - Months 1-6 (Jan - June)   -> Semester Genap, Tahun Ajaran {year-1}/{year}
 * - Line 1: Semester {Ganjil/Genap} • Tahun Ajaran {YYYY}/{YYYY}
 * - Line 2: {Hari}, {DD} {Bulan} {YYYY} • {HH:mm:ss} WIB
 */
export function getBannerTimeInfo(now: Date = new Date()): BannerTimeInfo {
  const partsFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })

  const parts = Object.fromEntries(
    partsFormatter.formatToParts(now).map((p) => [p.type, p.value])
  )

  const year = parseInt(parts.year, 10)
  const month = parseInt(parts.month, 10) // 1-12

  const isGanjil = month >= 7 && month <= 12
  const semester = isGanjil ? "Semester Ganjil" : "Semester Genap"
  const startYear = isGanjil ? year : year - 1
  const endYear = startYear + 1
  const tahunAjaran = `Tahun Ajaran ${startYear}/${endYear}`

  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const dateStr = dateFormatter.format(now)
  const hour = (parts.hour || "00").padStart(2, "0")
  const minute = (parts.minute || "00").padStart(2, "0")
  const second = (parts.second || "00").padStart(2, "0")
  const timeStr = `${hour}:${minute}:${second} WIB`

  return {
    line1: `${semester} • ${tahunAjaran}`,
    line2: `${dateStr} • ${timeStr}`,
    semester,
    tahunAjaran,
    dateStr,
    timeStr,
  }
}
