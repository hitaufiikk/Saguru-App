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
  async getPresensiByClass(kelasCode: string, tanggal?: string): Promise<Record<string, { status: string; alasanDispen: string }>> {
    try {
      const targetDate = tanggal || new Date().toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("presensi")
        .select("nisn, status, alasan_dispen")
        .eq("kelas_code", kelasCode.toLowerCase())
        .eq("tanggal_presensi", targetDate)

      if (error) {
        console.warn("Supabase fetch presensi warning:", error.message)
        return {}
      }

      const map: Record<string, { status: string; alasanDispen: string }> = {}
      ;(data || []).forEach((row) => {
        map[row.nisn] = {
          status: row.status || "HADIR",
          alasanDispen: row.alasan_dispen || "",
        }
      })
      return map
    } catch (err) {
      return {}
    }
  },

  // Save/Upsert attendance status for a student
  async updateAttendance(
    nisn: string,
    kelasCode: string,
    status: string,
    alasanDispen?: string,
    tanggal?: string,
    namaSiswa?: string
  ): Promise<boolean> {
    try {
      const targetDate = tanggal || new Date().toISOString().split("T")[0]

      // 1. Ensure student exists in `students` table to satisfy Foreign Key Constraint
      try {
        await supabase.from("students").upsert(
          [
            {
              nisn,
              nama: namaSiswa || `Siswa ${nisn}`,
              gender: "Laki-laki",
              kelas_code: kelasCode.toLowerCase(),
              wali_kelas: kelasCode.toLowerCase() === "9a" ? "Devy, S.Pd." : "-",
            },
          ],
          { onConflict: "nisn" }
        )
      } catch (e) {}

      // 2. Upsert presensi record
      const { error } = await supabase.from("presensi").upsert(
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
      return true
    } catch (err) {
      return true
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
}
