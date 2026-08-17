export interface JadwalItem {
  id: number
  hari: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat"
  jamKe: string
  waktu: string
  kelas: string
  mapel: string
  kategori: "Wali Kelas 9A" | "Kelas Binaan" | "Mengajar" | "Istirahat"
  ruangan: string
  isBreak?: boolean
}

export const JADWAL_BU_DEVY: JadwalItem[] = [
  // SENIN
  { id: 1, hari: "Senin", jamKe: "1", waktu: "07.00 - 07.40", kelas: "9A", mapel: "Upacara Bendera", kategori: "Wali Kelas 9A", ruangan: "Lap. Utama" },
  { id: 2, hari: "Senin", jamKe: "2 - 3", waktu: "07.40 - 09.00", kelas: "9A", mapel: "Matematika", kategori: "Wali Kelas 9A", ruangan: "Ruang 9A" },
  { id: 3, hari: "Senin", jamKe: "4", waktu: "09.00 - 09.40", kelas: "9B", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 9B" },
  { id: 4, hari: "Senin", jamKe: "-", waktu: "09.40 - 10.10", kelas: "-", mapel: "Istirahat Pertama", kategori: "Istirahat", ruangan: "-", isBreak: true },
  { id: 5, hari: "Senin", jamKe: "5 - 6", waktu: "10.10 - 11.30", kelas: "8H", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 8H" },
  { id: 6, hari: "Senin", jamKe: "7 - 8", waktu: "11.30 - 12.50", kelas: "8I", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 8I" },

  // SELASA
  { id: 7, hari: "Selasa", jamKe: "1 - 2", waktu: "07.00 - 08.20", kelas: "9A", mapel: "Matematika (Pendalaman)", kategori: "Wali Kelas 9A", ruangan: "Ruang 9A" },
  { id: 8, hari: "Selasa", jamKe: "3 - 4", waktu: "08.20 - 09.40", kelas: "8I", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 8I" },
  { id: 9, hari: "Selasa", jamKe: "-", waktu: "09.40 - 10.10", kelas: "-", mapel: "Istirahat Pertama", kategori: "Istirahat", ruangan: "-", isBreak: true },
  { id: 10, hari: "Selasa", jamKe: "5 - 6", waktu: "10.10 - 11.30", kelas: "9B", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 9B" },

  // RABU
  { id: 11, hari: "Rabu", jamKe: "1 - 2", waktu: "07.00 - 08.20", kelas: "8H", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 8H" },
  { id: 12, hari: "Rabu", jamKe: "3 - 4", waktu: "08.20 - 09.40", kelas: "9A", mapel: "Wali Kelas & Pembimbingan", kategori: "Wali Kelas 9A", ruangan: "Ruang 9A" },
  { id: 13, hari: "Rabu", jamKe: "-", waktu: "09.40 - 10.10", kelas: "-", mapel: "Istirahat Pertama", kategori: "Istirahat", ruangan: "-", isBreak: true },
  { id: 14, hari: "Rabu", jamKe: "5 - 6", waktu: "10.10 - 11.30", kelas: "8I", mapel: "Matematika (Latihan)", kategori: "Kelas Binaan", ruangan: "Ruang 8I" },

  // KAMIS
  { id: 15, hari: "Kamis", jamKe: "1 - 2", waktu: "07.00 - 08.20", kelas: "9B", mapel: "Matematika (Ulangan harian)", kategori: "Kelas Binaan", ruangan: "Ruang 9B" },
  { id: 16, hari: "Kamis", jamKe: "3 - 4", waktu: "08.20 - 09.40", kelas: "9A", mapel: "Matematika", kategori: "Wali Kelas 9A", ruangan: "Ruang 9A" },
  { id: 17, hari: "Kamis", jamKe: "-", waktu: "09.40 - 10.10", kelas: "-", mapel: "Istirahat Pertama", kategori: "Istirahat", ruangan: "-", isBreak: true },
  { id: 18, hari: "Kamis", jamKe: "5 - 6", waktu: "10.10 - 11.30", kelas: "8H", mapel: "Matematika", kategori: "Kelas Binaan", ruangan: "Ruang 8H" },

  // JUMAT
  { id: 19, hari: "Jumat", jamKe: "1", waktu: "07.00 - 07.40", kelas: "Semua", mapel: "Senam & Jalan Sehat / Imtaq", kategori: "Wali Kelas 9A", ruangan: "Lap. Utama" },
  { id: 20, hari: "Jumat", jamKe: "2 - 3", waktu: "07.40 - 09.00", kelas: "9A", mapel: "Matematika & Evaluasi Minggu", kategori: "Wali Kelas 9A", ruangan: "Ruang 9A" },
  { id: 21, hari: "Jumat", jamKe: "4 - 5", waktu: "09.00 - 10.20", kelas: "8H", mapel: "Matematika (Pengayaan)", kategori: "Kelas Binaan", ruangan: "Ruang 8H" },
]

export interface LiburNasional {
  tanggal: string // Format "MM-DD" or "YYYY-MM-DD"
  nama: string
  kategori: "Libur Nasional" | "Cuti Bersama"
}

export const KALENDER_LIBUR_INDONESIA: LiburNasional[] = [
  { tanggal: "01-01", nama: "Tahun Baru Masehi", kategori: "Libur Nasional" },
  { tanggal: "01-27", nama: "Isra Mikraj Nabi Muhammad SAW", kategori: "Libur Nasional" },
  { tanggal: "01-29", nama: "Tahun Baru Imlek 2577 Kongzili", kategori: "Libur Nasional" },
  { tanggal: "03-20", nama: "Hari Raya Idul Fitri 1447 H", kategori: "Libur Nasional" },
  { tanggal: "03-21", nama: "Hari Raya Idul Fitri 1447 H", kategori: "Libur Nasional" },
  { tanggal: "03-22", nama: "Cuti Bersama Idul Fitri 1447 H", kategori: "Cuti Bersama" },
  { tanggal: "03-23", nama: "Cuti Bersama Idul Fitri 1447 H", kategori: "Cuti Bersama" },
  { tanggal: "03-29", nama: "Hari Raya Nyepi (Tahun Baru Saka 1948)", kategori: "Libur Nasional" },
  { tanggal: "03-31", nama: "Wafat Yesus Kristus", kategori: "Libur Nasional" },
  { tanggal: "05-01", nama: "Hari Buruh Internasional", kategori: "Libur Nasional" },
  { tanggal: "05-14", nama: "Kenaikan Yesus Kristus", kategori: "Libur Nasional" },
  { tanggal: "05-27", nama: "Hari Raya Idul Adha 1447 H", kategori: "Libur Nasional" },
  { tanggal: "05-28", nama: "Cuti Bersama Idul Adha 1447 H", kategori: "Cuti Bersama" },
  { tanggal: "06-01", nama: "Hari Lahir Pancasila", kategori: "Libur Nasional" },
  { tanggal: "06-17", nama: "Tahun Baru Islam 1448 Hijriah", kategori: "Libur Nasional" },
  { tanggal: "08-17", nama: "Hari Kemerdekaan RI (Proklamasi Kemerdekaan)", kategori: "Libur Nasional" },
  { tanggal: "08-25", nama: "Maulid Nabi Muhammad SAW", kategori: "Libur Nasional" },
  { tanggal: "12-25", nama: "Hari Raya Natal", kategori: "Libur Nasional" },
  { tanggal: "12-26", nama: "Cuti Bersama Hari Raya Natal", kategori: "Cuti Bersama" },
]

export function getLiburIndonesia(date: Date): LiburNasional | undefined {
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const mmdd = `${mm}-${dd}`
  const yyyymmdd = `${date.getFullYear()}-${mm}-${dd}`

  return KALENDER_LIBUR_INDONESIA.find(
    (h) => h.tanggal === mmdd || h.tanggal === yyyymmdd
  )
}

export interface ScheduleDayInfo {
  dayName: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat"
  isUpcoming: boolean
  holidayReason?: string
  todayHolidayReason?: string
  tomorrowHolidayReason?: string
  isTomorrowHoliday?: boolean
  statusMessage?: string
  tanggalStr?: string
}

export function getEffectiveScheduleDay(customDate?: Date): ScheduleDayInfo {
  const curr = customDate ? new Date(customDate) : new Date()
  const dayNames: ("Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat")[] = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
  ]

  const todayDay = curr.getDay() // 0 = Sun, 6 = Sat
  const todayHoliday = getLiburIndonesia(curr)
  const isTodayWeekend = todayDay === 0 || todayDay === 6

  // Check tomorrow
  const tomorrow = new Date(curr)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDay = tomorrow.getDay()
  const tomorrowHoliday = getLiburIndonesia(tomorrow)
  const isTomorrowWeekend = tomorrowDay === 0 || tomorrowDay === 6

  let todayReason = ""
  if (todayHoliday) {
    todayReason = `${todayHoliday.nama} (${todayHoliday.kategori})`
  } else if (todayDay === 6) {
    todayReason = "Hari Sabtu"
  } else if (todayDay === 0) {
    todayReason = "Hari Minggu"
  }

  let tomorrowReason = ""
  if (tomorrowHoliday) {
    tomorrowReason = `${tomorrowHoliday.nama} (${tomorrowHoliday.kategori})`
  } else if (tomorrowDay === 6) {
    tomorrowReason = "Hari Sabtu"
  } else if (tomorrowDay === 0) {
    tomorrowReason = "Hari Minggu"
  }

  const isTomorrowHoliday = isTomorrowWeekend || !!tomorrowHoliday

  if (!isTodayWeekend && !todayHoliday) {
    const dayIndex = todayDay - 1
    return {
      dayName: dayNames[dayIndex],
      isUpcoming: false,
      tomorrowHolidayReason: isTomorrowHoliday ? tomorrowReason : undefined,
      isTomorrowHoliday,
      statusMessage: isTomorrowHoliday
        ? `Hari ini KBM Aktif. Catatan: Besok Libur (${tomorrowReason}).`
        : `Hari ini KBM Aktif.`,
    }
  }

  let holidayReason = todayReason
  const nextDate = new Date(curr)
  for (let i = 1; i <= 14; i++) {
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDay = nextDate.getDay()
    const nextHoliday = getLiburIndonesia(nextDate)

    if (nextDay >= 1 && nextDay <= 5 && !nextHoliday) {
      const nextDayName = dayNames[nextDay - 1]
      const tanggalStr = nextDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })

      let statusMsg = `Hari ini Libur (${todayReason}).`
      if (isTomorrowHoliday && i > 1) {
        statusMsg += ` Besok juga Libur (${tomorrowReason}).`
      }
      statusMsg += ` Tatap Muka Mendatang: Hari ${nextDayName} (${tanggalStr}).`

      return {
        dayName: nextDayName,
        isUpcoming: true,
        holidayReason,
        todayHolidayReason: todayReason,
        tomorrowHolidayReason: isTomorrowHoliday ? tomorrowReason : undefined,
        isTomorrowHoliday,
        statusMessage: statusMsg,
        tanggalStr,
      }
    }
  }

  return { dayName: "Senin", isUpcoming: true, holidayReason }
}

export function getTeachingSessionsForDay(dayName: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat") {
  return JADWAL_BU_DEVY.filter((item) => item.hari === dayName && !item.isBreak)
}

export function getTodayDayName(): "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" {
  return getEffectiveScheduleDay().dayName
}

export function getTodayScheduleSummary() {
  const info = getEffectiveScheduleDay()
  let scheduleList = JADWAL_BU_DEVY

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("saguru_jadwal_list")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          scheduleList = parsed
        }
      }
    } catch (err) {}
  }

  const activeSessions = scheduleList.filter(
    (item) => item.hari === info.dayName && !item.isBreak
  )
  const firstSession = activeSessions.find((s) => s.kelas !== "Semua") || activeSessions[0]
  const uniqueRuangan = Array.from(
    new Set(activeSessions.map((s) => s.ruangan).filter((r) => r && r !== "-"))
  )

  const formatRoom = (r?: string) => {
    if (!r || r === "-") return "Gedung Utama Lt. 2 - R. 9A"
    if (r.startsWith("Ruang ")) return `Gedung Utama Lt. 2 - R. ${r.replace("Ruang ", "")}`
    return `Gedung Utama Lt. 2 - ${r}`
  }

  return {
    dayName: info.dayName,
    isUpcoming: info.isUpcoming,
    holidayReason: info.holidayReason,
    todayHolidayReason: info.todayHolidayReason,
    tomorrowHolidayReason: info.tomorrowHolidayReason,
    isTomorrowHoliday: info.isTomorrowHoliday,
    statusMessage: info.statusMessage,
    sessionsCount: activeSessions.length,
    ruanganSummary: uniqueRuangan.length > 0 ? uniqueRuangan.join(" • ") : "Ruang 9A • Ruang 9B",
    ruanganFormatted: uniqueRuangan.length > 0 ? uniqueRuangan.join(" & ") : "Ruang 9A & 9B",
    firstSessionText: firstSession
      ? `Jam ke ${firstSession.jamKe} (${firstSession.mapel.replace(" (Pendalaman)", "").replace(" & Evaluasi Minggu", "")} ${firstSession.kelas})`
      : "Jam ke 2-3 (Matematika 9A)",
    firstSessionRoom: firstSession ? formatRoom(firstSession.ruangan) : "Gedung Utama Lt. 2 - R. 9A",
  }
}



