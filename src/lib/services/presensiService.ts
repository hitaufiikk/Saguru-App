import { schoolDate } from "@/lib/school-date"
import { supabase } from "@/lib/supabase"

export interface PresensiRecord {
  id?: string
  nisn: string
  kelas_code: string
  status: string
  alasan_dispen?: string
  tanggal_presensi?: string
}

export const presensiService = {
  // Fetch presensi for a class on a specific date (defaults to today)
  async getPresensiByClass(kelasCode: string, tanggal = schoolDate(), client = supabase): Promise<Record<string, { status: string; alasanDispen: string }>> {
    const { data, error } = await client.from("presensi")
      .select("nisn, status, alasan_dispen")
      .eq("kelas_code", kelasCode.toLowerCase()).eq("tanggal_presensi", tanggal)
    if (error) throw error
    const map: Record<string, { status: string; alasanDispen: string }> = {}
    for (const row of data || []) map[row.nisn] = {
      status: row.status || "BELUM_DICATAT", alasanDispen: row.alasan_dispen || "",
    }
    return map
  },

  // Save/Upsert attendance status for a student
  async updateAttendance(
    nisn: string,
    kelasCode: string,
    status: string,
    alasanDispen?: string,
    tanggal?: string,
    client = supabase
  ): Promise<boolean> {
    try {
      const targetDate = tanggal || schoolDate()

      // Attendance must never create or overwrite the master student record.
      const { data: student, error: studentError } = await client.from("students")
        .select("nisn").eq("nisn", nisn).eq("kelas_code", kelasCode.toLowerCase()).maybeSingle()
      if (studentError || !student) return false

      // 2. Upsert presensi record
      const { error } = await client.from("presensi").upsert(
        [
          {
            nisn,
            kelas_code: kelasCode.toLowerCase(),
            status,
            alasan_dispen: status === "DISPEN" ? (alasanDispen || "").trim() : "",
            tanggal_presensi: targetDate,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "nisn,tanggal_presensi" }
      )

      if (error) {
        console.warn("Supabase presensi warning:", error.message)
      }
      return !error
    } catch {
      return false
    }
  },

  // Exclude / Hide NISN in Presensi (Presensi Soft Delete)
  async addPresensiExclusion(nisn: string, kelasCode: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("exclusions").upsert(
        [
          {
            nisn,
            kelas_code: kelasCode.toLowerCase(),
            menu_type: "presensi",
          },
        ],
        { onConflict: "nisn,kelas_code,menu_type" }
      )
      return !error
    } catch (err) {
      return false
    }
  },

  // Fetch excluded NISNs in Presensi
  async getPresensiExclusions(kelasCode: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("exclusions")
        .select("nisn")
        .eq("kelas_code", kelasCode.toLowerCase())
        .eq("menu_type", "presensi")

      if (error) return []
      return (data || []).map((row) => row.nisn)
    } catch (err) {
      return []
    }
  },

  // Fetch monthly presensi records for a class (e.g. year=2026, month=8 for August)
  async getMonthlyPresensiByClass(
    kelasCode: string,
    year: number,
    month: number,
    client = supabase
  ): Promise<Record<string, Record<number, { status: string; alasanDispen: string }>>> {
    try {
      const mm = String(month).padStart(2, "0")
      const daysInMonth = new Date(year, month, 0).getDate()
      const startDate = `${year}-${mm}-01`
      const endDate = `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`

      const { data, error } = await client
        .from("presensi")
        .select("nisn, tanggal_presensi, status, alasan_dispen")
        .eq("kelas_code", kelasCode.toLowerCase())
        .gte("tanggal_presensi", startDate)
        .lte("tanggal_presensi", endDate)

      if (error || !data) return {}

      const monthlyMap: Record<string, Record<number, { status: string; alasanDispen: string }>> = {}

      data.forEach((row) => {
        if (!row.nisn || !row.tanggal_presensi) return
        const parts = row.tanggal_presensi.split("-")
        if (parts.length === 3) {
          const dayNum = parseInt(parts[2], 10)
          if (!monthlyMap[row.nisn]) {
            monthlyMap[row.nisn] = {}
          }
          monthlyMap[row.nisn][dayNum] = {
            status: row.status ? row.status : "BELUM_DICATAT",
            alasanDispen: row.alasan_dispen || "",
          }
        }
      })

      return monthlyMap
    } catch {
      return {}
    }
  },

  // Reset attendance records for a class on a specific date (or optionally across all classes)
  async resetPresensi(
    kelasCode: string,
    tanggal: string,
    resetAllClasses = false,
    client = supabase
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      if (!tanggal) {
        return { success: false, error: "Tanggal presensi tidak valid." }
      }

      let query = client.from("presensi").delete({ count: "exact" }).eq("tanggal_presensi", tanggal)

      if (!resetAllClasses) {
        const targetKelas = (kelasCode || "").toLowerCase().trim()
        if (!targetKelas) {
          return { success: false, error: "Kode kelas target tidak valid." }
        }
        query = query.eq("kelas_code", targetKelas)
      }

      const { count, error } = await query

      if (error) {
        console.error("Supabase reset presensi error:", error.message)
        return { success: false, error: `Gagal mereset presensi: ${error.message}` }
      }

      return { success: true, count: count ?? 0 }
    } catch (err) {
      console.error("Kesalahan tak terduga saat reset presensi:", err)
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Terjadi kesalahan: ${message}` }
    }
  },
}
