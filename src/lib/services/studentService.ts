import { supabase } from "@/lib/supabase"
import { validateStudentsForSave } from "@/lib/import-utils"

export interface StudentRecord {
  id?: string
  noAbs?: number
  nisn: string
  nama: string
  gender: string
  kelas_code?: string
  wali_kelas?: string
  kontak_ortu?: string
  status?: string
  created_at?: string
}

export const studentService = {
  // Fetch students for a specific class
  async getStudentsByClass(kelasCode: string): Promise<StudentRecord[]> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("kelas_code", kelasCode.toLowerCase())
        .order("nama", { ascending: true })

      if (error) {
        console.warn("Supabase fetch students warning:", error.message)
        return []
      }

      return (data || []).map((s, index) => ({
        id: s.id,
        noAbs: index + 1,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender || "Laki-laki",
        kelas_code: s.kelas_code,
        wali_kelas: s.wali_kelas || "-",
        status: "HADIR",
      }))
    } catch (err) {
      console.error("Error in getStudentsByClass:", err)
      return []
    }
  },

  // Fetch all students across all classes
  async getAllStudents(): Promise<StudentRecord[]> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("nama", { ascending: true })

      if (error) return []

      return (data || []).map((s, index) => ({
        id: s.id,
        noAbs: index + 1,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender || "Laki-laki",
        kelas_code: s.kelas_code,
        wali_kelas: s.wali_kelas || "-",
        status: "HADIR",
      }))
    } catch (err) {
      return []
    }
  },

  // Batch insert/upsert migrated students from Excel/PDF
  async saveMigratedStudents(
    students: StudentRecord[],
    kelasCode: string,
    waliKelas: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // 1. Validasi identitas sebelum data dikirim ke Supabase
      // Baris dengan identitas kosong, spasi, atau duplikat disaring
      const validation = validateStudentsForSave(students as any)
      if (validation.validStudents.length === 0) {
        console.warn("saveMigratedStudents: Tidak ada siswa dengan identitas valid untuk disimpan.")
        return {
          success: false,
          count: 0,
          error: "Tidak ada siswa dengan identitas valid untuk disimpan (identitas kosong atau duplikat).",
        }
      }

      // 2. Format payload: HANYA kolom resmi tabel Supabase 'students'
      // Properti 'nis' dan 'identityType' TIDAK disertakan dalam payload Supabase
      const formatted = validation.validStudents.map((s) => ({
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender,
        kelas_code: kelasCode.toLowerCase(),
        wali_kelas: waliKelas,
      }))

      const { error } = await supabase
        .from("students")
        .upsert(formatted, { onConflict: "nisn" })

      if (error) {
        console.error("Supabase batch upsert error:", error.message)
        return { success: false, count: 0, error: error.message }
      }
      return { success: true, count: formatted.length }
    } catch (err: any) {
      console.error("Error in saveMigratedStudents:", err)
      return {
        success: false,
        count: 0,
        error: err?.message || "Terjadi kesalahan saat menyimpan data migrasi.",
      }
    }
  },

  // Add single student
  async addStudent(student: StudentRecord): Promise<boolean> {
    try {
      const { error } = await supabase.from("students").insert([
        {
          nisn: student.nisn,
          nama: student.nama,
          gender: student.gender,
          kelas_code: (student.kelas_code || "9a").toLowerCase(),
          wali_kelas: student.wali_kelas || "-",
        },
      ])
      return !error
    } catch (err) {
      return false
    }
  },

  // Update student details
  async updateStudent(nisn: string, updates: Partial<StudentRecord>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          nama: updates.nama,
          gender: updates.gender,
          nisn: updates.nisn,
        })
        .eq("nisn", nisn)

      return !error
    } catch (err) {
      return false
    }
  },

  // Delete student from Master Data
  async deleteStudent(nisn: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("students").delete().eq("nisn", nisn)
      return !error
    } catch (err) {
      return false
    }
  },
}
